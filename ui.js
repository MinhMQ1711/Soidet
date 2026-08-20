/* ==========================================================
   UI.JS
   Quản lý hiển thị giao diện người dùng
========================================================== */

class UIManager {

    constructor(app) {
        this.app = app;
    }

    /* ===============================
       Helper nội bộ
    =============================== */

    setText(id, value) {
        Helpers.setText(id, value);
    }

    setBadge(id, text, color = "") {
        const el = Helpers.getElement(id);
        if (!el) return;

        el.textContent = text;
        el.style.background = color;
    }

    /* ===============================
       Đăng nhập / đăng xuất
    =============================== */

    showMainApp() {
        const loginOverlay = Helpers.getElement("loginOverlay");
        const mainApp = Helpers.getElement("mainApp");

        if (loginOverlay) loginOverlay.classList.add("hidden");
        if (mainApp) mainApp.style.display = "block";
    }

    hideMainApp() {
        const loginOverlay = Helpers.getElement("loginOverlay");
        const mainApp = Helpers.getElement("mainApp");

        if (loginOverlay) loginOverlay.classList.remove("hidden");
        if (mainApp) mainApp.style.display = "none";
    }

    showLoginError() {
        Helpers.showElement("loginError", "block");
    }

    hideLoginError() {
        Helpers.hideElement("loginError");
    }

    clearLoginInput() {
        const input = Helpers.getElement("loginPassword");
        if (input) input.value = "";
    }

    /* ===============================
       Modal đổi mật khẩu
    =============================== */

    showChangePasswordModal() {
        const modal = Helpers.getElement("changePasswordModal");
        if (modal) modal.classList.add("active");

        this.resetChangePasswordModal();
    }

    hideChangePasswordModal() {
        const modal = Helpers.getElement("changePasswordModal");
        if (modal) modal.classList.remove("active");
    }

    resetChangePasswordModal() {
        const phoneInput = Helpers.getElement("phoneInput");
        const newPassword = Helpers.getElement("newPassword");
        const confirmPassword = Helpers.getElement("confirmPassword");

        if (phoneInput) phoneInput.value = "";
        if (newPassword) newPassword.value = "";
        if (confirmPassword) confirmPassword.value = "";

        this.hidePhoneError();
        this.hideNewPasswordSection();

        Helpers.showElement("phoneVerifyBtn", "inline-flex");
        Helpers.hideElement("savePasswordBtn");
    }

    showPhoneError() {
        Helpers.showElement("phoneError", "block");
    }

    hidePhoneError() {
        Helpers.hideElement("phoneError");
    }

    showNewPasswordSection() {
        Helpers.showElement("newPasswordSection", "block");
        Helpers.hideElement("phoneVerifyBtn");
        Helpers.showElement("savePasswordBtn", "inline-flex");
    }

    hideNewPasswordSection() {
        Helpers.hideElement("newPasswordSection");
    }

    /* ===============================
       Upload
    =============================== */

    setUploadCardHasFile(cardId, hasFile = true) {
        const card = Helpers.getElement(cardId);
        if (!card) return;

        if (hasFile) {
            card.classList.add("has-file");
        } else {
            card.classList.remove("has-file");
        }
    }

    setFileInfo(id, text) {
        this.setText(id, text);
    }

    showReadSection() {
        Helpers.showElement("readSection", "block");
    }

    hideReadSection() {
        Helpers.hideElement("readSection");
    }

    setStartReadEnabled(enabled) {
        const btn = Helpers.getElement("btnStartRead");
        if (btn) btn.disabled = !enabled;
    }

    /* ===============================
       Progress đọc file
    =============================== */

    showReadProgress() {
        Helpers.showElement("readProgress", "block");
    }

    hideReadProgress() {
        Helpers.hideElement("readProgress");
    }

    updateReadProgress(percent, text) {
        this.showReadProgress();

        const fill = Helpers.getElement("readProgressFill");
        if (fill) fill.style.width = `${percent}%`;

        this.setText("readProgressText", text);
    }

    /* ===============================
       Preview
    =============================== */

    showPreviewSection() {
        Helpers.showElement("previewSection", "block");
    }

    hidePreviewSection() {
        Helpers.hideElement("previewSection");
    }

    renderPreview(data) {
        const grid = Helpers.getElement("previewGrid");
        if (!grid) return;

        const rawCount = data.rawCount || 0;
        const uniqueCount = data.uniqueCount || 0;
        const mergedLabels = data.mergedLabels || 0;
        const totalQty = data.totalQty || 0;
        const dotSkipped = data.dotSkipped || 0;
        const zeroQtySkipped = data.zeroQtySkipped || 0;

        grid.innerHTML = `
            <div class="preview-item">
                <div class="label">Bản ghi hợp lệ</div>
                <div class="value">${Helpers.formatNumber(rawCount)}</div>
            </div>

            <div class="preview-item">
                <div class="label">Nhãn duy nhất</div>
                <div class="value">${Helpers.formatNumber(uniqueCount)}</div>
            </div>

            <div class="preview-item">
                <div class="label">Nhãn đã cộng dồn</div>
                <div class="value">${Helpers.formatNumber(mergedLabels)}</div>
            </div>

            <div class="preview-item">
                <div class="label">Tổng số lượng</div>
                <div class="value">${Helpers.formatNumber(totalQty)}</div>
            </div>

            <div class="preview-item">
                <div class="label">Mã có dấu chấm đã bỏ</div>
                <div class="value">${Helpers.formatNumber(dotSkipped)}</div>
            </div>

            <div class="preview-item">
                <div class="label">Số lượng <= 0 đã bỏ</div>
                <div class="value">${Helpers.formatNumber(zeroQtySkipped)}</div>
            </div>
        `;
    }

    /* ===============================
       Thống kê tổng
    =============================== */

    updateStats({
        rawCount = 0,
        uniqueCount = 0,
        mergedLabels = 0,
        totalQty = 0
    }) {
        this.setText("statTotalRows", Helpers.formatNumber(rawCount));
        this.setText("statUniqueLabels", Helpers.formatNumber(uniqueCount));
        this.setText("statMerged", Helpers.formatNumber(mergedLabels));
        this.setText("statTotalQty", Helpers.formatNumber(totalQty));
    }

    /* ===============================
       Bảng Review
    =============================== */

    renderReviewTable(finalData) {
        const tbody = Helpers.getElement("reviewTableBody");
        if (!tbody) return;

        if (!Array.isArray(finalData) || finalData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-row">
                        Chưa có dữ liệu.
                    </td>
                </tr>
            `;
            return;
        }

        const rows = finalData.map((item, index) => {
            const original = item.originals && item.originals.length > 0
                ? item.originals[0]
                : "";

            const originalSuffix = item.rawSuffixes && item.rawSuffixes.length > 0
                ? item.rawSuffixes[0]
                : (item.rawSuffix || "");

            const targetColumn = item.targetColumn || item.col || "";
            const status = item.status || "ok";

            let statusBadge = "";

            if (status === "ok") {
                statusBadge = `<span class="status-badge status-ok">✅ OK</span>`;
            } else if (status === "warn") {
                statusBadge = `<span class="status-badge status-warn">⚠️ Warn</span>`;
            } else {
                statusBadge = `<span class="status-badge status-error">❌ Error</span>`;
            }

            const countHtml = item.count > 1
                ? ` <span class="text-warning fw-800">(×${item.count})</span>`
                : "";

            return `
                <tr data-status="${Helpers.escapeHtml(status)}">
                    <td>${index + 1}</td>
                    <td><code>${Helpers.escapeHtml(original)}</code>${countHtml}</td>
                    <td><strong>${Helpers.escapeHtml(item.base)}</strong></td>
                    <td><code>${Helpers.escapeHtml(originalSuffix)}</code></td>
                    <td><strong class="text-info">${Helpers.escapeHtml(targetColumn)}</strong></td>
                    <td class="fw-800 text-success">${Helpers.formatNumber(item.qty)}</td>
                    <td>${Helpers.formatNumber(item.count)}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = rows.join("");
    }

    filterReviewTable(searchText = "", statusFilter = "") {
        const tbody = Helpers.getElement("reviewTableBody");
        if (!tbody) return;

        const search = String(searchText || "").toLowerCase();
        const rows = tbody.querySelectorAll("tr");

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const rowStatus = row.dataset.status || "";

            const matchSearch = !search || text.includes(search);
            const matchStatus = !statusFilter || rowStatus === statusFilter;

            row.style.display = (matchSearch && matchStatus) ? "" : "none";
        });
    }

    /* ===============================
       Validation
    =============================== */

    updateValidationStats(results) {
        this.setText("valValid", Helpers.formatNumber(results.valid || 0));
        this.setText("valWarning", Helpers.formatNumber(results.warning || 0));
        this.setText("valError", Helpers.formatNumber(results.error || 0));
        this.setText("valTotal", Helpers.formatNumber(results.total || 0));
    }

    /* ===============================
       Discrepancy
    =============================== */

    renderDiscrepancies(discrepancies) {
        const tbody = Helpers.getElement("discrepancyTableBody");
        if (!tbody) return;

        if (!Array.isArray(discrepancies) || discrepancies.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">
                        Chưa có dữ liệu sai lệch.
                    </td>
                </tr>
            `;
            return;
        }

        const rows = discrepancies.map((item, index) => {
            const original = item.originals && item.originals.length > 0
                ? item.originals[0]
                : "";

            const originalSuffix = item.rawSuffixes && item.rawSuffixes.length > 0
                ? item.rawSuffixes[0]
                : (item.rawSuffix || "");

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><code>${Helpers.escapeHtml(original)}</code></td>
                    <td><strong>${Helpers.escapeHtml(item.base)}</strong></td>
                    <td><code>${Helpers.escapeHtml(originalSuffix)}</code></td>
                    <td><strong class="text-info">${Helpers.escapeHtml(item.targetColumn || "")}</strong></td>
                    <td>${Helpers.formatNumber(item.qty)}</td>
                    <td class="text-danger">${Helpers.escapeHtml(item.reason || "")}</td>
                </tr>
            `;
        });

        tbody.innerHTML = rows.join("");
    }

    updateDiscrepancyStats(discrepancies) {
        if (!Array.isArray(discrepancies)) {
            discrepancies = [];
        }

        const noBase = discrepancies.filter(item =>
            item.reason && item.reason.includes("Base")
        ).length;

        const noCol = discrepancies.filter(item =>
            item.reason && item.reason.includes("cột")
        ).length;

        this.setText("statNoBase", Helpers.formatNumber(noBase));
        this.setText("statNoCol", Helpers.formatNumber(noCol));
        this.setText("statTotalMismatch", Helpers.formatNumber(discrepancies.length));
    }

    /* ===============================
       Sheet selector
    =============================== */

    renderSheetList(workbook, onChangeCallback = null) {
        const list = Helpers.getElement("sheetList");
        if (!list) return;

        list.innerHTML = "";

        if (!workbook || !Array.isArray(workbook.worksheets) || workbook.worksheets.length === 0) {
            list.innerHTML = `<p class="empty-state">Chưa có File Đích.</p>`;
            return;
        }

        workbook.worksheets.forEach((worksheet, index) => {
            const item = document.createElement("div");
            item.className = "sheet-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `sheet_${index}`;
            checkbox.value = worksheet.name;

            checkbox.addEventListener("change", () => {
                if (typeof onChangeCallback === "function") {
                    onChangeCallback();
                } else if (this.app && typeof this.app.updateSelectedSheets === "function") {
                    this.app.updateSelectedSheets();
                }
            });

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.textContent = `${index + 1}. ${worksheet.name}`;

            item.appendChild(checkbox);
            item.appendChild(label);

            list.appendChild(item);
        });
    }

    toggleSelectAllSheets(checked) {
        const checkboxes = document.querySelectorAll("#sheetList input[type='checkbox']");

        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;

            const item = checkbox.closest(".sheet-item");
            if (item) {
                item.classList.toggle("selected", checked);
            }
        });
    }

    getSelectedSheets() {
        const selected = [];
        const checkboxes = document.querySelectorAll("#sheetList input[type='checkbox']");

        checkboxes.forEach(checkbox => {
            const item = checkbox.closest(".sheet-item");

            if (checkbox.checked) {
                selected.push(checkbox.value);
                if (item) item.classList.add("selected");
            } else {
                if (item) item.classList.remove("selected");
            }
        });

        return selected;
    }

    setProcessEnabled(enabled) {
        const btn = Helpers.getElement("btnProcess");
        if (btn) btn.disabled = !enabled;
    }

    /* ===============================
       Progress xử lý
    =============================== */

    showProcessProgress() {
        Helpers.showElement("processProgress", "block");
    }

    hideProcessProgress() {
        Helpers.hideElement("processProgress");
    }

    updateProcessProgress(percent, text) {
        this.showProcessProgress();

        const fill = Helpers.getElement("processProgressFill");
        if (fill) fill.style.width = `${percent}%`;

        this.setText("processProgressText", text);
    }

    showProcessStats() {
        Helpers.showElement("processStats", "grid");
    }

    hideProcessStats() {
        Helpers.hideElement("processStats");
    }

    updateProcessStats(stats) {
        this.setText("procTotal", Helpers.formatNumber(stats.total || 0));
        this.setText("procSuccess", Helpers.formatNumber(stats.success || 0));
        this.setText("procNotFound", Helpers.formatNumber(stats.notFound || 0));
        this.setText("procSheets", Helpers.formatNumber(stats.sheetsProcessed || 0));
    }

    /* ===============================
       Export
    =============================== */

    setExportEnabled(enabled) {
        const btn = Helpers.getElement("btnExport");
        if (btn) btn.disabled = !enabled;
    }

    updateExportStats(stats) {
        this.setText("exportFilled", Helpers.formatNumber(stats.filledCells || 0));
        this.setText("exportSheets", Helpers.formatNumber(stats.sheetsProcessed || 0));
    }

    /* ===============================
       Tabs
    =============================== */

    switchTab(tabName, event = null) {
        const tabContents = document.querySelectorAll(".tab-content");
        const tabButtons = document.querySelectorAll(".nav-tab");

        tabContents.forEach(tab => tab.classList.remove("active"));
        tabButtons.forEach(button => button.classList.remove("active"));

        const activeTab = Helpers.getElement(`tab-${tabName}`);
        if (activeTab) {
            activeTab.classList.add("active");
        }

        let activeButton = null;

        if (event && event.currentTarget && event.currentTarget.classList.contains("nav-tab")) {
            activeButton = event.currentTarget;
        } else {
            activeButton = document.querySelector(`.nav-tab[onclick*="'${tabName}'"]`);
        }

        if (activeButton) {
            activeButton.classList.add("active");
        }
    }

    /* ===============================
       Badges
    =============================== */

    updateBadges(state) {
        const hasBothFiles = !!state.hasBothFiles;
        const finalData = state.finalData || [];
        const validationResults = state.validationResults || { total: 0, error: 0 };
        const discrepancies = state.discrepancies || [];
        const selectedSheets = state.selectedSheets || [];
        const processedWorkbook = state.processedWorkbook || null;

        // Upload
        this.setBadge(
            "badgeUpload",
            hasBothFiles ? "Sẵn sàng" : "Chờ",
            hasBothFiles ? "var(--success)" : ""
        );

        // Review
        this.setBadge(
            "badgeReview",
            `${finalData.length} dòng`,
            finalData.length > 0 ? "var(--success)" : ""
        );

        // Validation
        this.setBadge(
            "badgeValidation",
            `${validationResults.total || 0}`,
            validationResults.error > 0
                ? "var(--danger)"
                : (validationResults.total > 0 ? "var(--success)" : "")
        );

        // Discrepancy
        this.setBadge(
            "badgeDiscrepancy",
            `${discrepancies.length}`,
            discrepancies.length > 0 ? "var(--warning)" : "var(--success)"
        );

        // Process
        const processReady = finalData.length > 0 && selectedSheets.length > 0;

        this.setBadge(
            "badgeProcess",
            processReady ? "Sẵn sàng" : "Chờ",
            processReady ? "var(--success)" : ""
        );

        // Export
        const exportReady = !!processedWorkbook;

        this.setBadge(
            "badgeExport",
            exportReady ? "Sẵn sàng" : "Chờ",
            exportReady ? "var(--success)" : ""
        );
    }

    /* ===============================
       Reset UI
    =============================== */

    resetUI() {
        // File inputs
        const file1Input = Helpers.getElement("file1Input");
        const file2Input = Helpers.getElement("file2Input");

        if (file1Input) file1Input.value = "";
        if (file2Input) file2Input.value = "";

        // File info
        this.setFileInfo("file1Info", "");
        this.setFileInfo("file2Info", "");

        // Upload cards
        this.setUploadCardHasFile("uploadCard1", false);
        this.setUploadCardHasFile("uploadCard2", false);

        // Read section
        this.hideReadSection();
        this.hidePreviewSection();
        this.hideReadProgress();

        // Buttons
        this.setStartReadEnabled(false);
        this.setProcessEnabled(false);
        this.setExportEnabled(false);

        // Sheet list
        const sheetList = Helpers.getElement("sheetList");
        if (sheetList) {
            sheetList.innerHTML = `<p class="empty-state">Chưa có File Đích.</p>`;
        }

        const selectAllSheets = Helpers.getElement("selectAllSheets");
        if (selectAllSheets) selectAllSheets.checked = false;

        // Tables
        this.renderReviewTable([]);
        this.renderDiscrepancies([]);

        // Stats
        this.updateStats({
            rawCount: 0,
            uniqueCount: 0,
            mergedLabels: 0,
            totalQty: 0
        });

        this.updateValidationStats({
            valid: 0,
            warning: 0,
            error: 0,
            total: 0
        });

        this.updateDiscrepancyStats([]);

        this.updateProcessStats({
            total: 0,
            success: 0,
            notFound: 0,
            sheetsProcessed: 0
        });

        this.updateExportStats({
            filledCells: 0,
            sheetsProcessed: 0
        });

        // Process UI
        this.hideProcessStats();
        this.hideProcessProgress();

        // Preview
        const previewGrid = Helpers.getElement("previewGrid");
        if (previewGrid) previewGrid.innerHTML = "";

        // Search / filter
        const searchReview = Helpers.getElement("searchReview");
        const filterStatus = Helpers.getElement("filterStatus");

        if (searchReview) searchReview.value = "";
        if (filterStatus) filterStatus.value = "";
    }
}