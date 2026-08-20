/* ==========================================================
   APP.JS
   Controller chính của ứng dụng
========================================================== */

class SLMApplication {

    constructor() {
        this.logger = new Logger();
        this.auth = new AuthManager(CONFIG, this.logger);
        this.parser = new ProductCodeParser(CONFIG, this.logger);
        this.mapper = new PositionMapper(CONFIG, this.logger);
        this.fileHandler = new FileHandler(this.logger);
        this.processor = new DataProcessor(this.parser, this.mapper, this.logger);
        this.exporter = new FileExporter(this.logger);
        this.ui = new UIManager(this);

        this.state = {
            isLoggedIn: false,
            hasBothFiles: false,

            rawRecords: [],
            finalData: [],
            mergedLabels: 0,
            totalQty: 0,
            readStats: null,

            validationResults: {
                valid: 0,
                warning: 0,
                error: 0,
                total: 0
            },

            selectedSheets: [],
            discrepancies: [],

            processedWorkbook: null,
            processStats: null
        };
    }

    /**
     * Khởi tạo ứng dụng
     */
    init() {
        this.logger.log("🚀 Hệ thống SLM 2026 đã sẵn sàng.", "success");
        this.logger.log("📌 Vui lòng upload File Nguồn và File Đích.", "info");

        this.ui.updateBadges(this.state);
    }

    /* ===============================
       ĐĂNG NHẬP / ĐĂNG XUẤT
    =============================== */

    doLogin() {
        const passwordInput = Helpers.getElement("loginPassword");
        const password = passwordInput ? passwordInput.value : "";

        if (this.auth.verifyPassword(password)) {
            this.state.isLoggedIn = true;

            this.ui.hideLoginError();
            this.ui.showMainApp();

            this.logger.log("🔓 Đăng nhập thành công.", "success");
        } else {
            this.ui.showLoginError();
        }
    }

    doLogout() {
        if (!confirm("Bạn có chắc muốn đăng xuất?")) {
            return;
        }

        this.state.isLoggedIn = false;

        this.ui.hideMainApp();
        this.ui.clearLoginInput();

        this.logger.log("🔒 Đã đăng xuất.", "info");
    }

    /* ===============================
       ĐỔI MẬT KHẨU
    =============================== */

    showChangePasswordModal() {
        this.ui.showChangePasswordModal();
    }

    closeChangePasswordModal() {
        this.ui.hideChangePasswordModal();
    }

    verifyPhone() {
        const phoneInput = Helpers.getElement("phoneInput");
        const phone = phoneInput ? phoneInput.value : "";

        if (this.auth.verifyPhone(phone)) {
            this.ui.hidePhoneError();
            this.ui.showNewPasswordSection();
        } else {
            this.ui.showPhoneError();
        }
    }

    saveNewPassword() {
        const newPassword = Helpers.getElement("newPassword")?.value || "";
        const confirmPassword = Helpers.getElement("confirmPassword")?.value || "";

        const result = this.auth.changePassword(newPassword, confirmPassword);

        if (result.success) {
            alert(result.message);
            this.ui.hideChangePasswordModal();
        } else {
            alert(result.message);
        }
    }

    /* ===============================
       UPLOAD FILE
    =============================== */

    async handleFile1Upload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.logger.log(`📂 Đang tải File Nguồn: ${file.name}`, "info");

            await this.fileHandler.readSourceWorkbook(file);

            this.ui.setUploadCardHasFile("uploadCard1", true);
            this.ui.setFileInfo("file1Info", `✅ ${file.name}`);

            this.ui.showReadSection();

            this.state.hasBothFiles = this.fileHandler.hasBothFiles();
            this.ui.setStartReadEnabled(this.state.hasBothFiles);

            this.ui.updateBadges(this.state);
        } catch (error) {
            this.logger.log(`❌ Lỗi đọc File Nguồn: ${error.message}`, "error");
        }
    }

    async handleFile2Upload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.logger.log(`📂 Đang tải File Đích: ${file.name}`, "info");

            const workbook = await this.fileHandler.readTargetWorkbook(file);

            this.ui.setUploadCardHasFile("uploadCard2", true);
            this.ui.setFileInfo("file2Info", `✅ ${file.name} (Giữ nguyên định dạng)`);

            this.ui.renderSheetList(workbook, () => {
                this.updateSelectedSheets();
            });

            this.state.hasBothFiles = this.fileHandler.hasBothFiles();
            this.ui.setStartReadEnabled(this.state.hasBothFiles);

            this.updateSelectedSheets();
            this.ui.updateBadges(this.state);
        } catch (error) {
            this.logger.log(`❌ Lỗi đọc File Đích: ${error.message}`, "error");
        }
    }

    /* ===============================
       ĐỌC FILE NGUỒN
    =============================== */

    async startSingleRead() {
        if (!this.fileHandler.sourceWorkbook) {
            alert("Vui lòng chọn File Nguồn!");
            return;
        }

        if (!this.fileHandler.hasBothFiles()) {
            alert("Vui lòng chọn đủ File Nguồn và File Đích!");
            return;
        }

        this.ui.setStartReadEnabled(false);
        this.ui.showReadProgress();

        this.logger.log("🚀 Bắt đầu đọc File Nguồn...", "info");
        this.logger.log("📌 Chỉ đọc Cột B và Cột C. Bỏ qua mã có dấu chấm.", "info");

        try {
            const { records, stats } = await this.fileHandler.extractSourceRecords(
                this.parser,
                (percent, text) => {
                    this.ui.updateReadProgress(percent, text);
                }
            );

            const aggregated = this.parser.aggregate(records);

            this.state.rawRecords = records;
            this.state.finalData = aggregated.finalData;
            this.state.totalQty = aggregated.totalQty;
            this.state.mergedLabels = aggregated.finalData.filter(item => item.count > 1).length;
            this.state.readStats = stats;

            this.ui.updateStats({
                rawCount: records.length,
                uniqueCount: aggregated.finalData.length,
                mergedLabels: this.state.mergedLabels,
                totalQty: aggregated.totalQty
            });

            this.ui.renderReviewTable(this.state.finalData);

            this.ui.showPreviewSection();

            this.ui.renderPreview({
                rawCount: records.length,
                uniqueCount: aggregated.finalData.length,
                mergedLabels: this.state.mergedLabels,
                totalQty: aggregated.totalQty,
                dotSkipped: stats.dotSkipped,
                zeroQtySkipped: stats.zeroQtySkipped
            });

            this.runValidation(true);

            this.ui.updateBadges(this.state);

            this.logger.log(
                `🎉 Đọc hoàn tất: ${aggregated.finalData.length} nhãn duy nhất, tổng số lượng ${Helpers.formatNumber(aggregated.totalQty)}.`,
                "success"
            );

            setTimeout(() => {
                this.ui.hideReadProgress();
                this.switchTab("review");
            }, 700);

        } catch (error) {
            this.logger.log(`❌ Lỗi khi đọc File Nguồn: ${error.message}`, "error");
            this.ui.hideReadProgress();
        } finally {
            this.ui.setStartReadEnabled(this.fileHandler.hasBothFiles());
        }
    }

    /* ===============================
       VALIDATION
    =============================== */

    runValidation(silent = false) {
        const results = {
            valid: 0,
            warning: 0,
            error: 0,
            total: this.state.finalData.length
        };

        this.state.finalData.forEach(item => {
            if (item.qty < 0) {
                results.error++;
                item.status = "error";
            } else if (item.qty === 0) {
                results.warning++;
                item.status = "warn";
            } else {
                results.valid++;
                item.status = "ok";
            }
        });

        this.state.validationResults = results;

        this.ui.updateValidationStats(results);
        this.ui.renderReviewTable(this.state.finalData);
        this.ui.updateBadges(this.state);

        if (!silent) {
            this.logger.log(
                `✅ Kiểm tra hoàn tất: ${results.valid} hợp lệ, ${results.warning} cảnh báo, ${results.error} lỗi.`,
                results.error > 0 ? "warning" : "success"
            );
        }
    }

    confirmValidation() {
        if (this.state.finalData.length === 0) {
            alert("Chưa có dữ liệu để kiểm tra.");
            return;
        }

        if (this.state.validationResults.total === 0) {
            this.runValidation(true);
        }

        if (this.state.validationResults.error > 0) {
            const ok = confirm(
                `Có ${this.state.validationResults.error} dữ liệu lỗi. Bạn có chắc muốn tiếp tục?`
            );

            if (!ok) return;
        }

        this.logger.log("✅ Đã xác nhận dữ liệu. Chuyển sang tab Xử lý.", "success");
        this.switchTab("process");
    }

    /* ===============================
       REVIEW FILTER
    =============================== */

    filterReviewTable() {
        const searchInput = Helpers.getElement("searchReview");
        const filterStatus = Helpers.getElement("filterStatus");

        const searchText = searchInput ? searchInput.value : "";
        const statusValue = filterStatus ? filterStatus.value : "";

        this.ui.filterReviewTable(searchText, statusValue);
    }

    /* ===============================
       CHỌN SHEET
    =============================== */

    toggleSelectAllSheets() {
        const selectAll = Helpers.getElement("selectAllSheets");
        const checked = selectAll ? selectAll.checked : false;

        this.ui.toggleSelectAllSheets(checked);
        this.updateSelectedSheets();
    }

    updateSelectedSheets() {
        this.state.selectedSheets = this.ui.getSelectedSheets();

        const canProcess =
            this.state.finalData.length > 0 &&
            this.state.selectedSheets.length > 0;

        this.ui.setProcessEnabled(canProcess);
        this.ui.updateBadges(this.state);

        return this.state.selectedSheets;
    }

    /* ===============================
       XỬ LÝ ĐIỀN DỮ LIỆU
    =============================== */

    async startProcessing() {
        const selectedSheets = this.updateSelectedSheets();

        if (!this.fileHandler.targetArrayBuffer) {
            alert("Chưa có File Đích!");
            return;
        }

        if (this.state.finalData.length === 0) {
            alert("Chưa có dữ liệu để điền!");
            return;
        }

        if (selectedSheets.length === 0) {
            alert("Vui lòng chọn ít nhất một sheet đích!");
            return;
        }

        this.ui.setProcessEnabled(false);
        this.ui.showProcessStats();
        this.ui.showProcessProgress();
        this.ui.updateProcessProgress(0, "Bắt đầu xử lý...");

        this.logger.process("🚀 Bắt đầu xử lý điền dữ liệu vào File Đích...", "info");

        try {
            const result = await this.processor.process({
                targetArrayBuffer: this.fileHandler.targetArrayBuffer,
                finalData: this.state.finalData,
                selectedSheets: selectedSheets,
                onProgress: (percent, text) => {
                    this.ui.updateProcessProgress(percent, text);
                }
            });

            this.state.processedWorkbook = result.workbook;
            this.state.processStats = result.stats;
            this.state.discrepancies = result.discrepancies;

            this.ui.updateProcessStats(result.stats);
            this.ui.renderDiscrepancies(result.discrepancies);
            this.ui.updateDiscrepancyStats(result.discrepancies);

            this.ui.updateExportStats(result.stats);
            this.ui.setExportEnabled(true);

            this.ui.updateBadges(this.state);

            this.logger.process(
                `🎉 Hoàn tất! Đã điền ${Helpers.formatNumber(result.stats.success)} ô.`,
                "success"
            );

            if (result.discrepancies.length > 0) {
                this.logger.process(
                    `⚠️ Có ${Helpers.formatNumber(result.discrepancies.length)} mục không khớp. Xem tab Sai Lệch.`,
                    "warning"
                );
            }

            setTimeout(() => {
                this.ui.hideProcessProgress();
                this.switchTab("export");
            }, 900);

        } catch (error) {
            this.logger.process(`❌ Lỗi xử lý: ${error.message}`, "error");
            this.ui.hideProcessProgress();
        } finally {
            this.updateSelectedSheets();
        }
    }

    /* ===============================
       XUẤT FILE
    =============================== */

    async exportResult() {
        if (!this.state.processedWorkbook) {
            alert("Chưa có dữ liệu để xuất. Vui lòng xử lý trước.");
            return;
        }

        this.ui.setExportEnabled(false);

        try {
            await this.exporter.export(
                this.state.processedWorkbook,
                this.state.processStats || {}
            );

            this.ui.updateExportStats(this.state.processStats || {});
            this.ui.updateBadges(this.state);
        } catch (error) {
            this.logger.export(`❌ Lỗi xuất file: ${error.message}`, "error");
        } finally {
            this.ui.setExportEnabled(true);
        }
    }

    /* ===============================
       LOG
    =============================== */

    clearLog() {
        this.logger.clearLog();
    }

    clearProcessLog() {
        this.logger.clearProcessLog();
    }

    /* ===============================
       TABS
    =============================== */

    switchTab(tabName, event = null) {
        this.ui.switchTab(tabName, event);
    }

    /* ===============================
       RESET
    =============================== */

    resetAll() {
        if (!confirm("Bạn có chắc muốn làm mới toàn bộ hệ thống?")) {
            return;
        }

        this.state = {
            isLoggedIn: true,
            hasBothFiles: false,

            rawRecords: [],
            finalData: [],
            mergedLabels: 0,
            totalQty: 0,
            readStats: null,

            validationResults: {
                valid: 0,
                warning: 0,
                error: 0,
                total: 0
            },

            selectedSheets: [],
            discrepancies: [],

            processedWorkbook: null,
            processStats: null
        };

        this.fileHandler.reset();
        this.ui.resetUI();

        this.logger.clearLog();
        this.logger.clearProcessLog();
        this.logger.clearExportLog();

        this.logger.log("🔄 Hệ thống đã được làm mới.", "info");
        this.logger.log("📌 Vui lòng upload 2 file để bắt đầu.", "info");

        this.ui.updateBadges(this.state);
    }
}

/* ==========================================================
   KHỞI TẠO ỨNG DỤNG
========================================================== */

window.App = new SLMApplication();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        window.App.init();
    });
} else {
    window.App.init();
}