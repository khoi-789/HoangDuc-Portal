// GxP Portal - Admin Panel Logic

const AdminPanel = (() => {
    let pendingDeleteId = null;

    // ══════════════════════════════════════════
    // REQUEST BADGE (toolbar)
    // ══════════════════════════════════════════
    function updateRequestBadge() {
        const count = Store.getPendingCount();
        const badge = document.getElementById('req-count-badge');
        if (badge) {
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
        const btn = document.getElementById('btn-req-manager');
        if (btn) btn.classList.toggle('has-pending', count > 0);
    }

    // ══════════════════════════════════════════
    // REQUEST MANAGER MODAL (Admin side)
    // ══════════════════════════════════════════
    function openRequestManager() {
        const modal = document.getElementById('modal-req-manager');
        renderRequestList();
        modal.classList.remove('hidden');
    }

    function renderRequestList() {
        const container = document.querySelector('#modal-req-manager .req-manager-list');
        const allReqs = Store.getRequests();

        if (allReqs.length === 0) {
            container.innerHTML = '<p style="color:#9e9e9e;text-align:center;padding:30px">Chưa có yêu cầu nào</p>';
            return;
        }

        const statusLabel = { pending: '⏳ Chờ duyệt', approved: '✅ Đã duyệt', rejected: '❌ Từ chối' };
        const statusClass = { pending: 'req-pending', approved: 'req-approved', rejected: 'req-rejected' };

        container.innerHTML = allReqs.map(r => `
      <div class="req-item ${statusClass[r.status] || ''}">
        <div class="req-item-top">
          <span class="req-item-title">🔗 ${r.itemTitle}</span>
          <span class="req-status-tag ${statusClass[r.status]}">${statusLabel[r.status] || r.status}</span>
        </div>
        <div class="req-item-body">
          <div class="req-url-row"><span class="req-label">URL cũ:</span><span class="req-url">${r.currentUrl || '—'}</span></div>
          <div class="req-url-row"><span class="req-label">URL mới:</span><a href="${r.newUrl}" target="_blank" class="req-url req-url-new">${r.newUrl}</a></div>
          ${r.note ? `<div class="req-url-row"><span class="req-label">Lý do:</span><span>${r.note}</span></div>` : ''}
          <div class="req-url-row"><span class="req-label">Người đề xuất:</span><span>${r.requestedBy}</span> &nbsp;·&nbsp; <span class="req-time">${r.createdAt}</span></div>
          ${r.reviewedAt ? `<div class="req-url-row"><span class="req-label">Xem xét lúc:</span><span class="req-time">${r.reviewedAt}</span></div>` : ''}
          ${r.reviewNote ? `<div class="req-url-row"><span class="req-label">Ghi chú admin:</span><span>${r.reviewNote}</span></div>` : ''}
        </div>
        ${r.status === 'pending' ? `
        <div class="req-item-actions">
          <input class="form-control req-review-note" placeholder="Ghi chú (tuỳ chọn)" id="rnote-${r.id}" style="flex:1;font-size:0.8rem;padding:7px 10px">
          <button class="btn btn-save" style="padding:7px 14px;font-size:0.8rem" onclick="AdminPanel.approveReq('${r.id}')">✅ Duyệt</button>
          <button class="btn btn-danger" style="padding:7px 14px;font-size:0.8rem" onclick="AdminPanel.rejectReq('${r.id}')">❌ Từ chối</button>
        </div>` : ''}
      </div>`).join('');
    }

    function approveReq(reqId) {
        const note = (document.getElementById(`rnote-${reqId}`) || {}).value || '';
        Store.approveRequest(reqId, note);
        renderRequestList();
        updateRequestBadge();
        App.render();
        showToast('✅ Đã duyệt — URL đã được cập nhật!');
    }

    function rejectReq(reqId) {
        const note = (document.getElementById(`rnote-${reqId}`) || {}).value || '';
        Store.rejectRequest(reqId, note);
        renderRequestList();
        updateRequestBadge();
        showToast('❌ Đã từ chối yêu cầu');
    }

    // ══════════════════════════════════════════
    // GROUP MANAGER
    // ══════════════════════════════════════════
    function openGroupManager() {
        const modal = document.getElementById('modal-groups');
        renderGroupList();
        modal.classList.remove('hidden');
    }

    function renderGroupList() {
        const list = document.querySelector('#modal-groups .group-manager-list');
        const allGroups = getAllGroups();
        list.innerHTML = allGroups.map(g => {
            const hasPass = Auth.hasGroupPassword(g);
            return `
      <div class="group-manager-item">
        <span class="g-name">👥 ${g} ${hasPass ? '<span style="font-size:0.75rem;color:#4CAF50" title="Đã cài pass">🔒</span>' : ''}</span>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-save" style="padding:4px 8px;font-size:0.75rem" onclick="AdminPanel.promptResetGroupPass('${g}')">🔑 Pass</button>
          <button class="g-delete" onclick="AdminPanel.deleteGroup('${g}')">Xóa</button>
        </div>
      </div>`;
        }).join('');
    }

    function getAllGroups() {
        const stored = localStorage.getItem('gxp_groups');
        return stored ? JSON.parse(stored) : [...DEFAULT_GROUPS];
    }

    function saveGroups(groups) { localStorage.setItem('gxp_groups', JSON.stringify(groups)); }

    function addGroup() {
        const input = document.getElementById('new-group-input');
        const name = input.value.trim();
        if (!name) return;
        const groups = getAllGroups();
        if (!groups.includes(name)) { groups.push(name); saveGroups(groups); renderGroupList(); }
        input.value = '';
    }

    function deleteGroup(name) {
        saveGroups(getAllGroups().filter(g => g !== name));
        renderGroupList();
    }

    // ══════════════════════════════════════════
    // PASS NHOM
    // ══════════════════════════════════════════
    function openPassGroup() {
        const modal = document.getElementById('modal-passgroup');
        modal.querySelector('#new-pass-input').value = '';
        modal.querySelector('#confirm-pass-input').value = '';
        const err = modal.querySelector('.pass-error');
        if (err) err.classList.remove('show');
        modal.classList.remove('hidden');
    }

    function submitNewPassword() {
        const p1 = document.getElementById('new-pass-input').value;
        const p2 = document.getElementById('confirm-pass-input').value;
        const err = document.querySelector('#modal-passgroup .pass-error');
        if (!p1 || p1.length < 4) { showError(err, 'Mật khẩu phải có ít nhất 4 ký tự'); return; }
        if (p1 !== p2) { showError(err, 'Mật khẩu xác nhận không khớp'); return; }
        Auth.setAdminPassword(p1);
        document.getElementById('modal-passgroup').classList.add('hidden');
        showToast('✅ Đổi mật khẩu thành công!');
    }

    function promptResetGroupPass(group) {
        const currentPass = Auth.hasGroupPassword(group) ? "đã cài" : "chưa cài";
        const newPass = prompt(
            `Cài đặt mật khẩu cho nhóm: ${group}\nNhập mật khẩu mới (hoặc để trống để XÓA mật khẩu):`
        );
        if (newPass === null) return; // User cancelled
        if (newPass.trim() === "") {
            Auth.setGroupPassword(group, null);
            showToast(`✅ Đã gỡ mật khẩu nhóm ${group}`);
        } else {
            Auth.setGroupPassword(group, newPass.trim());
            showToast(`✅ Mật khẩu ${group} đã được cập nhật`);
        }
        renderGroupList(); // Refresh to show/hide 🔒 icon
    }

    // ══════════════════════════════════════════
    // ADD / EDIT MODAL (with tabs)
    // ══════════════════════════════════════════
    function openAdd() {
        const modal = document.getElementById('modal-edit');
        modal.querySelector('.modal-edit-title').textContent = 'Thêm công cụ mới';
        clearEditForm();
        populateFolderSelect(null, null);
        populateGroupCheckboxes(null);
        switchEditTab('info');
        // Hide history tab for new items
        document.getElementById('tab-history-btn').style.display = 'none';
        modal.dataset.editingId = '';
        modal.classList.remove('hidden');
    }

    function openEdit(id) {
        const item = Store.getById(id);
        if (!item) return;
        const modal = document.getElementById('modal-edit');
        modal.querySelector('.modal-edit-title').textContent = 'Cập nhật thông tin';
        modal.dataset.editingId = id;

        document.getElementById('edit-type').value = item.type;
        document.getElementById('edit-title').value = item.title;
        document.getElementById('edit-url').value = item.url || '';
        document.getElementById('edit-thumb').value = item.thumbnail || '';
        document.getElementById('edit-desc').value = item.description || '';
        document.getElementById('edit-status').value = item.status;
        document.getElementById('edit-content').value = item.content || '';

        populateFolderSelect(item.parentId, id);
        populateGroupCheckboxes(item.groups);
        handleTypeChange();

        // Show history tab and render it
        document.getElementById('tab-history-btn').style.display = '';
        switchEditTab('info'); // default to info
        renderItemHistory(id);

        modal.classList.remove('hidden');
    }

    function switchEditTab(tab) {
        const infoTab = document.getElementById('edit-tab-info');
        const histTab = document.getElementById('edit-tab-history');
        const infoBtn = document.getElementById('tab-info-btn');
        const histBtn = document.getElementById('tab-history-btn');

        if (tab === 'info') {
            infoTab.style.display = '';
            histTab.style.display = 'none';
            infoBtn.classList.add('tab-active');
            histBtn.classList.remove('tab-active');
        } else {
            infoTab.style.display = 'none';
            histTab.style.display = '';
            infoBtn.classList.remove('tab-active');
            histBtn.classList.add('tab-active');
        }
    }

    // ── Item History rendering ─────────────────────────────────────────
    function renderItemHistory(id) {
        const item = Store.getById(id);
        if (!item) return;

        // URL version history (link type only)
        const urlSection = document.getElementById('edit-url-versions');
        if (urlSection) {
            if (item.type === 'link') {
                const urlHistory = Store.getUrlHistory(id);
                const currentUrl = item.url;

                if (urlHistory.length <= 1) {
                    urlSection.innerHTML = '<p style="color:#9e9e9e;font-size:0.82rem">Chưa có phiên bản URL nào.</p>';
                } else {
                    urlSection.innerHTML = urlHistory.map((v, idx) => {
                        const isCurrent = v.url === currentUrl && idx === 0;
                        const escapedUrl = v.url.replace(/'/g, "\\'");
                        return `
              <div class="url-version-item ${isCurrent ? 'url-current' : ''}">
                <div class="url-version-top">
                  ${isCurrent ? '<span class="url-active-badge">● Đang dùng</span>' : ''}
                  <span class="url-version-time">${v.activatedAt}</span>
                  <span class="url-version-by">bởi ${v.activatedBy}</span>
                </div>
                <a href="${v.url}" target="_blank" class="url-version-link">${v.url}</a>
                ${v.note ? `<div class="url-version-note">${v.note}</div>` : ''}
                ${!isCurrent ? `
                  <div class="url-version-actions">
                    <button class="btn btn-save url-activate-btn" onclick="AdminPanel.activateUrl('${id}','${escapedUrl}')">🔄 Kích hoạt lại</button>
                    <button class="btn btn-danger url-delete-btn" onclick="AdminPanel.deleteUrlVer('${id}',${idx})" title="Xóa phiên bản này">🗑️ Xóa</button>
                  </div>` : ''}
              </div>`;
                    }).join('');
                }
            } else {
                urlSection.innerHTML = '<p style="color:#9e9e9e;font-size:0.82rem">Chỉ áp dụng cho Liên kết (Link).</p>';
            }
        }

        // Link requests for this item
        const reqSection = document.getElementById('edit-item-requests');
        if (reqSection) {
            if (item.type === 'link') {
                const reqs = Store.getRequestsForItem(id);
                if (reqs.length === 0) {
                    reqSection.innerHTML = '<p style="color:#9e9e9e;font-size:0.82rem">Chưa có yêu cầu đổi link nào.</p>';
                } else {
                    const statusMap = { pending: '⏳ Chờ', approved: '✅ Duyệt', rejected: '❌ Từ chối' };
                    reqSection.innerHTML = reqs.map(r => `
            <div class="req-mini-item">
              <span class="req-mini-status">${statusMap[r.status]}</span>
              <span class="req-mini-by">${r.requestedBy}</span>
              <a href="${r.newUrl}" target="_blank" class="req-mini-url">${r.newUrl}</a>
              <span class="req-mini-time">${r.createdAt}</span>
              ${r.status === 'pending' ? `
                <button class="btn btn-save" style="padding:4px 10px;font-size:0.75rem" onclick="AdminPanel.approveReq('${r.id}');AdminPanel.renderItemHistory('${id}')">✅</button>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:0.75rem" onclick="AdminPanel.rejectReq('${r.id}');AdminPanel.renderItemHistory('${id}')">❌</button>
              ` : ''}
            </div>`).join('');
                }
            } else {
                reqSection.innerHTML = '<p style="color:#9e9e9e;font-size:0.82rem">Chỉ áp dụng cho Liên kết (Link).</p>';
            }
        }

        // General change log
        const logSection = document.getElementById('edit-change-log');
        if (logSection) {
            const changeLog = Store.getItemChangeLog(id);
            if (changeLog.length === 0) {
                logSection.innerHTML = '<p style="color:#9e9e9e;font-size:0.82rem">Chưa có lịch sử thay đổi.</p>';
            } else {
                logSection.innerHTML = changeLog.map(c => `
          <div class="changelog-item">
            <span class="changelog-action">${c.action}</span>
            <span class="changelog-detail">${c.detail}</span>
            <span class="changelog-time">${c.time}</span>
          </div>`).join('');
            }
        }
    }

    function activateUrl(itemId, url) {
        Store.activateUrlVersion(itemId, url);
        renderItemHistory(itemId);
        App.render();
        showToast('🔄 Đã kích hoạt lại URL cũ!');
    }

    function deleteUrlVer(itemId, versionIndex) {
        Store.deleteUrlVersion(itemId, versionIndex);
        renderItemHistory(itemId);
        showToast('🗑️ Đã xóa phiên bản URL');
    }


    function clearEditForm() {
        ['edit-type', 'edit-title', 'edit-url', 'edit-thumb', 'edit-desc', 'edit-status', 'edit-content']
            .forEach(i => { const el = document.getElementById(i); if (el) el.value = el.tagName === 'SELECT' ? el.options[0]?.value : ''; });
        document.getElementById('edit-status').value = 'live';
        document.getElementById('edit-type').value = 'link';
        handleTypeChange();
    }

    function populateFolderSelect(selectedParentId, excludeId) {
        const sel = document.getElementById('edit-parent');
        const folders = Store.getFolders(excludeId);
        sel.innerHTML = `<option value="">-- Trang chủ (Root) --</option>` +
            folders.map(f => `<option value="${f.id}" ${f.id === selectedParentId ? 'selected' : ''}>${f.title}</option>`).join('');
    }

    function populateGroupCheckboxes(selectedGroups) {
        const container = document.getElementById('edit-groups-checkboxes');
        const allGroups = getAllGroups();
        container.innerHTML = allGroups.map(g => `
      <label class="checkbox-label">
        <input type="checkbox" value="${g}" ${selectedGroups && selectedGroups.includes(g) ? 'checked' : ''}> ${g}
      </label>`).join('');
    }

    function handleTypeChange() {
        const type = document.getElementById('edit-type').value;
        const urlRow = document.getElementById('url-row');
        const thumbRow = document.getElementById('thumb-row');
        const contentRow = document.getElementById('content-row');
        if (urlRow) urlRow.style.display = type === 'link' ? '' : 'none';
        if (thumbRow) thumbRow.style.display = type !== 'note' ? '' : 'none';
        if (contentRow) contentRow.style.display = type === 'note' ? '' : 'none';
    }

    function submitEdit() {
        const modal = document.getElementById('modal-edit');
        const id = modal.dataset.editingId;
        const checkedGroups = [...document.querySelectorAll('#edit-groups-checkboxes input:checked')].map(cb => cb.value);
        const title = document.getElementById('edit-title').value.trim();
        if (!title) { showToast('❌ Vui lòng nhập tên công cụ', 'error'); return; }
        if (checkedGroups.length === 0) { showToast('❌ Vui lòng chọn ít nhất 1 nhóm', 'error'); return; }

        const data = {
            type: document.getElementById('edit-type').value,
            title,
            url: document.getElementById('edit-url').value.trim(),
            thumbnail: document.getElementById('edit-thumb').value.trim(),
            description: document.getElementById('edit-desc').value.trim(),
            status: document.getElementById('edit-status').value,
            parentId: document.getElementById('edit-parent').value || null,
            groups: checkedGroups,
            content: document.getElementById('edit-content').value
        };

        if (id) { Store.updateItem(id, data); }
        else { Store.addItem(data); }

        modal.classList.add('hidden');
        App.render();
        showToast(id ? '✅ Cập nhật thành công!' : '✅ Thêm thành công!');
        App.addRippleToButtons();
    }

    // ══════════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════════
    function confirmDelete(id) {
        const item = Store.getById(id);
        if (!item) return;
        pendingDeleteId = id;
        const modal = document.getElementById('modal-confirm');
        modal.querySelector('.confirm-item-name').textContent = item.title;
        modal.querySelector('.confirm-extra').innerHTML = item.type === 'folder'
            ? '<p style="color:var(--danger);font-size:0.82rem;margin-top:8px">⚠️ Các item bên trong folder cũng sẽ bị xóa!</p>' : '';
        modal.classList.remove('hidden');
    }

    function executeDelete() {
        if (!pendingDeleteId) return;
        const card = document.querySelector(`.card[data-id="${pendingDeleteId}"]`);
        if (card) {
            card.classList.add('deleting');
            card.addEventListener('animationend', () => {
                Store.deleteItem(pendingDeleteId); pendingDeleteId = null; App.render(); showToast('🗑️ Đã xóa');
            }, { once: true });
        } else {
            Store.deleteItem(pendingDeleteId); pendingDeleteId = null; App.render();
        }
        document.getElementById('modal-confirm').classList.add('hidden');
    }

    // ══════════════════════════════════════════
    // TOAST + ERROR
    // ══════════════════════════════════════════
    function showToast(msg, type = 'success') {
        const existing = document.getElementById('toast-msg');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
      background:${type === 'error' ? '#e53935' : '#1a7a6e'};color:white;
      padding:12px 24px;border-radius:10px;font-size:0.88rem;font-weight:500;
      box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:9999;animation:slideUp 0.3s ease;
      white-space:nowrap;max-width:90vw;`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'fadeIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 2500);
    }

    function showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    }

    function resetData() {
        if (confirm('⚠️ Reset toàn bộ dữ liệu về mặc định? Không thể hoàn tác!')) {
            Store.resetToDefault();
            App.render();
            showToast('✅ Đã reset dữ liệu!');
        }
    }

    // ══════════════════════════════════════════
    // THEME SETTINGS (Admin Mode)
    // ══════════════════════════════════════════
    function openSettings() {
        const modal = document.getElementById('modal-settings');
        const s = App.getThemeSettings();
        document.getElementById('bg-color-input').value = s.color;
        document.getElementById('bg-url-input').value = s.bgImage;
        document.getElementById('bg-opacity-input').value = s.opacity;
        document.getElementById('bg-op-val').textContent = s.opacity + '%';
        document.getElementById('bg-size-input').value = s.size;
        document.getElementById('bg-blobs-input').checked = s.blobs;
        document.getElementById('bg-file-input').value = null;
        modal.classList.remove('hidden');
    }

    function closeSettings() {
        document.getElementById('modal-settings').classList.add('hidden');
        App.applyThemeSettings(); // discard preview
    }

    function previewSettings() {
        const url = document.getElementById('bg-url-input').value.trim();
        const color = document.getElementById('bg-color-input').value;
        const opacity = document.getElementById('bg-opacity-input').value;
        const size = document.getElementById('bg-size-input').value;
        const blobs = document.getElementById('bg-blobs-input').checked;
        document.getElementById('bg-op-val').textContent = opacity + '%';
        App.applyLiveTheme(color, url, opacity, size, blobs);
    }

    function handleBgUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Use a FileReader to create a preview DataURL
        const reader = new FileReader();
        reader.onload = function (evt) {
            const imgUrl = evt.target.result;
            document.getElementById('bg-url-input').value = imgUrl; // Load into input
            previewSettings();
            if (imgUrl.length > 2 * 1024 * 1024) {
                showToast('⚠️ Ảnh hơi lớn, nên dùng link thay thế nếu web load bị chậm.', 'error');
            }
        };
        reader.readAsDataURL(file);
    }

    function saveSettings() {
        const settings = {
            color: document.getElementById('bg-color-input').value,
            bgImage: document.getElementById('bg-url-input').value.trim(),
            opacity: document.getElementById('bg-opacity-input').value,
            size: document.getElementById('bg-size-input').value,
            blobs: document.getElementById('bg-blobs-input').checked
        };
        localStorage.setItem('gxp_theme_settings', JSON.stringify(settings));
        App.applyThemeSettings();
        document.getElementById('modal-settings').classList.add('hidden');
        showToast('✅ Đã lưu cấu hình giao diện!');
    }

    return {
        updateRequestBadge,
        openRequestManager, renderRequestList, approveReq, rejectReq,
        openGroupManager, addGroup, deleteGroup, promptResetGroupPass,
        openPassGroup, submitNewPassword,
        openAdd, openEdit, switchEditTab, renderItemHistory, activateUrl, deleteUrlVer,
        handleTypeChange, submitEdit,
        confirmDelete, executeDelete,
        openSettings, closeSettings, previewSettings, handleBgUpload, saveSettings,
        showToast, resetData, getAllGroups
    };
})();
