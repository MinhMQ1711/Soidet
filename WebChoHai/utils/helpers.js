/* ==========================================================
   HELPERS.JS
   Các hàm tiện ích dùng chung
========================================================== */

const Helpers = {

    /**
     * Lấy giờ hiện tại dạng đẹp để hiển thị log
     */
    getTimestamp() {
        return new Date().toLocaleTimeString("vi-VN");
    },

    /**
     * Chuẩn hóa chữ:
     * - trim khoảng trắng
     * - chuyển uppercase
     * - nếu null/undefined thì trả về chuỗi rỗng
     */
    normalizeText(value) {
        if (value === null || value === undefined) return "";
        return String(value).trim().toUpperCase();
    },

    /**
     * Format số đẹp, ví dụ:
     * 123456 -> 123,456
     */
    formatNumber(value) {
        const num = Number(value || 0);
        if (isNaN(num)) return "0";
        return num.toLocaleString("vi-VN");
    },

    /**
     * Escape HTML để tránh lỗi khi inject vào DOM
     */
    escapeHtml(value) {
        const str = String(value ?? "");
        return str
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    },

    /**
     * Cắt ngắn chuỗi để hiển thị log
     */
    truncate(value, maxLength = 90) {
        const str = String(value ?? "");
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + "...";
    },

    /**
     * Sleep để tạo độ trễ nhẹ cho UI/progress
     */
    sleep(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Kiểm tra giá trị rỗng
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === "string" && value.trim() === "") return true;
        return false;
    },

    /**
     * Chuyển ArrayBuffer sang Blob Excel
     */
    createExcelBlob(buffer) {
        return new Blob([buffer], {
            type: CONFIG.EXPORT_MIME_TYPE
        });
    },

    /**
     * Tạo tên file xuất có timestamp
     */
    generateExportFileName() {
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .substring(0, 19);

        return `${CONFIG.EXPORT_FILENAME_PREFIX}_${timestamp}.xlsx`;
    },

    /**
     * Tải Blob xuống máy người dùng
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    },

    /**
     * Lấy element theo ID, nếu không có thì cảnh báo
     */
    getElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`Không tìm thấy element có id: ${id}`);
        }
        return el;
    },

    /**
     * Set text cho element
     */
    setText(id, value) {
        const el = this.getElement(id);
        if (el) {
            el.textContent = value;
        }
    },

    /**
     * Hiện element
     */
    showElement(id, displayType = "block") {
        const el = this.getElement(id);
        if (el) {
            el.style.display = displayType;
        }
    },

    /**
     * Ẩn element
     */
    hideElement(id) {
        const el = this.getElement(id);
        if (el) {
            el.style.display = "none";
        }
    }
};