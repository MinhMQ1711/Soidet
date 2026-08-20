/* ==========================================================
   PROCESSOR.JS
   Xử lý điền dữ liệu vào file đích
========================================================== */

class DataProcessor {

    constructor(parser, mapper, logger = null) {
        this.parser = parser;
        this.mapper = mapper;
        this.logger = logger;
    }

    /**
     * Xử lý chính:
     * - Load file đích từ ArrayBuffer
     * - Duyệt từng sheet được chọn
     * - Tìm dòng theo Base
     * - Tìm cột theo cột đã chuẩn hóa
     * - Gán số lượng vào ô
     */
    async process({
        targetArrayBuffer,
        finalData,
        selectedSheets,
        onProgress = null
    }) {
        if (!targetArrayBuffer) {
            throw new Error("Chưa có File Đích.");
        }

        if (!Array.isArray(finalData) || finalData.length === 0) {
            throw new Error("Chưa có dữ liệu để điền.");
        }

        if (!Array.isArray(selectedSheets) || selectedSheets.length === 0) {
            throw new Error("Chưa chọn sheet đích.");
        }

        // Tạo workbook mới từ file đích gốc
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(targetArrayBuffer);

        const stats = {
            uniqueItems: finalData.length,
            sheetCount: selectedSheets.length,
            total: finalData.length * selectedSheets.length,
            success: 0,
            notFound: 0,
            filledCells: 0,
            sheetsProcessed: 0
        };

        // Dùng Map để gom các lỗi không tìm thấy
        const discrepancyMap = new Map();

        for (let i = 0; i < selectedSheets.length; i++) {
            const sheetName = selectedSheets[i];

            if (this.logger) {
                this.logger.process(`📄 Đang xử lý sheet: ${sheetName}`, "info");
            }

            const worksheet = workbook.getWorksheet(sheetName);

            if (!worksheet) {
                if (this.logger) {
                    this.logger.process(`⚠️ Không tìm thấy sheet: ${sheetName}`, "warning");
                }
                continue;
            }

            // Xây dựng bản đồ dòng và cột
            const rowMap = this.mapper.buildRowMap(worksheet);
            const columnMaps = this.mapper.buildColumnMaps(worksheet);

            if (this.logger) {
                this.logger.process(
                    `   → Tìm thấy ${rowMap.size} Base trong cột A/B/C`,
                    "debug"
                );

                this.logger.process(
                    `   → Tìm thấy ${columnMaps.exactMap.size} header cột`,
                    "debug"
                );
            }

            let sheetSuccess = 0;
            let sheetNotFound = 0;

            for (const item of finalData) {
                // Tìm dòng theo Base
                const rowPosition = this.mapper.findRowPosition(item.base, rowMap);

                // Tìm cột theo targetColumn
                const columnMatch = this.mapper.findColumnPosition(item, columnMaps);

                if (rowPosition && columnMatch && columnMatch.column) {
                    // Lấy ô đích
                    const cell = worksheet.getCell(rowPosition, columnMatch.column);

                    // Chỉ gán giá trị, ExcelJS giữ nguyên style gốc
                    cell.value = item.qty;

                    sheetSuccess++;
                    stats.success++;
                    stats.filledCells++;

                    // Nếu có cảnh báo fallback cột
                    if (columnMatch.warning && this.logger) {
                        this.logger.process(
                            `   ⚠️ ${item.base} → ${item.targetColumn}: ${columnMatch.warning}`,
                            "warning"
                        );
                    }
                } else {
                    sheetNotFound++;
                    stats.notFound++;

                    const reasonParts = [];

                    if (!rowPosition) {
                        reasonParts.push(
                            `Không tìm thấy Base "${item.base}" trong cột A/B/C`
                        );
                    }

                    if (!columnMatch || !columnMatch.column) {
                        reasonParts.push(
                            `Không tìm thấy cột "${item.targetColumn}" (đuôi gốc "${item.rawSuffix}") trong header`
                        );
                    }

                    const reason = reasonParts.join("; ");

                    this.addDiscrepancy(
                        discrepancyMap,
                        item,
                        sheetName,
                        reason
                    );
                }
            }

            stats.sheetsProcessed++;

            if (this.logger) {
                this.logger.process(
                    `   ✅ Sheet "${sheetName}": điền ${sheetSuccess} ô, ${sheetNotFound} ô không khớp`,
                    sheetSuccess > 0 ? "success" : "warning"
                );
            }

            if (onProgress) {
                const percent = Math.round(((i + 1) / selectedSheets.length) * 100);
                onProgress(percent, `Đã xử lý sheet ${sheetName}`);
            }

            // Nhường UI một chút
            await Helpers.sleep(10);
        }

        const discrepancies = this.finalizeDiscrepancies(
            discrepancyMap,
            selectedSheets.length
        );

        if (this.logger) {
            this.logger.process(
                `🎉 Hoàn tất xử lý: ${stats.success} ô đã điền, ${stats.notFound} ô không khớp.`,
                "success"
            );
        }

        return {
            workbook: workbook,
            stats: stats,
            discrepancies: discrepancies
        };
    }

    /**
     * Thêm một mục không khớp vào Map
     */
    addDiscrepancy(discrepancyMap, item, sheetName, reason) {
        const key = item.key || `${item.base}|${item.targetColumn}`;

        if (!discrepancyMap.has(key)) {
            discrepancyMap.set(key, {
                item: item,
                missingSheets: [sheetName],
                reasons: [reason]
            });
        } else {
            const entry = discrepancyMap.get(key);

            if (!entry.missingSheets.includes(sheetName)) {
                entry.missingSheets.push(sheetName);
            }

            if (!entry.reasons.includes(reason)) {
                entry.reasons.push(reason);
            }
        }
    }

    /**
     * Tổng hợp danh sách không khớp
     */
    finalizeDiscrepancies(discrepancyMap, totalSelectedSheets) {
        const result = [];

        discrepancyMap.forEach(entry => {
            const {
                item,
                missingSheets,
                reasons
            } = entry;

            let reasonText = reasons.join(" | ");

            if (totalSelectedSheets > 1) {
                if (missingSheets.length === totalSelectedSheets) {
                    reasonText = `Không tìm thấy trong tất cả ${totalSelectedSheets} sheet. ${reasonText}`;
                } else {
                    reasonText = `Không tìm thấy trong ${missingSheets.length}/${totalSelectedSheets} sheet. ${reasonText}`;
                }
            }

            result.push({
                ...item,
                missingSheets: missingSheets,
                reason: reasonText,
                status: "warn"
            });
        });

        result.sort((a, b) => {
            return a.base.localeCompare(b.base) || a.targetColumn.localeCompare(b.targetColumn);
        });

        return result;
    }
}s