// GxP Portal - Firebase Service Core
const FirebaseService = (() => {
    // Cấu hình Firebase của bạn
    const firebaseConfig = {
        apiKey: "AIzaSyALBv-TNf0rBylW7TPECE5V4Jksm3mBcxs",
        authDomain: "hoangduc-portal.firebaseapp.com",
        projectId: "hoangduc-portal",
        storageBucket: "hoangduc-portal.firebasestorage.app",
        messagingSenderId: "178188918249",
        appId: "1:178188918249:web:f384a3ed5d7169ef567f78",
        databaseURL: "https://hoangduc-portal-default-rtdb.asia-southeast1.firebasedatabase.app" // Tự động đoán từ projectId và máy chủ Singapore
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // Các đường dẫn dữ liệu
    const PATHS = {
        ITEMS: 'items',
        HISTORY: 'history',
        REQUESTS: 'requests',
        ADMIN_PASS: 'settings/admin_password',
        GROUP_PASSWORDS: 'settings/group_passwords',
        THEME: 'settings/theme',
        GROUPS: 'settings/groups'
    };

    // ── Hàm tiện ích xử lý Database ──────────────────────────────────────
    
    // Tải dữ liệu ban đầu
    async function loadAllData() {
        return new Promise((resolve) => {
            db.ref().once('value', snapshot => {
                const data = snapshot.val() || {};
                console.log("Firebase: Data loaded");
                resolve(data);
            });
        });
    }

    // Lắng nghe thay đổi (Duy trì tính real-time)
    function onChange(path, callback) {
        db.ref(path).on('value', snapshot => {
            callback(snapshot.val());
        });
    }

    // Lưu/Cập nhật dữ liệu
    async function set(path, data) {
        // Firebase không chấp nhận 'undefined'. Chuyển sang JSON rồi ngược lại để loại bỏ các trường undefined.
        const cleanData = JSON.parse(JSON.stringify(data));
        return db.ref(path).set(cleanData);
    }

    // Đẩy dữ liệu vào danh sách (tạo ID tự động)
    async function push(path, data) {
        const cleanData = JSON.parse(JSON.stringify(data));
        return db.ref(path).push(cleanData);
    }

    return {
        PATHS,
        loadAllData,
        onChange,
        set,
        push,
        db
    };
})();
