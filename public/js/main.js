/* ==========================================
   main.js — app entry point
   ========================================== */

import { state, dom, isMobile } from './state.js';
import { loadNotes, loadFolders, migrateLegacyStorage } from './storage.js';
import { createNote, purgeExpiredNotes } from './notes.js';
import { renderFolders, renderSidebar, initSidebarEvents } from './ui/sidebar.js';
import { openNote, setPreviewMode, initEditorEvents, enterEditMode } from './ui/editor.js';
import { initToolbar } from './ui/toolbar.js';
import { initMobileSidebar, initSwipeGesture, closeSidebar } from './ui/mobile.js';
import { initSidebarResize } from './ui/resize.js';
import { initShortcuts } from './shortcuts.js';
import { initImportExport } from './io.js';
import { seedDemoNotes } from './seed.js';
import { showToast } from './ui/toast.js';

async function handleNewNote() {
  const note = await createNote();
  if (isMobile()) closeSidebar();
  openNote(note.id);
  enterEditMode({ selectAll: false, caretPos: 0 });
  renderSidebar(dom.searchInput.value);
  dom.noteTitle.select();
  showToast('✦ New note created');
}

function bindNewNoteButtons() {
  dom.newNoteBtn.addEventListener('click', handleNewNote);
  dom.emptyNewBtn.addEventListener('click', handleNewNote);
  dom.mobileNewNoteBtn.addEventListener('click', handleNewNote);
}

async function init() {
  // Migrate any existing localStorage data to IndexedDB (no-op if already done)
  await migrateLegacyStorage();

  state.notes = await loadNotes();
  state.folders = await loadFolders();
  await purgeExpiredNotes(); // auto-remove notes trashed more than 30 days ago

  bindNewNoteButtons();
  initSidebarEvents();
  initEditorEvents();
  initToolbar();
  initMobileSidebar();
  initSwipeGesture();
  initSidebarResize();
  initShortcuts(handleNewNote);
  initImportExport();

  renderFolders();

  if (state.notes.length === 0) {
    const demo = await seedDemoNotes();
    renderSidebar();
    openNote(demo.id);
    setPreviewMode(true);
  } else {
    renderSidebar();
  }
}

init();
