/* ==========================================================
   EXPORTER.JS
   Xuất file Excel đã xử lý
========================================================== */

class FileExporter {

    constructor(logger = null) {
        this.logger = logger;
    }

    /**
     * Xuất workbook đã điền dữ liệu
     */
    async export(workbook, stats = {}) {
        if (!workbook) {
            throw new Error("Chưa có workbook để xuất.");
        }

        if (this.logger) {
            this.logger.export("📦 Đang tạo file xuất...", "info");
        }

        try {
            // Ghi workbook ra ArrayBuffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Tạo Blob Excel
            const blob = Helpers.createExcelBlob(buffer);

            // Tạo tên file
            const filename = Helpers.generateExportFileName();

            // Tải xuống
            Helpers.downloadBlob(blob, filename);

            if (this.logger) {
                this.logger.export(
                    `✅ Đã tải xuống file: ${filename}`,
                    "success"
                );

                this.logger.export(
                    `✅ Tổng ô đã điền: ${Helpers.formatNumber(stats.filledCells || 0)}`,
                    "success"
                );

                this.logger.export(
                    `✅ Sheet đã xử lý: ${Helpers.formatNumber(stats.sheetsProcessed || 0)}`,
                    "success"
                );
            }

            return {
                success: true,
                filename: filename,
                filledCells: stats.filledCells || 0,
                sheetsProcessed: stats.sheetsProcessed || 0
            };
        } catch (error) {
            if (this.logger) {
                this.logger.export(`❌ Lỗi xuất file: ${error.message}`, "error");
            }

            throw error;
        }
    }
}