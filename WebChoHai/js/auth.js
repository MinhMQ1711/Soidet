/* ==========================================================
   AUTH.JS
   Xử lý đăng nhập, đổi mật khẩu, xác thực điện thoại
========================================================== */

class AuthManager {

    constructor(config = CONFIG, logger = null) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Lấy mật khẩu đang lưu trong localStorage
     * Nếu chưa có thì trả về mật khẩu mặc định
     */
    getStoredPassword() {
        try {
            const saved = localStorage.getItem(this.config.STORAGE_KEY_PASSWORD);
            return saved || this.config.DEFAULT_PASSWORD;
        } catch (error) {
            console.warn("Không đọc được localStorage, dùng mật khẩu mặc định.");
            return this.config.DEFAULT_PASSWORD;
        }
    }

    /**
     * Lưu mật khẩu mới vào localStorage
     */
    setStoredPassword(password) {
        try {
            localStorage.setItem(this.config.STORAGE_KEY_PASSWORD, password);
            return true;
        } catch (error) {
            console.error("Không lưu được mật khẩu vào localStorage:", error);
            return false;
        }
    }

    /**
     * Kiểm tra mật khẩu đăng nhập
     */
    verifyPassword(inputPassword) {
        const storedPassword = this.getStoredPassword();
        return inputPassword === storedPassword;
    }

    /**
     * Kiểm tra số điện thoại chủ sở hữu
     */
    verifyPhone(inputPhone) {
        const phone = String(inputPhone || "").trim();
        return phone === this.config.OWNER_PHONE;
    }

    /**
     * Đổi mật khẩu mới
     */
    changePassword(newPassword, confirmPassword) {
        if (!Validators.isValidPassword(newPassword)) {
            return {
                success: false,
                message: `Mật khẩu phải có ít nhất ${this.config.MIN_PASSWORD_LENGTH} ký tự!`
            };
        }

        if (newPassword !== confirmPassword) {
            return {
                success: false,
                message: "Mật khẩu xác nhận không khớp!"
            };
        }

        const saved = this.setStoredPassword(newPassword);

        if (!saved) {
            return {
                success: false,
                message: "Không thể lưu mật khẩu. Vui lòng thử lại."
            };
        }

        if (this.logger) {
            this.logger.log("🔑 Mật khẩu đã được đổi thành công.", "success");
        }

        return {
            success: true,
            message: "✅ Đổi mật khẩu thành công!"
        };
    }
}