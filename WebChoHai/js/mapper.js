/* ==========================================================
   MAPPER.JS
   Tìm vị trí dòng và cột trong file đích
========================================================== */

class PositionMapper {

    constructor(config = CONFIG, logger = null) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Lấy giá trị chữ từ một ô Excel
     * Hỗ trợ:
     * - chuỗi thường
     * - công thức
     * - rich text
     */
    extractCellText(cell) {
        if (!cell || cell.value === null || cell.value === undefined) {
            return "";
        }

        let value = cell.value;

        if (typeof value === "object") {
            // Công thức: { formula, result }
            if (value.result !== undefined) {
                value = value.result;
            }

            // Rich text: { richText: [...] }
            else if (value.richText && Array.isArray(value.richText)) {
                value = value.richText
                    .map(part => part.text || "")
                    .join("");
            }

            // Text object: { text }
            else if (value.text !== undefined) {
                value = value.text;
            }

            // Hyperlink: { text, hyperlink }
            else if (value.hyperlink !== undefined) {
                value = value.text || value.hyperlink;
            }

            else {
                value = "";
            }
        }

        return Helpers.normalizeText(value);
    }

    /**
     * Xây dựng rowMap:
     * Base -> dòng trong file đích
     *
     * Ví dụ:
     * TL6203 -> dòng 5
     */
    buildRowMap(worksheet) {
        const rowMap = new Map();

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            for (const columnIndex of this.config.ROW_SEARCH_COLUMNS) {
                const cell = row.getCell(columnIndex);
                const value = this.extractCellText(cell);

                if (!value) {
                    continue;
                }

                // Chỉ nhận giá trị có độ dài tối thiểu và alphanumeric
                if (value.length < this.config.MIN_BASE_LENGTH) {
                    continue;
                }

                if (!Validators.isAlphanumeric(value)) {
                    continue;
                }

                // Không ghi đè vị trí đã tìm thấy trước đó
                if (!rowMap.has(value)) {
                    rowMap.set(value, rowNumber);
                }
            }
        });

        return rowMap;
    }

    /**
     * Xây dựng columnMaps:
     *
     * exactMap:
     * A1 -> cột 5
     * E2 -> cột 12
     *
     * letterFamilyMap:
     * A -> { firstColumn: 4, headers: ["A1", "A2", "A3"] }
     */
    buildColumnMaps(worksheet) {
        const exactMap = new Map();
        const letterFamilyMap = new Map();

        const maxScanRow = Math.min(
            this.config.MAX_SCAN_HEADER_ROWS,
            worksheet.rowCount || this.config.MAX_SCAN_HEADER_ROWS
        );

        for (let rowNumber = 1; rowNumber <= maxScanRow; rowNumber++) {
            const row = worksheet.getRow(rowNumber);

            row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
                const value = this.extractCellText(cell);

                if (!value) {
                    return;
                }

                /*
                 * Trường hợp 1:
                 * Header dạng A1, A2, B1, E2...
                 */
                const letterNumberMatch = value.match(this.config.PATTERNS.letterThenNumber);

                if (letterNumberMatch) {
                    const letter = letterNumberMatch[1].toUpperCase();

                    if (!exactMap.has(value)) {
                        exactMap.set(value, columnNumber);
                    }

                    if (!letterFamilyMap.has(letter)) {
                        letterFamilyMap.set(letter, {
                            firstColumn: columnNumber,
                            headers: []
                        });
                    }

                    const family = letterFamilyMap.get(letter);

                    family.headers.push({
                        header: value,
                        column: columnNumber,
                        row: rowNumber
                    });

                    return;
                }

                /*
                 * Trường hợp 2:
                 * Header chỉ là chữ cái A, B, C...
                 */
                const singleLetterMatch = value.match(this.config.PATTERNS.singleLetter);

                if (singleLetterMatch) {
                    const letter = singleLetterMatch[1].toUpperCase();

                    if (!exactMap.has(value)) {
                        exactMap.set(value, columnNumber);
                    }

                    if (!letterFamilyMap.has(letter)) {
                        letterFamilyMap.set(letter, {
                            firstColumn: columnNumber,
                            headers: []
                        });
                    }

                    const family = letterFamilyMap.get(letter);

                    family.headers.push({
                        header: value,
                        column: columnNumber,
                        row: rowNumber
                    });
                }
            });
        }

        return {
            exactMap: exactMap,
            letterFamilyMap: letterFamilyMap
        };
    }

    /**
     * Tìm dòng theo Base
     */
    findRowPosition(base, rowMap) {
        const normalizedBase = Helpers.normalizeText(base);

        if (!normalizedBase) {
            return null;
        }

        return rowMap.get(normalizedBase) || null;
    }

    /**
     * Tìm cột theo item đã parse
     */
    findColumnPosition(item, columnMaps) {
        const { exactMap, letterFamilyMap } = columnMaps;

        const targetColumn = Helpers.normalizeText(
            item.targetColumn || item.col || ""
        );

        const rawSuffix = Helpers.normalizeText(item.rawSuffix || "");
        const columnLetter = Helpers.normalizeText(item.columnLetter || "");

        if (!targetColumn) {
            return null;
        }

        /*
         * Bước 1:
         * Tìm chính xác targetColumn
         *
         * Ví dụ:
         * E2, A1, B3, A
         */
        if (exactMap.has(targetColumn)) {
            return {
                column: exactMap.get(targetColumn),
                matchedHeader: targetColumn,
                strategy: "exact",
                warning: null
            };
        }

        /*
         * Bước 2:
         * Nếu targetColumn khác rawSuffix thì thử luôn rawSuffix
         *
         * Ví dụ:
         * targetColumn = E2
         * rawSuffix = 2E
         * Nếu file đích lỡ có 2E thì vẫn khớp
         */
        if (rawSuffix && rawSuffix !== targetColumn && exactMap.has(rawSuffix)) {
            return {
                column: exactMap.get(rawSuffix),
                matchedHeader: rawSuffix,
                strategy: "raw-suffix",
                warning: null
            };
        }

        /*
         * Bước 3:
         * Nếu targetColumn có 2 ký tự, thử đảo ngược
         *
         * Ví dụ:
         * targetColumn = 2E -> thử E2
         * targetColumn = E2 -> thử 2E
         */
        if (targetColumn.length === 2 && this.config.COLUMN_RULES.reverseDigitLetter) {
            const reversed = targetColumn.charAt(1) + targetColumn.charAt(0);

            if (exactMap.has(reversed)) {
                return {
                    column: exactMap.get(reversed),
                    matchedHeader: reversed,
                    strategy: "reversed",
                    warning: null
                };
            }
        }

        /*
         * Bước 4:
         * Nếu là dạng chữ cái đơn lẻ như A, B, C
         * hoặc dạng 0A, 0B, 0C đã chuẩn hóa thành A, B, C
         *
         * Nếu file đích không có header A,
         * nhưng có A1, A2, A3 thì chọn cột đầu tiên của nhóm A.
         */
        const isLetterMode =
            item.columnSearchMode === "letter" ||
            this.config.PATTERNS.singleLetter.test(targetColumn);

        if (isLetterMode && this.config.COLUMN_RULES.allowLetterFamilyMatch) {
            const searchLetter = columnLetter || targetColumn;

            if (letterFamilyMap.has(searchLetter)) {
                const family = letterFamilyMap.get(searchLetter);

                if (family.firstColumn) {
                    const firstHeader = family.headers.length > 0
                        ? family.headers[0].header
                        : searchLetter;

                    return {
                        column: family.firstColumn,
                        matchedHeader: firstHeader,
                        strategy: "letter-family",
                        warning: `Không tìm thấy cột "${searchLetter}" chính xác. Hệ thống dùng cột đầu tiên của nhóm "${searchLetter}" là "${firstHeader}".`
                    };
                }
            }
        }

        /*
         * Bước 5:
         * Nếu vẫn không tìm thấy
         */
        return null;
    }
}