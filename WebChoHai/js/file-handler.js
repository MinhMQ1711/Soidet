/* ==========================================================
   FILE-HANDLER.JS
   Xử lý đọc file nguồn và file đích
========================================================== */

class FileHandler {

    constructor(logger = null) {
        this.logger = logger;

        // File nguồn BB25, đọc bằng SheetJS
        this.sourceWorkbook = null;
        this.sourceFileName = "";

        // File đích, đọc bằng ExcelJS để giữ định dạng
        this.targetWorkbook = null;
        this.targetArrayBuffer = null;
        this.targetFileName = "";
    }

    /**
     * Reset trạng thái file
     */
    reset() {
        this.sourceWorkbook = null;
        this.sourceFileName = "";

        this.targetWorkbook = null;
        this.targetArrayBuffer = null;
        this.targetFileName = "";
    }

    /**
     * Kiểm tra đã có đủ cả 2 file chưa
     */
    hasBothFiles() {
        return !!this.sourceWorkbook && !!this.targetWorkbook && !!this.targetArrayBuffer;
    }

    /**
     * Đọc file nguồn bằng SheetJS
     */
    async readSourceWorkbook(file) {
        if (!file) {
            throw new Error("Không tìm thấy file nguồn.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const workbook = XLSX.read(uint8Array, {
            type: "array"
        });

        this.sourceWorkbook = workbook;
        this.sourceFileName = file.name;

        if (this.logger) {
            this.logger.log(
                `✅ Đã tải File Nguồn: ${file.name} (${workbook.SheetNames.length} sheet)`,
                "success"
            );
        }

        return workbook;
    }

    /**
     * Đọc file đích bằng ExcelJS
     */
    async readTargetWorkbook(file) {
        if (!file) {
            throw new Error("Không tìm thấy file đích.");
        }

        const arrayBuffer = await file.arrayBuffer();

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        this.targetWorkbook = workbook;
        this.targetArrayBuffer = arrayBuffer;
        this.targetFileName = file.name;

        if (this.logger) {
            this.logger.log(
                `✅ Đã tải File Đích: ${file.name} (${workbook.worksheets.length} sheet)`,
                "success"
            );
        }

        return workbook;
    }

    /**
     * Đọc dữ liệu từ file nguồn
     *
     * Chỉ đọc:
     * - Cột B: mã
     * - Cột C: số lượng
     */
    async extractSourceRecords(parser, onProgress = null) {
        if (!this.sourceWorkbook) {
            throw new Error("Chưa tải File Nguồn.");
        }

        const sheetIndex = CONFIG.SOURCE_SHEET_INDEX || 0;
        const sheetName = this.sourceWorkbook.SheetNames[sheetIndex];

        if (!sheetName) {
            throw new Error("File Nguồn không có sheet nào.");
        }

        const worksheet = this.sourceWorkbook.Sheets[sheetName];

        // Đọc toàn bộ sheet thành mảng 2 chiều
        const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
            raw: true
        });

        const records = [];

        const stats = {
            sheetName: sheetName,
            totalRowsInSheet: rows.length,
            totalRows: 0,
            validRows: 0,
            skippedRows: 0,
            headerSkipped: 0,
            dotSkipped: 0,
            zeroQtySkipped: 0,
            invalidCodeSkipped: 0
        };

        if (this.logger) {
            this.logger.log(
                `📊 Bắt đầu đọc sheet "${sheetName}" trong File Nguồn. Tổng dòng: ${rows.length}`,
                "info"
            );
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || [];

            // Cột B = index 1, Cột C = index 2
            const rawCode = row[CONFIG.SOURCE_CODE_COLUMN];
            const rawQty = row[CONFIG.SOURCE_QTY_COLUMN];

            // Cập nhật progress để tránh đơ UI
            if (onProgress && i % 200 === 0) {
                const percent = Math.round(((i + 1) / rows.length) * 100);
                onProgress(percent, `Đang đọc dòng ${i + 1}/${rows.length}`);
                await Helpers.sleep(0);
            }

            // Bỏ qua ô mã rỗng
            if (Helpers.isEmpty(rawCode)) {
                continue;
            }

            // Bỏ qua dòng tiêu đề
            if (parser.isHeaderRow(rawCode)) {
                stats.headerSkipped++;
                continue;
            }

            stats.totalRows++;

            const codeString = String(rawCode).trim();

            // Bỏ qua mã có dấu chấm
            if (CONFIG.COLUMN_RULES.skipDot && codeString.includes(".")) {
                stats.dotSkipped++;
                stats.skippedRows++;
                continue;
            }

            // Làm sạch số lượng
            const qty = parser.cleanQuantity(rawQty);

            // Bỏ qua số lượng <= 0
            if (qty <= 0) {
                stats.zeroQtySkipped++;
                stats.skippedRows++;
                continue;
            }

            // Phân tích mã
            const parsed = parser.parse(rawCode);

            if (!parsed) {
                stats.invalidCodeSkipped++;
                stats.skippedRows++;
                continue;
            }

            // Thêm bản ghi hợp lệ
            records.push({
                ...parsed,
                qty: qty,
                sheet: sheetName,
                rowNumber: i + 1
            });

            stats.validRows++;
        }

        if (onProgress) {
            onProgress(100, "Đọc file nguồn hoàn tất");
        }

        if (this.logger) {
            this.logger.log(
                `📊 Kết quả đọc: ${stats.validRows} dòng hợp lệ, ` +
                `${stats.dotSkipped} dòng có dấu chấm bị bỏ qua, ` +
                `${stats.zeroQtySkipped} dòng số lượng <= 0 bị bỏ qua.`,
                "info"
            );
        }

        return {
            records: records,
            stats: stats
        };
    }
}