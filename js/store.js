// GxP Portal - Data Store (CRUD + Firebase Sync)

const Store = (() => {
    const KEYS = {
        ITEMS: 'gxp_items',
        HISTORY: 'gxp_history',
        REQUESTS: 'gxp_link_requests'
    };

    let _items = [];
    let _history = [];
    let _requests = [];

    // ── Sync with Firebase ──────────────────────────────────────────────
    async function initFirestore() {
        const data = await FirebaseService.loadAllData();
        
        // Items
        if (data.items) {
            _items = Object.values(data.items);
            localStorage.setItem(KEYS.ITEMS, JSON.stringify(_items));
        } else {
            _items = JSON.parse(localStorage.getItem(KEYS.ITEMS)) || JSON.parse(JSON.stringify(DEFAULT_ITEMS));
            FirebaseService.set(FirebaseService.PATHS.ITEMS, _items);
        }

        // History
        if (data.history) {
            _history = Object.values(data.history);
        }

        // Requests
        if (data.requests) {
            _requests = Object.values(data.requests);
        }

        // Listen for remote updates
        FirebaseService.onChange(FirebaseService.PATHS.ITEMS, (val) => {
            if (val) {
                _items = Object.values(val);
                localStorage.setItem(KEYS.ITEMS, JSON.stringify(_items));
                if (typeof App !== 'undefined' && App.render) App.render();
            }
        });

        FirebaseService.onChange(FirebaseService.PATHS.REQUESTS, (val) => {
            if (val) {
                _requests = Object.values(val);
                if (typeof AdminPanel !== 'undefined' && AdminPanel.updateRequestBadge) AdminPanel.updateRequestBadge();
            }
        });
    }

    // ══════════════════════════════════════════
    // ITEMS
    // ══════════════════════════════════════════
    function getItems() {
        return _items;
    }

    function saveItems(items) {
        _items = items;
        localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
        FirebaseService.set(FirebaseService.PATHS.ITEMS, items);
    }

    function getById(id) {
        return getItems().find(i => i.id === id) || null;
    }

    function getChildren(parentId) {
        return getItems()
            .filter(i => i.parentId === parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    function getRootItems() {
        return getItems()
            .filter(i => !i.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    function getFolders(excludeId = null) {
        return getItems().filter(i => i.type === 'folder' && i.id !== excludeId);
    }

    function addItem(item) {
        const items = [...getItems()];
        item.id = 'item-' + Date.now();
        item.urlHistory = [];
        item.changeLog = [];
        if (item.type === 'link' && item.url) {
            item.urlHistory = [{
                url: item.url,
                activatedAt: new Date().toLocaleString('vi-VN'),
                activatedBy: 'admin',
                note: 'URL khởi tạo'
            }];
        }
        item.changeLog.push(_makeLog('Tạo mới', `Loại: ${item.type}`, 'admin'));
        items.push(item);
        saveItems(items);
        addHistory('Thêm mới', item.title, item.id);
        return item;
    }

    function updateItem(id, data, changedBy = 'admin') {
        const items = [...getItems()];
        const idx = items.findIndex(i => i.id === id);
        if (idx === -1) return null;

        const old = items[idx];
        const changeDetails = [];

        // Track field-level changes
        if (data.title && data.title !== old.title)
            changeDetails.push(`Tên: "${old.title}" → "${data.title}"`);
        if (data.status && data.status !== old.status)
            changeDetails.push(`Trạng thái: ${old.status} → ${data.status}`);
        if (data.parentId !== undefined && data.parentId !== old.parentId) {
            const oldLoc = old.parentId || 'Root';
            const newLoc = data.parentId || 'Root';
            changeDetails.push(`Vị trí: ${oldLoc} → ${newLoc}`);
        }
        if (data.url && data.url !== old.url) {
            changeDetails.push(`URL: ${old.url} → ${data.url}`);
            // Push to urlHistory
            const hist = [...(old.urlHistory || [])];
            hist.unshift({
                url: data.url,
                activatedAt: new Date().toLocaleString('vi-VN'),
                activatedBy: changedBy,
                note: 'Cập nhật thủ công'
            });
            data.urlHistory = hist;
        }

        // Merge change log
        const existingLog = [...(old.changeLog || [])];
        if (changeDetails.length > 0) {
            existingLog.unshift(_makeLog('Cập nhật', changeDetails.join('; '), changedBy));
        }
        data.changeLog = existingLog;

        items[idx] = { ...old, ...data };
        saveItems(items);
        addHistory('Cập nhật', items[idx].title, id);
        return items[idx];
    }

    function deleteItem(id) {
        let items = getItems().filter(i => i.id !== id && i.parentId !== id);
        const item = getById(id);
        saveItems(items);
        if (item) addHistory('Xóa', item.title, id);
    }

    function resetToDefault() {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        defaults.forEach(i => { i.urlHistory = []; i.changeLog = []; });
        saveItems(defaults);
        addHistory('Reset dữ liệu về mặc định', 'All', null);
    }

    // ── URL Version specific ─────────────────────────────────────────────
    function activateUrlVersion(itemId, url, note = '') {
        const items = [...getItems()];
        const idx = items.findIndex(i => i.id === itemId);
        if (idx === -1) return;
        const old = items[idx];
        const hist = [...(old.urlHistory || [])];
        hist.unshift({
            url,
            activatedAt: new Date().toLocaleString('vi-VN'),
            activatedBy: 'admin (reactivate)',
            note: note || 'Kích hoạt lại phiên bản cũ'
        });
        const log = [...(old.changeLog || [])];
        log.unshift(_makeLog('Kích hoạt URL cũ', `URL: ${url}`, 'admin'));
        items[idx] = { ...old, url, urlHistory: hist, changeLog: log };
        saveItems(items);
        addHistory('Kích hoạt URL cũ', old.title, itemId);
    }

    function getUrlHistory(itemId) {
        const item = getById(itemId);
        return item ? (item.urlHistory || []) : [];
    }

    function getItemChangeLog(itemId) {
        const item = getById(itemId);
        return item ? (item.changeLog || []) : [];
    }

    function deleteUrlVersion(itemId, versionIndex) {
        const items = [...getItems()];
        const idx = items.findIndex(i => i.id === itemId);
        if (idx === -1) return;
        const old = items[idx];
        const hist = [...(old.urlHistory || [])];
        // Cannot delete the current active version (index 0)
        if (versionIndex <= 0 || versionIndex >= hist.length) return;
        const removed = hist.splice(versionIndex, 1)[0];
        const log = [...(old.changeLog || [])];
        log.unshift(_makeLog('Xóa phiên bản URL', `URL: ${removed.url}`, 'admin'));
        items[idx] = { ...old, urlHistory: hist, changeLog: log };
        saveItems(items);
    }

    // ══════════════════════════════════════════
    // GLOBAL HISTORY LOG
    // ══════════════════════════════════════════
    function getHistory() {
        return _history;
    }

    function addHistory(action, itemTitle, itemId) {
        const hist = [...getHistory()];
        const entry = {
            action,
            itemTitle,
            itemId,
            time: new Date().toLocaleString('vi-VN'),
            group: (typeof Auth !== 'undefined' && Auth.getGroup) ? Auth.getGroup() : ''
        };
        hist.unshift(entry);
        _history = hist.slice(0, 100);
        FirebaseService.set(FirebaseService.PATHS.HISTORY, _history);
    }

    function _makeLog(action, detail, by) {
        return {
            action,
            detail,
            by,
            time: new Date().toLocaleString('vi-VN')
        };
    }

    // ══════════════════════════════════════════
    // LINK CHANGE REQUESTS
    // ══════════════════════════════════════════
    function getRequests() {
        return _requests;
    }

    function saveRequests(reqs) {
        _requests = reqs;
        FirebaseService.set(FirebaseService.PATHS.REQUESTS, reqs);
    }

    function addRequest(itemId, newUrl, note) {
        const item = getById(itemId);
        if (!item) return null;
        const reqs = [...getRequests()];
        const req = {
            id: 'req-' + Date.now(),
            itemId,
            itemTitle: item.title,
            currentUrl: item.url,
            requestedBy: (typeof Auth !== 'undefined' && Auth.getGroup) ? Auth.getGroup() : 'Unknown',
            newUrl,
            note,
            status: 'pending',
            createdAt: new Date().toLocaleString('vi-VN'),
            reviewedAt: '',
            reviewNote: ''
        };
        reqs.unshift(req);
        saveRequests(reqs);
        return req;
    }

    function approveRequest(reqId, reviewNote = '') {
        const reqs = [...getRequests()];
        const idx = reqs.findIndex(r => r.id === reqId);
        if (idx === -1) return;
        const req = reqs[idx];
        reqs[idx] = {
            ...req,
            status: 'approved',
            reviewedAt: new Date().toLocaleString('vi-VN'),
            reviewNote
        };
        saveRequests(reqs);
        // Apply URL change
        updateItem(req.itemId, { url: req.newUrl }, `request by ${req.requestedBy}`);
        // Annotate history entry
        const items = [...getItems()];
        const iIdx = items.findIndex(i => i.id === req.itemId);
        if (iIdx !== -1) {
            const log = [...(items[iIdx].changeLog || [])];
            log.unshift(_makeLog('Duyệt yêu cầu link', `${req.requestedBy}: ${req.newUrl}`, 'admin'));
            items[iIdx].changeLog = log;
            saveItems(items);
        }
    }

    function rejectRequest(reqId, reviewNote = '') {
        const reqs = [...getRequests()];
        const idx = reqs.findIndex(r => r.id === reqId);
        if (idx !== -1) {
            reqs[idx] = {
                ...reqs[idx],
                status: 'rejected',
                reviewedAt: new Date().toLocaleString('vi-VN'),
                reviewNote
            };
            saveRequests(reqs);
        }
    }

    function getPendingCount() {
        return getRequests().filter(r => r.status === 'pending').length;
    }

    function getRequestsForItem(itemId) {
        return getRequests().filter(r => r.itemId === itemId);
    }

    function reorderItem(movedId, targetId, isBefore) {
        let items = [...getItems()];
        const movedItem = items.find(i => i.id === movedId);
        const targetItem = items.find(i => i.id === targetId);
        if (!movedItem || !targetItem) return;

        // Ensure moved item has the same parent as target
        movedItem.parentId = targetItem.parentId;

        // Get all siblings in new order
        let siblings = items.filter(i => i.parentId === targetItem.parentId && i.id !== movedId);
        siblings.sort((a, b) => (a.order || 0) - (b.order || 0));

        const targetIdx = siblings.findIndex(i => i.id === targetId);
        const insertIdx = isBefore ? targetIdx : targetIdx + 1;

        siblings.splice(insertIdx, 0, movedItem);

        // Update orders for all siblings
        siblings.forEach((s, idx) => {
            const itemInAll = items.find(i => i.id === s.id);
            if (itemInAll) itemInAll.order = idx + 1;
        });

        saveItems(items);
    }

    return {
        initFirestore,
        // Items
        getItems, saveItems, getById, getChildren, getRootItems, getFolders,
        addItem, updateItem, deleteItem, reorderItem, resetToDefault,
        // URL versioning
        activateUrlVersion, getUrlHistory, getItemChangeLog, deleteUrlVersion,
        // History
        getHistory, addHistory,
        // Requests
        getRequests, addRequest, approveRequest, rejectRequest,
        getPendingCount, getRequestsForItem
    };
})();
