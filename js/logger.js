/* ==========================================================
   LOGGER.JS
   Hệ thống ghi log cho toàn ứng dụng
========================================================== */

class Logger {

    constructor(config = CONFIG) {
        this.config = config;
        this.maxEntries = config.LOG_LIMIT || 800;
    }

    /**
     * Thêm một dòng log vào vùng log bất kỳ
     */
    append(areaId, message, type = "info") {
        const area = document.getElementById(areaId);

        if (!area) {
            console.warn(`Không tìm thấy vùng log: ${areaId}`);
            return;
        }

        const time = Helpers.getTimestamp();
        const entry = document.createElement("div");

        entry.className = `log-entry log-${type}`;
        entry.textContent = `[${time}] ${message}`;

        area.appendChild(entry);

        // Giới hạn số dòng log để tránh nặng DOM
        while (area.children.length > this.maxEntries) {
            area.removeChild(area.firstChild);
        }

        area.scrollTop = area.scrollHeight;

        // Đồng thời log ra console để dễ debug
        const consoleMessage = `[SLM ${areaId}] ${message}`;

        if (type === "error") {
            console.error(consoleMessage);
        } else if (type === "warning") {
            console.warn(consoleMessage);
        } else if (type === "success") {
            console.log(consoleMessage);
        } else {
            console.log(consoleMessage);
        }
    }

    /**
     * Log hệ thống chính ở tab Upload
     */
    log(message, type = "info") {
        this.append(this.config.LOG_IDS.main, message, type);
    }

    /**
     * Log quá trình xử lý điền dữ liệu
     */
    process(message, type = "info") {
        this.append(this.config.LOG_IDS.process, message, type);
    }

    /**
     * Log quá trình xuất file
     */
    export(message, type = "info") {
        this.append(this.config.LOG_IDS.export, message, type);
    }

    /**
     * Xóa log chính
     */
    clearLog() {
        const area = Helpers.getElement(this.config.LOG_IDS.main);
        if (area) {
            area.innerHTML = "";
            this.log("Đã xóa log hệ thống.", "info");
        }
    }

    /**
     * Xóa log xử lý
     */
    clearProcessLog() {
        const area = Helpers.getElement(this.config.LOG_IDS.process);
        if (area) {
            area.innerHTML = "";
            this.process("Đã xóa log xử lý.", "info");
        }
    }

    /**
     * Xóa log xuất file
     */
    clearExportLog() {
        const area = Helpers.getElement(this.config.LOG_IDS.export);
        if (area) {
            area.innerHTML = "";
            this.export("Đã xóa log xuất file.", "info");
        }
    }

    /**
     * Log nhanh một đối tượng ra console
     */
    debug(label, data) {
        console.log(`[SLM DEBUG] ${label}`, data);
    }
}