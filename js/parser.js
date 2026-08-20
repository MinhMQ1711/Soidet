/* ==========================================================
   PARSER.JS
   Phân tích mã sản phẩm từ file nguồn
========================================================== */

class ProductCodeParser {

    constructor(config = CONFIG, logger = null) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Phân tích một mã sản phẩm
     *
     * Ví dụ:
     * TL6203002E
     * -> base: TL6203
     * -> rawSuffix: 2E
     * -> targetColumn: E2
     *
     * TL6203000A
     * -> base: TL6203
     * -> rawSuffix: 0A
     * -> targetColumn: A
     */
    parse(rawCode) {
        if (Helpers.isEmpty(rawCode)) {
            return null;
        }

        let original = String(rawCode).trim();
        let code = original;

        /*
         * 1. Nếu có dấu chấm thì bỏ qua
         * Ví dụ bỏ qua: VG6133.5D
         */
        if (this.config.COLUMN_RULES.skipDot && code.includes(".")) {
            return null;
        }

        /*
         * 2. Nếu có ngoặc thì lấy phần trước ngoặc
         * Ví dụ: VK5B08 (TA5B06) -> VK5B08
         */
        if (this.config.COLUMN_RULES.skipParentheses && code.includes("(")) {
            code = code.split("(")[0].trim();

            // Sau khi cắt ngoặc, nếu xuất hiện dấu chấm thì vẫn bỏ qua
            if (this.config.COLUMN_RULES.skipDot && code.includes(".")) {
                return null;
            }
        }

        /*
         * 3. Làm sạch chuỗi:
         * - bỏ khoảng trắng
         * - uppercase
         */
        code = code.replace(/\s+/g, "").toUpperCase();

        /*
         * 4. Kiểm tra độ dài tối thiểu
         * Cần ít nhất 8 ký tự:
         * 6 ký tự Base + 2 ký tự đuôi
         */
        if (code.length < this.config.MIN_CODE_LENGTH) {
            return null;
        }

        /*
         * 5. Cắt Base và đuôi
         */
        const base = code.substring(0, this.config.BASE_LENGTH);
        const rawSuffix = code.substring(code.length - 2);

        /*
         * 6. Kiểm tra hợp lệ
         */
        if (!Validators.isValidBase(base)) {
            return null;
        }

        if (!Validators.isValidColumnToken(rawSuffix)) {
            return null;
        }

        /*
         * 7. Chuẩn hóa cột đích
         */
        const columnInfo = this.normalizeColumn(rawSuffix);

        if (!columnInfo) {
            return null;
        }

        return {
            original: original,
            cleanedCode: code,
            base: base,
            rawSuffix: rawSuffix,
            ...columnInfo
        };
    }

    /**
     * Chuẩn hóa đuôi mã sản phẩm thành tên cột cần tìm trong file đích
     */
    normalizeColumn(rawSuffix) {
        const suffix = Helpers.normalizeText(rawSuffix);

        if (!suffix) {
            return null;
        }

        /*
         * Trường hợp 1: 0A, 0B, 0C...
         * Yêu cầu: điền vào cột A, B, C
         * Không cần file đích có A0, B0, C0
         */
        const zeroLetterMatch = suffix.match(this.config.PATTERNS.zeroLetter);

        if (zeroLetterMatch && this.config.COLUMN_RULES.zeroPrefixLetterToLetter) {
            const letter = zeroLetterMatch[1].toUpperCase();

            return {
                suffixType: "zero-letter",
                targetColumn: letter,
                displayColumn: letter,
                columnLetter: letter,
                columnNumber: null,
                columnSearchMode: "letter"
            };
        }

        /*
         * Trường hợp 2: 2E, 3B, 12C...
         * File đích không có 2E mà có E2
         * Nên ta đảo ngược thành E2
         */
        const numberLetterMatch = suffix.match(this.config.PATTERNS.numberThenLetter);

        if (numberLetterMatch && this.config.COLUMN_RULES.reverseDigitLetter) {
            const numberPart = numberLetterMatch[1];
            const letterPart = numberLetterMatch[2].toUpperCase();

            // Nếu là 0A, 0B... thì đã xử lý ở trên
            // Nhưng vẫn phòng trường hợp regex chạy trước
            if (numberPart === "0") {
                return {
                    suffixType: "zero-letter",
                    targetColumn: letterPart,
                    displayColumn: letterPart,
                    columnLetter: letterPart,
                    columnNumber: null,
                    columnSearchMode: "letter"
                };
            }

            const targetColumn = `${letterPart}${numberPart}`;

            return {
                suffixType: "digit-letter",
                targetColumn: targetColumn,
                displayColumn: targetColumn,
                columnLetter: letterPart,
                columnNumber: numberPart,
                columnSearchMode: "exact"
            };
        }

        /*
         * Trường hợp 3: A1, A2, B3...
         * Nếu đuôi đã có dạng chữ + số thì giữ nguyên
         */
        const letterNumberMatch = suffix.match(this.config.PATTERNS.letterThenNumber);

        if (letterNumberMatch) {
            const letterPart = letterNumberMatch[1].toUpperCase();
            const numberPart = letterNumberMatch[2];
            const targetColumn = `${letterPart}${numberPart}`;

            return {
                suffixType: "letter-digit",
                targetColumn: targetColumn,
                displayColumn: targetColumn,
                columnLetter: letterPart,
                columnNumber: numberPart,
                columnSearchMode: "exact"
            };
        }

        /*
         * Trường hợp 4: các đuôi khác
         * Cứ để nguyên và thử tìm trực tiếp trong file đích
         */
        if (Validators.isValidColumnToken(suffix)) {
            return {
                suffixType: "other",
                targetColumn: suffix,
                displayColumn: suffix,
                columnLetter: suffix.length === 1 ? suffix : null,
                columnNumber: null,
                columnSearchMode: "auto"
            };
        }

        return null;
    }

    /**
     * Làm sạch số lượng từ cột C
     */
    cleanQuantity(rawQty) {
        if (Helpers.isEmpty(rawQty)) {
            return 0;
        }

        let str = String(rawQty)
            .replace(/,/g, "")
            .replace(/\s/g, "");

        if (str === "-0" || str === "-" || str === "") {
            return 0;
        }

        const num = parseFloat(str);

        if (isNaN(num)) {
            return 0;
        }

        return num;
    }

    /**
     * Kiểm tra dòng tiêu đề
     */
    isHeaderRow(cellValue) {
        return Validators.isHeaderRow(cellValue);
    }

    /**
     * Cộng dồn dữ liệu theo Base + cột đích
     */
    aggregate(rawRecords) {
        const dataMap = new Map();
        let mergedCount = 0;

        rawRecords.forEach(record => {
            const key = `${record.base}|${record.targetColumn}`;

            if (dataMap.has(key)) {
                const existing = dataMap.get(key);

                existing.qty += record.qty;
                existing.count += 1;

                if (!existing.originals.includes(record.original)) {
                    existing.originals.push(record.original);
                }

                if (!existing.rawSuffixes.includes(record.rawSuffix)) {
                    existing.rawSuffixes.push(record.rawSuffix);
                }

                mergedCount++;
            } else {
                dataMap.set(key, {
                    key: key,
                    base: record.base,
                    col: record.targetColumn,
                    targetColumn: record.targetColumn,
                    displayColumn: record.displayColumn || record.targetColumn,
                    rawSuffix: record.rawSuffix,
                    suffixType: record.suffixType,
                    columnLetter: record.columnLetter,
                    columnNumber: record.columnNumber,
                    columnSearchMode: record.columnSearchMode,
                    qty: record.qty,
                    count: 1,
                    originals: [record.original],
                    rawSuffixes: [record.rawSuffix],
                    status: "ok"
                });
            }
        });

        const finalData = Array.from(dataMap.values());

        finalData.sort((a, b) => {
            return a.base.localeCompare(b.base) || a.targetColumn.localeCompare(b.targetColumn);
        });

        const totalQty = finalData.reduce((sum, item) => sum + item.qty, 0);

        return {
            finalData: finalData,
            mergedCount: mergedCount,
            totalQty: totalQty
        };
    }
}