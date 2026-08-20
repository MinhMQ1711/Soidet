/* ==========================================================
   VALIDATORS.JS
   Các hàm kiểm tra dữ liệu
========================================================== */

const Validators = {

    /**
     * Kiểm tra chuỗi chỉ chứa A-Z hoặc 0-9
     * Đã uppercase sẵn thì tốt, nhưng có i trong regex
     */
    isAlphanumeric(value) {
        const str = Helpers.normalizeText(value);
        if (!str) return false;
        return CONFIG.PATTERNS.alphanumeric.test(str);
    },

    /**
     * Kiểm tra một giá trị có thể là mã sản phẩm không
     */
    isLikelyProductCode(value) {
        const str = Helpers.normalizeText(value);

        if (!str) return false;

        if (str.length < CONFIG.MIN_CODE_LENGTH) return false;

        if (CONFIG.COLUMN_RULES.skipDot && str.includes(".")) {
            return false;
        }

        return this.isAlphanumeric(str);
    },

    /**
     * Kiểm tra dòng tiêu đề trong file nguồn
     * Ví dụ các dòng chứa "Lượt lô", "Mã family"...
     */
    isHeaderRow(cellValue) {
        if (Helpers.isEmpty(cellValue)) return true;

        const str = String(cellValue).toLowerCase();

        return CONFIG.HEADER_KEYWORDS.some(keyword =>
            str.includes(keyword.toLowerCase())
        );
    },

    /**
     * Kiểm tra số lượng hợp lệ
     */
    isValidQuantity(value) {
        const num = Number(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Kiểm tra mật khẩu đủ điều kiện tối thiểu
     */
    isValidPassword(password) {
        if (typeof password !== "string") return false;
        return password.length >= CONFIG.MIN_PASSWORD_LENGTH;
    },

    /**
     * Kiểm tra số điện thoại cơ bản
     */
    isValidPhone(phone) {
        const str = String(phone || "").trim();
        return /^\d{9,11}$/.test(str);
    },

    /**
     * Kiểm tra tên sheet hợp lệ
     */
    isValidSheetName(sheetName) {
        return !Helpers.isEmpty(sheetName);
    },

    /**
     * Kiểm tra Base hợp lệ
     * Base là 6 ký tự đầu của mã sản phẩm
     */
    isValidBase(base) {
        const str = Helpers.normalizeText(base);

        if (!str) return false;

        if (str.length < CONFIG.MIN_BASE_LENGTH) return false;

        return this.isAlphanumeric(str);
    },

    /**
     * Kiểm tra đuôi cột hợp lệ
     * Ví dụ: 2E, 0A, A1, A...
     */
    isValidColumnToken(col) {
        const str = Helpers.normalizeText(col);

        if (!str) return false;

        return this.isAlphanumeric(str);
    }
};