// GxP Portal - Main App Logic (with Drag & Drop + Request Modal)

const App = (() => {
    let currentFolder = null;
    let draggedItemId = null;

    // ── Helper: Convert Google Drive links to Direct Link ────────────
    function getDirectDriveLink(url) {
        if (!url || typeof url !== 'string') return url;
        // Case: full Drive URL (view or edit)
        if (url.includes('drive.google.com/file/d/')) {
            const match = url.match(/\/file\/d\/([^/]+)/);
            if (match && match[1]) return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
        }
        // Case: share short link
        if (url.includes('drive.google.com/open?id=')) {
            const match = url.match(/id=([^&]+)/);
            if (match && match[1]) return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
        }
        // Case: raw ID (numeric/alphanumeric)
        if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
            return `https://lh3.googleusercontent.com/u/0/d/${url}`;
        }
        return url;
    }

    // ══════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════
    function render(searchTerm = '') {
        const grid = document.getElementById('items-grid');
        grid.innerHTML = '';
        // Remove drag-over state from grid
        grid.classList.remove('drag-over-root');

        const isAdmin = Auth.isAdmin();
        const group = Auth.getGroup();
        let items = currentFolder
            ? Store.getChildren(currentFolder)
            : Store.getRootItems();

        if (!isAdmin) {
            items = items.filter(item => item.groups.includes(group));
            items = items.filter(item => item.status !== 'inactive');
        }

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.title.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q)
            );
        }

        if (items.length === 0) {
            grid.innerHTML = `
        <div class="no-results">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#9e9e9e"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <p>Không tìm thấy kết quả nào</p>
        </div>`;
            return;
        }

        items.forEach((item, idx) => {
            const card = createCard(item, isAdmin);
            card.style.animationDelay = `${idx * 0.04}s`;
            grid.appendChild(card);
        });

        // Admin drag: set root grid as drop zone when inside a folder modal
        if (isAdmin && !currentFolder) {
            makeDrop(grid, null); // root drop zone
        }
    }

    // ══════════════════════════════════════════
    // CREATE CARD
    // ══════════════════════════════════════════
    function createCard(item, isAdmin) {
        const card = document.createElement('div');
        card.className = `card status-${item.status}`;
        card.dataset.id = item.id;

        // ── Thumbnail ─────────────────────────
        let thumbHTML = '';
        if (item.type === 'folder') {
            thumbHTML = `<div class="card-thumb folder-thumb" data-folder-target="${item.id}"><span class="folder-icon-svg">📁</span></div>`;
        } else if (item.type === 'note') {
            thumbHTML = `<div class="card-thumb note-thumb"><span class="note-icon-svg">📄</span></div>`;
        } else if (item.thumbnail) {
            const imgSrc = item.thumbnail.startsWith('http')
                ? getDirectDriveLink(item.thumbnail)
                : `https://drive.google.com/thumbnail?id=${item.thumbnail}&sz=w400`;
            thumbHTML = `<div class="card-thumb"><img src="${imgSrc}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;\\'>🔗</span>'"></div>`;
        } else {
            thumbHTML = `<div class="card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:3rem;">🔗</div>`;
        }

        // ── Ribbons ───────────────────────────
        const ribbonHTML = item.status === 'testing'
            ? `<div class="status-ribbon">TESTING MODE</div>` : '';

        // ── Pending request badge (non-admin, link type) ─────────────────
        let pendingReqHTML = '';
        if (!isAdmin && item.type === 'link') {
            pendingReqHTML = `<button class="card-suggest-btn" onclick="App.openRequestModal('${item.id}');event.stopPropagation();" title="Đề xuất link mới">📩 Đề xuất link mới</button>`;
        }

        // ── Admin overlays ────────────────────
        let adminHTML = '';
        if (isAdmin) {
            const chips = item.groups.map(g => {
                const cls = g.toLowerCase().replace(/\s+/g, '-');
                const short = g === 'Development' ? 'DEV' : g.toUpperCase();
                return `<span class="group-chip ${cls}">${short}</span>`;
            }).join('');

            // Check pending requests count for this item
            const pendingCount = item.type === 'link'
                ? Store.getRequestsForItem(item.id).filter(r => r.status === 'pending').length : 0;
            const reqBadge = pendingCount > 0
                ? `<span class="card-req-badge" title="${pendingCount} yêu cầu đổi link đang chờ">${pendingCount}</span>` : '';

            adminHTML = `
        <div class="admin-card-header">
          <div class="group-chips">${chips}</div>
          <div class="card-action-btns">
            ${reqBadge}
            <button class="card-btn edit" title="Chỉnh sửa" onclick="AdminPanel.openEdit('${item.id}');event.stopPropagation();">✏️</button>
            <button class="card-btn delete" title="Xóa" onclick="AdminPanel.confirmDelete('${item.id}');event.stopPropagation();">🗑️</button>
          </div>
        </div>`;
        }

        const descStyle = item.status === 'testing' ? 'color:var(--testing-color)' : '';

        card.innerHTML = `
      ${thumbHTML}
      ${ribbonHTML}
      ${adminHTML}
      <div class="card-body">
        <div class="card-title">${item.title}</div>
        <div class="card-desc" style="${descStyle}">${item.description}</div>
        ${pendingReqHTML}
      </div>`;


        // ── Click ─────────────────────────────
        card.addEventListener('click', () => handleCardClick(item));

        // ── Drag & Drop (admin only) ──────────
        if (isAdmin) {
            card.draggable = true;
            card.addEventListener('dragstart', e => onDragStart(e, item.id, card));
            card.addEventListener('dragend', e => onDragEnd(card));

            // Sorting logic for ALL cards
            makeSortable(card, item.id);

            // Special drop zone for folders (move inside)
            if (item.type === 'folder') {
                const thumb = card.querySelector('.folder-thumb');
                if (thumb) makeDrop(thumb, item.id);
            }
        }

        return card;
    }

    // ── Card click ──────────────────────────────────────────────────────
    function handleCardClick(item) {
        if (draggedItemId) return; // suppress click during drag
        if (item.type === 'folder') openFolder(item);
        else if (item.type === 'note') openNote(item);
        else if (item.type === 'link' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    }

    // ══════════════════════════════════════════
    // DRAG & DROP
    // ══════════════════════════════════════════
    function onDragStart(e, id, card) {
        draggedItemId = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setTimeout(() => card.classList.add('dragging'), 0);
        // Show root drop banner if we're inside a folder modal
        if (currentFolder) showRootDropBanner();
    }

    function onDragEnd(card) {
        card.classList.remove('dragging');
        draggedItemId = null;
        document.querySelectorAll('.drag-over, .sort-before, .sort-after, .drag-over-folder').forEach(el =>
            el.classList.remove('drag-over', 'sort-before', 'sort-after', 'drag-over-folder'));
        hideRootDropBanner();
    }

    function makeSortable(el, itemId) {
        el.addEventListener('dragover', e => {
            if (!draggedItemId || draggedItemId === itemId) return;
            e.preventDefault();
            e.stopPropagation();

            const rect = el.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            if (e.clientX < midpoint) {
                el.classList.add('sort-before');
                el.classList.remove('sort-after');
            } else {
                el.classList.add('sort-after');
                el.classList.remove('sort-before');
            }
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('sort-before', 'sort-after');
        });

        el.addEventListener('drop', e => {
            if (!draggedItemId || draggedItemId === itemId) return;
            e.preventDefault();
            e.stopPropagation();

            const isBefore = el.classList.contains('sort-before');
            el.classList.remove('sort-before', 'sort-after');

            Store.reorderItem(draggedItemId, itemId, isBefore);
            render();
            AdminPanel.showToast('📑 Đã sắp xếp lại vị trí');
        });
    }

    function makeDrop(el, targetFolderId) {
        el.addEventListener('dragover', e => {
            if (!draggedItemId || draggedItemId === (el.dataset && el.dataset.id)) return;

            // To allow moving inside, we override sorting if mouse is over the thumb
            e.preventDefault();
            e.stopPropagation();

            e.dataTransfer.dropEffect = 'move';
            el.classList.add('drag-over');
            const parentCard = el.closest('.card');
            if (parentCard) parentCard.classList.add('drag-over-folder');
        });

        el.addEventListener('dragleave', e => {
            if (!el.contains(e.relatedTarget)) {
                el.classList.remove('drag-over');
                const parentCard = el.closest('.card');
                if (parentCard) parentCard.classList.remove('drag-over-folder');
            }
        });

        el.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('drag-over');
            const parentCard = el.closest('.card');
            if (parentCard) parentCard.classList.remove('drag-over-folder');

            const movedId = e.dataTransfer.getData('text/plain') || draggedItemId;
            if (!movedId || movedId === targetFolderId) return;

            // Prevent circular drop
            if (targetFolderId) {
                const target = Store.getById(targetFolderId);
                let p = target;
                while (p) {
                    if (p.id === movedId) return;
                    p = p.parentId ? Store.getById(p.parentId) : null;
                }
            }

            const movedItem = Store.getById(movedId);
            if (!movedItem) return;

            const oldLabel = movedItem.parentId ? `folder "${Store.getById(movedItem.parentId)?.title}"` : 'Root';
            const newLabel = targetFolderId ? `folder "${Store.getById(targetFolderId)?.title}"` : 'Root';
            Store.updateItem(movedId, { parentId: targetFolderId });

            if (targetFolderId === null) {
                // Dropped to root → close folder modal, go back to root view
                currentFolder = null;
                document.getElementById('modal-folder').classList.add('hidden');
                render();
            } else {
                // Dropped into a folder card → refresh main grid
                render();
                // If we're in a folder modal, refresh it too
                if (currentFolder) {
                    const folderItem = Store.getById(currentFolder);
                    if (folderItem) openFolder(folderItem);
                }
            }

            AdminPanel.showToast(`📁 Di chuyển "${movedItem.title}": ${oldLabel} → ${newLabel}`);
            hideRootDropBanner();
            draggedItemId = null;

        });
    }

    function showRootDropBanner() {
        const existing = document.getElementById('root-drop-banner');
        if (existing) return;
        const banner = document.createElement('div');
        banner.id = 'root-drop-banner';
        banner.className = 'root-drop-banner';
        banner.innerHTML = `<span>📤 Kéo vào đây để đưa ra <strong>Trang chủ (Root)</strong></span>`;
        makeDrop(banner, null);
        const grid = document.getElementById('items-grid');
        grid.prepend(banner);
    }

    function hideRootDropBanner() {
        const b = document.getElementById('root-drop-banner');
        if (b) b.remove();
    }

    // ══════════════════════════════════════════
    // FOLDER MODAL
    // ══════════════════════════════════════════
    function openFolder(item) {
        currentFolder = item.id;
        const modal = document.getElementById('modal-folder');
        const title = modal.querySelector('.modal-folder-title');
        const grid = modal.querySelector('.folder-grid');
        const isAdmin = Auth.isAdmin();

        title.innerHTML = `<span class="folder-icon-label">📁</span> ${item.title}`;

        // Admin: inject root drop zone at top of folder modal
        let rootZoneHTML = isAdmin
            ? `<div id="folder-root-zone" class="folder-root-zone">
           <span>📤 Kéo ra đây → <strong>Root</strong></span>
         </div>` : '';
        grid.innerHTML = rootZoneHTML + '<div class="loader"><span></span><span></span><span></span></div>';
        modal.classList.remove('hidden');

        if (isAdmin) {
            // Setup root drop zone inside folder modal
            setTimeout(() => {
                const zone = document.getElementById('folder-root-zone');
                if (zone) makeDrop(zone, null);
            }, 50);
        }

        setTimeout(() => {
            const loader = grid.querySelector('.loader');
            if (loader) loader.remove();

            const group = Auth.getGroup();
            let children = Store.getChildren(item.id);
            if (!isAdmin) {
                children = children.filter(c => c.groups.includes(group));
                children = children.filter(c => c.status !== 'inactive');
            }

            if (children.length === 0) {
                grid.innerHTML += '<p style="color:#9e9e9e;font-size:0.88rem;padding:20px">Folder trống</p>';
                return;
            }
            children.forEach((child, idx) => {
                const card = createCard(child, isAdmin);
                card.style.animationDelay = `${idx * 0.05}s`;
                grid.appendChild(card);
            });
        }, 80);
    }

    function closeFolder() {
        currentFolder = null;
        document.getElementById('modal-folder').classList.add('hidden');
        hideRootDropBanner();
    }

    // ══════════════════════════════════════════
    // NOTE MODAL
    // ══════════════════════════════════════════
    function openNote(item) {
        const modal = document.getElementById('modal-note');
        modal.querySelector('.modal-note-title').textContent = item.title;
        modal.querySelector('.note-content').innerHTML = item.content || '<p style="color:#9e9e9e">Chưa có nội dung</p>';
        modal.classList.remove('hidden');
    }

    function closeNote() {
        document.getElementById('modal-note').classList.add('hidden');
    }

    // ══════════════════════════════════════════
    // LINK REQUEST MODAL (User side)
    // ══════════════════════════════════════════
    function openRequestModal(itemId) {
        const item = Store.getById(itemId);
        if (!item) return;
        const modal = document.getElementById('modal-request');
        modal.querySelector('.req-item-name').textContent = item.title;
        modal.querySelector('.req-current-url').textContent = item.url || '(chưa có URL)';
        modal.querySelector('#req-new-url').value = '';
        modal.querySelector('#req-note').value = '';
        modal.querySelector('.req-error').classList.remove('show');
        modal.dataset.itemId = itemId;
        modal.classList.remove('hidden');
    }

    function submitRequest() {
        const modal = document.getElementById('modal-request');
        const itemId = modal.dataset.itemId;
        const newUrl = modal.querySelector('#req-new-url').value.trim();
        const note = modal.querySelector('#req-note').value.trim();
        const errEl = modal.querySelector('.req-error');

        if (!newUrl || !newUrl.startsWith('http')) {
            errEl.textContent = '❌ Vui lòng nhập URL hợp lệ (bắt đầu bằng http...)';
            errEl.classList.add('show');
            return;
        }
        Store.addRequest(itemId, newUrl, note);
        modal.classList.add('hidden');
        AdminPanel.showToast('📩 Đề xuất đã gửi! Admin sẽ xem xét sớm.');
    }

    // ══════════════════════════════════════════
    // INIT & SETUP
    // ══════════════════════════════════════════
    async function init() {
        // Show a temporary loading state if needed
        console.log("App: Initializing with Firebase...");
        
        // Wait for all services to sync with Firebase
        await Promise.all([
            Store.initFirestore(),
            Auth.initFirestore(),
            AdminPanel.initFirestore()
        ]);
        
        applyThemeSettings();
        const group = Auth.getGroup();
        if (!group) { showGroupSelector(); return; }
        showApp();
        updateUserBadge();
        if (Auth.isAdmin()) {
            document.getElementById('admin-toolbar').classList.remove('hidden');
            document.getElementById('app-header').classList.add('admin-header');
            AdminPanel.updateRequestBadge();
        }
        render();
    }

    function showGroupSelector() {
        document.getElementById('group-selector-screen').style.display = 'flex';
        document.getElementById('app-main').style.display = 'none';
        renderGroupButtons();
    }

    function renderGroupButtons() {
        const container = document.getElementById('group-btns-container');
        const groups = ['QA', 'Kho', 'Development', ...Store.getItems().flatMap(i => i.groups)];
        const allGroups = [...new Set(groups)];
        const icons = { 'QA': '🔬', 'Kho': '📦', 'Development': '💻' };
        container.innerHTML = allGroups.map(g => `
      <button class="group-btn" onclick="App.selectGroup('${g}')">
        <span class="group-icon">${icons[g] || '👥'}</span> ${g}
      </button>`).join('');
    }

    let pendingGroupStr = null;

    function selectGroup(group) {
        if (Auth.hasGroupPassword(group) && !Auth.isAdmin()) {
            pendingGroupStr = group;
            openGroupLoginModal(group);
        } else {
            _performLogin(group);
        }
    }

    function _performLogin(group) {
        Auth.setGroup(group);
        document.getElementById('group-selector-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'block';
        updateUserBadge();
        render();
        addRippleToButtons();
    }

    function openGroupLoginModal(group) {
        const modal = document.getElementById('modal-group-login');
        modal.classList.remove('hidden');
        document.getElementById('group-login-desc').textContent = `Nhóm ${group} yêu cầu mật khẩu truy cập.`;
        document.getElementById('group-password-input').value = '';
        document.getElementById('group-login-error').classList.remove('show');
        setTimeout(() => document.getElementById('group-password-input').focus(), 100);
    }

    function submitGroupLogin() {
        if (!pendingGroupStr) return;
        const input = document.getElementById('group-password-input');
        const err = document.getElementById('group-login-error');
        if (Auth.verifyGroupPassword(pendingGroupStr, input.value)) {
            document.getElementById('modal-group-login').classList.add('hidden');
            _performLogin(pendingGroupStr);
            pendingGroupStr = null;
        } else {
            err.classList.add('show');
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 600);
        }
    }

    function showApp() {
        document.getElementById('group-selector-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'flex';
    }

    function updateUserBadge() {
        const isAdmin = Auth.isAdmin();
        const g = Auth.getGroup();
        const icons = { 'QA': '🔬', 'Kho': '📦', 'Development': '💻' };
        const el = document.getElementById('user-badge');
        if (el) {
            if (isAdmin) {
                el.querySelector('.user-badge-text').textContent = 'Admin';
                el.querySelector('.user-icon').textContent = '⚙️';
            } else {
                el.querySelector('.user-badge-text').textContent = g || '';
                el.querySelector('.user-icon').textContent = icons[g] || '👤';
            }
        }
    }

    function setAdminHeaderMode(on) {
        const header = document.getElementById('app-header');
        if (on) header.classList.add('admin-header');
        else header.classList.remove('admin-header');
        updateUserBadge();
    }

    // ══════════════════════════════════════════
    // THEME & BACKGROUND MANAGER
    // ══════════════════════════════════════════
    function getThemeSettings() {
        const defaultSettings = {
            color: '#0d1b2a',
            bgImage: '',
            opacity: '100',
            size: 'cover',
            blobs: true
        };
        try {
            const saved = localStorage.getItem('gxp_theme_settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch { return defaultSettings; }
    }

    function applyLiveTheme(color, bgImage, opacity, size, blobs) {
        document.body.style.backgroundColor = color;
        const layer = document.getElementById('custom-bg-layer');
        if (layer) {
            if (bgImage) {
                // If it's a URL or base64 or relative path
                const processedUrl = getDirectDriveLink(bgImage);
                layer.style.backgroundImage = `url("${processedUrl}")`;
                layer.style.opacity = (opacity / 100).toString();
                layer.style.backgroundSize = size === 'auto' ? 'auto' : size;
            } else {
                layer.style.backgroundImage = 'none';
                layer.style.opacity = '0';
            }
        }
        const blobsEl = document.getElementById('ambient-blobs');
        if (blobsEl) {
            blobsEl.style.display = blobs ? 'block' : 'none';
        }
    }

    function applyThemeSettings() {
        const s = getThemeSettings();
        applyLiveTheme(s.color, s.bgImage, s.opacity, s.size, s.blobs);
    }

    function changeGroup() {
        if (Auth.isAdmin()) {
            Auth.logout();
            document.getElementById('admin-toolbar').classList.add('hidden');
            setAdminHeaderMode(false);
        }
        Auth.clearGroup();
        showGroupSelector();
    }

    function onGearClick() {
        if (Auth.isAdmin()) return;
        openLoginModal();
    }

    function openLoginModal() {
        const modal = document.getElementById('modal-login');
        modal.classList.remove('hidden');
        modal.querySelector('#admin-password-input').value = '';
        modal.querySelector('.error-msg').classList.remove('show');
        setTimeout(() => modal.querySelector('#admin-password-input').focus(), 100);
    }

    function submitAdminLogin() {
        const input = document.getElementById('admin-password-input');
        const errEl = document.querySelector('#modal-login .error-msg');
        if (Auth.verifyAdminPassword(input.value)) {
            Auth.setAdmin(true);
            document.getElementById('modal-login').classList.add('hidden');
            document.getElementById('admin-toolbar').classList.remove('hidden');
            setAdminHeaderMode(true);
            AdminPanel.updateRequestBadge();
            render();
        } else {
            errEl.classList.add('show');
            input.classList.add('error');
            input.value = '';
            setTimeout(() => input.classList.remove('error'), 600);
        }
    }

    function adminLogout() {
        Auth.logout();
        document.getElementById('admin-toolbar').classList.add('hidden');
        setAdminHeaderMode(false);
        render();
    }

    function addRippleToButtons() {
        document.querySelectorAll('.btn, .toolbar-btn, .group-btn').forEach(btn => {
            if (btn.dataset.rippled) return;
            btn.dataset.rippled = true;
            btn.addEventListener('click', function (e) {
                const r = document.createElement('span');
                r.className = 'ripple-effect';
                const rect = this.getBoundingClientRect();
                r.style.left = `${e.clientX - rect.left}px`;
                r.style.top = `${e.clientY - rect.top}px`;
                this.appendChild(r);
                r.addEventListener('animationend', () => r.remove());
            });
        });
    }

    function setupModalDismiss() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    overlay.classList.add('hidden');
                    if (overlay.id === 'modal-folder') closeFolder();
                    if (overlay.id === 'modal-note') closeNote();
                }
            });
        });
    }

    function setupKeyboard() {
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
                    m.classList.add('hidden');
                    if (m.id === 'modal-folder') currentFolder = null;
                });
                hideRootDropBanner();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
        });
    }

    return {
        init, render, selectGroup, changeGroup,
        openNote, closeNote, openFolder, closeFolder,
        openRequestModal, submitRequest,
        onGearClick, openLoginModal, submitAdminLogin, adminLogout, submitGroupLogin,
        addRippleToButtons, setupModalDismiss, setupKeyboard,
        getThemeSettings, applyThemeSettings, applyLiveTheme
    };
})();


// ── Bootstrap ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    App.setupModalDismiss();
    App.setupKeyboard();
    App.addRippleToButtons();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => App.render(e.target.value));
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') App.render(e.target.value); });
    }
    const pwInput = document.getElementById('admin-password-input');
    if (pwInput) {
        pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') App.submitAdminLogin(); });
    }
    const grPassInput = document.getElementById('group-password-input');
    if (grPassInput) {
        grPassInput.addEventListener('keydown', e => { if (e.key === 'Enter') App.submitGroupLogin(); });
    }
});
