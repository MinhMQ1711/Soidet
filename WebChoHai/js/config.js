/* ==========================================================
   CONFIG.JS
   Cấu hình toàn cục cho hệ thống SLM 2026
========================================================== */

const CONFIG = {
    /* ===============================
       Thông tin ứng dụng
    =============================== */
    APP_NAME: "HỆ THỐNG QUẢN LÝ KHO SỢI DỆT",
    APP_VERSION: "2026 PRO MODULAR",

    /* ===============================
       Xác thực / đăng nhập
    =============================== */
    OWNER_PHONE: "0335099905",
    DEFAULT_PASSWORD: "admin1234",
    STORAGE_KEY_PASSWORD: "slm_pass",
    MIN_PASSWORD_LENGTH: 4,

    /* ===============================
       Cấu hình đọc file nguồn
       File BB25: đọc cột B và cột C
       Trong JavaScript:
       - Cột A = 0
       - Cột B = 1
       - Cột C = 2
    =============================== */
    SOURCE_SHEET_INDEX: 0,
    SOURCE_CODE_COLUMN: 1,
    SOURCE_QTY_COLUMN: 2,

    /* ===============================
       Quy tắc phân tích mã sản phẩm
       Ví dụ: TL6203002E
       Base = TL6203
       Đuôi gốc = 2E
    =============================== */
    MIN_CODE_LENGTH: 8,
    BASE_LENGTH: 6,

    /* ===============================
       Cấu hình tìm vị trí trong file đích
    =============================== */
    // Tìm Base trong các cột A, B, C của file đích
    ROW_SEARCH_COLUMNS: [1, 2, 3],

    // Số dòng tối đa để quét header cột trong file đích
    MAX_SCAN_HEADER_ROWS: 20,

    // Số ký tự tối thiểu để một giá trị được xem là Base
    MIN_BASE_LENGTH: 4,

    /* ===============================
       Luật chuẩn hóa cột đích
       
       Yêu cầu của bạn:
       1. File đích không có 2E, mà sẽ có E2.
          Ví dụ: mã TL6203002E -> đuôi 2E -> tìm cột E2.
       
       2. Đuôi 0A, 0B, 0C sẽ được hiểu là cột A, B, C.
          Không cần file đích phải có A0, B0, C0.
    =============================== */
    COLUMN_RULES: {
        // Bỏ qua mã có dấu chấm, ví dụ VG6133.5D
        skipDot: true,

        // Bỏ phần trong ngoặc, ví dụ VK5B08 (A02.4D)
        skipParentheses: true,

        // Nếu đuôi là 0A, 0B, 0C -> chuyển thành A, B, C
        zeroPrefixLetterToLetter: true,

        // Nếu đuôi là 2E -> thử tìm E2
        reverseDigitLetter: true,

        // Nếu không tìm thấy E2, thử tìm nhóm cột bắt đầu bằng E
        fallbackLetterGroup: true,

        // Cho phép khớp A1, A2, A3 khi yêu cầu cột là A
        allowLetterFamilyMatch: true
    },

    /* ===============================
       Regex nhận diện
    =============================== */
    PATTERNS: {
        // Chữ hoặc số, không khoảng trắng
        alphanumeric: /^[A-Z0-9]+$/i,

        // Header file đích dạng A1, A2, B1, C3...
        letterThenNumber: /^([A-Z])(\d{1,3})$/i,

        // Đuôi mã sản phẩm dạng 2E, 3B, 0A...
        numberThenLetter: /^(\d{1,3})([A-Z])$/i,

        // Đuôi đặc biệt: 0A, 0B, 0C...
        zeroLetter: /^0([A-Z])$/i,

        // Chỉ một chữ cái duy nhất: A, B, C...
        singleLetter: /^([A-Z])$/i
    },

    /* ===============================
       Từ khóa nhận diện dòng tiêu đề
       trong file nguồn BB25
    =============================== */
    HEADER_KEYWORDS: [
        "lượt lô",
        "luot lo",
        "mã family",
        "ma family",
        "批号",
        "tồn kho",
        "ton kho",
        "本日",
        "件数",
        "số kiện",
        "so kien",
        "quản lý",
        "quan ly",
        "a.nam",
        "anh nam"
    ],

    /* ===============================
       Log
    =============================== */
    LOG_LIMIT: 800,
    LOG_IDS: {
        main: "logArea",
        process: "processLogArea",
        export: "exportLogArea"
    },

    /* ===============================
       Xuất file
    =============================== */
    EXPORT_FILENAME_PREFIX: "SLM2026_DaTuDien",
    EXPORT_MIME_TYPE: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};