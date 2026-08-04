/* ==========================================
   ui/sidebar.js — sidebar: folders + note list + search
   ========================================== */

import { state, dom } from '../state.js';
import { formatDate, notePreviewText, escHtml } from '../format.js';
import { createFolder, deleteFolder, renameFolder, getFolderById } from '../folders.js';
import { updateNote, saveNotes, permanentlyDeleteNote, restoreNote, daysUntilPurge } from '../notes.js';
import { showToast } from './toast.js';

/* ── Folder section ─────────────────────────────────────── */

export function renderFolders() {
  const ul = dom.folderList;

  const liveNotes = state.notes.filter(n => !n.deletedAt);
  const trashedNotes = state.notes.filter(n => n.deletedAt);
  const allCount = liveNotes.length;
  const trashCount = trashedNotes.length;
  const isTrash = state.activeFolderId === '__trash__';

  const rows = [
    `<li class="folder-item ${state.activeFolderId === null ? 'active' : ''}" data-folder-id="__all__">
      <span class="folder-icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </span>
      <span class="folder-name">All Notes</span>
      <span class="folder-count">${allCount}</span>
    </li>`
  ];

  for (const folder of state.folders) {
    const count = liveNotes.filter(n => n.folderId === folder.id).length;
    rows.push(`
      <li class="folder-item ${state.activeFolderId === folder.id ? 'active' : ''}" data-folder-id="${folder.id}">
        <span class="folder-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </span>
        <span class="folder-name">${escHtml(folder.name)}</span>
        <span class="folder-count">${count}</span>
        <button class="folder-action-btn rename-folder-btn" data-folder-id="${folder.id}" title="Rename folder">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="folder-action-btn delete-folder-btn" data-folder-id="${folder.id}" title="Delete folder">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </li>
    `);
  }

  // Trash entry — always at the bottom, separated
  rows.push(`
    <li class="folder-item folder-item-trash ${isTrash ? 'active' : ''}" data-folder-id="__trash__">
      <span class="folder-icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </span>
      <span class="folder-name">Trash</span>
      ${trashCount > 0 ? `<span class="folder-count trash-count">${trashCount}</span>` : ''}
    </li>
  `);

  ul.innerHTML = rows.join('');
}

/* ── Note list section ──────────────────────────────────── */

export function renderSidebar(filter = '') {
  const isTrash = state.activeFolderId === '__trash__';

  // Determine which notes to show based on active folder
  let pool;
  if (isTrash) {
    pool = state.notes.filter(n => n.deletedAt);
  } else if (state.activeFolderId === null) {
    pool = state.notes.filter(n => !n.deletedAt);
  } else {
    pool = state.notes.filter(n => !n.deletedAt && n.folderId === state.activeFolderId);
  }

  const q = filter.toLowerCase();
  const visible = pool.filter(n =>
    !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );

  // Section label reflects context
  const sectionLabel = document.getElementById('notes-section-label');
  if (sectionLabel) {
    if (isTrash) {
      sectionLabel.textContent = 'TRASH';
    } else if (state.activeFolderId) {
      const folder = getFolderById(state.activeFolderId);
      sectionLabel.textContent = folder ? folder.name.toUpperCase() : 'NOTES';
    } else {
      sectionLabel.textContent = 'ALL NOTES';
    }
  }

  if (visible.length === 0) {
    dom.notesList.innerHTML = `<div class="no-notes">${
      isTrash
        ? 'Trash is empty.'
        : pool.length === 0
          ? (state.activeFolderId
              ? 'No notes in this folder.<br>Create one with <strong>+</strong>.'
              : 'No notes yet.<br>Tap <strong>+</strong> to start.')
          : 'No matches found.'
    }</div>`;
    return;
  }

  if (isTrash) {
    dom.notesList.innerHTML = visible.map(n => {
      const days = daysUntilPurge(n);
      return `
        <li class="note-item note-item-trash ${n.id === state.activeId ? 'active' : ''}" data-id="${n.id}">
          <div class="note-item-title">${escHtml(n.title || 'Untitled')}</div>
          <div class="note-item-preview">${escHtml(notePreviewText(n.content))}</div>
          <div class="note-item-trash-meta">
            <span class="trash-days">Deletes in ${days} day${days !== 1 ? 's' : ''}</span>
            <span class="trash-actions">
              <button class="trash-restore-btn" data-id="${n.id}" title="Restore note">Restore</button>
              <button class="trash-delete-btn" data-id="${n.id}" title="Delete forever">Delete</button>
            </span>
          </div>
        </li>
      `;
    }).join('');
    return;
  }

  dom.notesList.innerHTML = visible.map(n => `
    <li class="note-item ${n.id === state.activeId ? 'active' : ''}" data-id="${n.id}">
      <div class="note-item-title">${escHtml(n.title || 'Untitled')}</div>
      <div class="note-item-preview">${escHtml(notePreviewText(n.content))}</div>
      <div class="note-item-date">${formatDate(n.updatedAt)}</div>
    </li>
  `).join('');
}

/* ── Folder modal (create / rename) ────────────────────── */

let folderModalMode = 'create'; // 'create' | 'rename'
let folderModalTargetId = null;

export function openFolderModal(mode = 'create', folderId = null) {
  folderModalMode = mode;
  folderModalTargetId = folderId;

  if (mode === 'rename') {
    const folder = getFolderById(folderId);
    dom.folderModalTitle.textContent = 'Rename Folder';
    dom.folderNameInput.value = folder ? folder.name : '';
  } else {
    dom.folderModalTitle.textContent = 'New Folder';
    dom.folderNameInput.value = '';
  }

  dom.folderModal.classList.remove('hidden');
  requestAnimationFrame(() => dom.folderNameInput.focus());
}

function closeFolderModal() {
  dom.folderModal.classList.add('hidden');
  dom.folderNameInput.value = '';
}

async function confirmFolderModal() {
  const name = dom.folderNameInput.value.trim();
  if (!name) return;

  if (folderModalMode === 'create') {
    const folder = await createFolder(name);
    state.activeFolderId = folder.id;
    renderFolders();
    renderSidebar(dom.searchInput.value);
    showToast(`✦ Folder "${folder.name}" created`);
  } else if (folderModalMode === 'rename') {
    await renameFolder(folderModalTargetId, name);
    renderFolders();
    showToast('✦ Folder renamed');
  }

  closeFolderModal();
}

/* ── Move note modal ────────────────────────────────────── */

export function openMoveModal() {
  if (!state.activeId) return;

  const note = state.notes.find(n => n.id === state.activeId);
  const currentFolderId = note?.folderId || null;

  const rows = [
    `<li class="move-folder-item ${currentFolderId === null ? 'current' : ''}" data-target-folder="__none__">
      <span class="folder-icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </span>
      No Folder
      ${currentFolderId === null ? '<span class="current-badge">current</span>' : ''}
    </li>`
  ];

  for (const folder of state.folders) {
    rows.push(`
      <li class="move-folder-item ${currentFolderId === folder.id ? 'current' : ''}" data-target-folder="${folder.id}">
        <span class="folder-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </span>
        ${escHtml(folder.name)}
        ${currentFolderId === folder.id ? '<span class="current-badge">current</span>' : ''}
      </li>
    `);
  }

  dom.moveFolderList.innerHTML = rows.join('');
  dom.moveModal.classList.remove('hidden');
}

function closeMoveModal() {
  dom.moveModal.classList.add('hidden');
}

/* ── Event wiring ───────────────────────────────────────── */

export function initSidebarEvents() {
  // Click note (or trash action buttons)
  dom.notesList.addEventListener('click', async e => {
    // Restore button in Trash
    const restoreBtn = e.target.closest('.trash-restore-btn');
    if (restoreBtn) {
      e.stopPropagation();
      const id = restoreBtn.dataset.id;
      const note = state.notes.find(n => n.id === id);
      const title = note?.title || 'Untitled';
      await restoreNote(id);
      if (state.activeId === id) document.dispatchEvent(new CustomEvent('editor:close'));
      renderFolders();
      renderSidebar(dom.searchInput.value);
      showToast(`✦ "${title}" restored`);
      return;
    }

    // Permanent delete button in Trash
    const deleteBtn = e.target.closest('.trash-delete-btn');
    if (deleteBtn) {
      e.stopPropagation();
      const id = deleteBtn.dataset.id;
      const note = state.notes.find(n => n.id === id);
      const title = note?.title || 'Untitled';
      if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
      await permanentlyDeleteNote(id);
      if (state.activeId === id) document.dispatchEvent(new CustomEvent('editor:close'));
      renderFolders();
      renderSidebar(dom.searchInput.value);
      showToast(`🗑 "${title}" permanently deleted`);
      return;
    }

    const item = e.target.closest('.note-item');
    if (item) {
      document.dispatchEvent(new CustomEvent('note:open', { detail: item.dataset.id }));
    }
  });

  // Search
  dom.searchInput.addEventListener('input', () => {
    renderSidebar(dom.searchInput.value);
  });

  // Folder list clicks (select, rename, delete)
  dom.folderList.addEventListener('click', async e => {
    // Rename button
    const renameBtn = e.target.closest('.rename-folder-btn');
    if (renameBtn) {
      e.stopPropagation();
      openFolderModal('rename', renameBtn.dataset.folderId);
      return;
    }

    // Delete button
    const deleteBtn = e.target.closest('.delete-folder-btn');
    if (deleteBtn) {
      e.stopPropagation();
      const fid = deleteBtn.dataset.folderId;
      const folder = getFolderById(fid);
      const noteCount = state.notes.filter(n => n.folderId === fid).length;
      const msg = noteCount > 0
        ? `Delete "${folder?.name}"? Its ${noteCount} note${noteCount !== 1 ? 's' : ''} will move to All Notes.`
        : `Delete folder "${folder?.name}"?`;
      if (!confirm(msg)) return;
      await deleteFolder(fid);   // handles nulling folderId + persisting affected notes
      if (state.activeFolderId === fid) state.activeFolderId = null;
      renderFolders();
      renderSidebar(dom.searchInput.value);
      showToast(`🗑 Folder deleted`);
      return;
    }

    // Select folder
    const folderItem = e.target.closest('.folder-item');
    if (folderItem) {
      const fid = folderItem.dataset.folderId;
      state.activeFolderId = fid === '__all__' ? null : fid;
      renderFolders();
      renderSidebar(dom.searchInput.value);
    }

    // Empty Trash button
    const emptyBtn = e.target.closest('#empty-trash-btn');
    if (emptyBtn) {
      const count = state.notes.filter(n => n.deletedAt).length;
      if (!count) return;
      if (!confirm(`Permanently delete all ${count} note${count !== 1 ? 's' : ''} in Trash? This cannot be undone.`)) return;
      state.notes = state.notes.filter(n => !n.deletedAt);
      await saveNotes();
      renderFolders();
      renderSidebar(dom.searchInput.value);
      showToast('🗑 Trash emptied');
    }
  });

  // New folder button
  dom.newFolderBtn.addEventListener('click', () => openFolderModal('create'));

  // Folder modal events
  dom.folderModalConfirm.addEventListener('click', confirmFolderModal);
  dom.folderModalCancel.addEventListener('click', closeFolderModal);
  dom.folderNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmFolderModal();
    if (e.key === 'Escape') closeFolderModal();
  });
  dom.folderModal.addEventListener('click', e => {
    if (e.target === dom.folderModal) closeFolderModal();
  });

  // Move modal events
  dom.moveFolderList.addEventListener('click', async e => {
    const item = e.target.closest('.move-folder-item');
    if (!item || !state.activeId) return;

    const targetFolder = item.dataset.targetFolder;
    const newFolderId = targetFolder === '__none__' ? null : targetFolder;

    const note = state.notes.find(n => n.id === state.activeId);
    if (note) {
      note.folderId = newFolderId;
      await saveNotes();
    }

    const folderName = newFolderId
      ? (getFolderById(newFolderId)?.name || 'folder')
      : 'All Notes';
    showToast(`✦ Moved to ${folderName}`);
    closeMoveModal();
    renderFolders();
    renderSidebar(dom.searchInput.value);
  });

  dom.moveModalCancel.addEventListener('click', closeMoveModal);
  dom.moveModal.addEventListener('click', e => {
    if (e.target === dom.moveModal) closeMoveModal();
  });

  // Move note button (in editor header)
  dom.moveNoteBtn.addEventListener('click', openMoveModal);
}
