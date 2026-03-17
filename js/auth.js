// GxP Portal - Auth & Session Management

const Auth = (() => {
    const STORAGE_KEYS = {
        GROUP: 'gxp_user_group',
        ADMIN_PASS: 'gxp_admin_password',
        ADMIN_SESSION: 'gxp_admin_session',
        GROUP_PASSWORDS: 'gxp_group_passwords'
    };

    // ── Public API ──────────────────────────────────────────────────────
    let _currentGroup = null;

    async function initFirestore() {
        const data = await FirebaseService.loadAllData();
        const settings = data.settings || {};
        
        if (settings.admin_password) {
            localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, settings.admin_password);
        }
        if (settings.group_passwords) {
            localStorage.setItem(STORAGE_KEYS.GROUP_PASSWORDS, JSON.stringify(settings.group_passwords));
        }

        FirebaseService.onChange(FirebaseService.PATHS.ADMIN_PASS, (val) => {
            if (val) localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, val);
        });

        FirebaseService.onChange(FirebaseService.PATHS.GROUP_PASSWORDS, (val) => {
            if (val) {
                localStorage.setItem(STORAGE_KEYS.GROUP_PASSWORDS, JSON.stringify(val));
            } else {
                localStorage.removeItem(STORAGE_KEYS.GROUP_PASSWORDS);
            }
        });
    }

    function getGroup() {
        return _currentGroup;
    }

    function setGroup(group) {
        _currentGroup = group;
    }

    function clearGroup() {
        _currentGroup = null;
    }

    function isAdmin() {
        return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
    }

    function setAdmin(val) {
        if (val) {
            sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
        } else {
            sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
        }
    }

    function getAdminPassword() {
        return localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || DEFAULT_ADMIN_PASSWORD;
    }

    function setAdminPassword(newPass) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, newPass);
        FirebaseService.set(FirebaseService.PATHS.ADMIN_PASS, newPass);
    }

    function verifyAdminPassword(input) {
        return input === getAdminPassword();
    }

    function getGroupPasswordsMap() {
        const raw = localStorage.getItem(STORAGE_KEYS.GROUP_PASSWORDS);
        return raw ? JSON.parse(raw) : {};
    }

    function setGroupPassword(group, newPass) {
        const map = getGroupPasswordsMap();
        if (newPass) {
            map[group] = newPass;
        } else {
            delete map[group]; // remove password
        }
        localStorage.setItem(STORAGE_KEYS.GROUP_PASSWORDS, JSON.stringify(map));
        FirebaseService.set(FirebaseService.PATHS.GROUP_PASSWORDS, map);
    }

    function verifyGroupPassword(group, input) {
        const map = getGroupPasswordsMap();
        // If no password is set, we bypass it
        if (!map[group]) return true;
        return input === map[group];
    }

    function hasGroupPassword(group) {
        return !!getGroupPasswordsMap()[group];
    }

    function logout() {
        setAdmin(false);
    }

    return {
        initFirestore,
        getGroup,
        setGroup,
        clearGroup,
        isAdmin,
        setAdmin,
        getAdminPassword,
        setAdminPassword,
        verifyAdminPassword,
        setGroupPassword,
        verifyGroupPassword,
        hasGroupPassword,
        logout
    };

})();
