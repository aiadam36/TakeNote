/* ==========================================
   io.js — import / export notes as JSON
   ========================================== */

import { state, dom } from './state.js';
import { saveNotes } from './notes.js';
import { renderFolders, renderSidebar } from './ui/sidebar.js';
import { openNote } from './ui/editor.js';
import { showToast } from './ui/toast.js';
import { persistFolders } from './storage.js';

function exportNotes() {
  if (state.notes.length === 0) {
    showToast('⚠ No notes to export');
    return;
  }

  const payload = {
    app: 'TakeNote',
    exportedAt: new Date().toISOString(),
    version: 2,
    folders: state.folders,
    notes: state.notes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `takenote-export-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`✦ Exported ${state.notes.length} note${state.notes.length !== 1 ? 's' : ''}`);
}

async function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const incoming = Array.isArray(data) ? data : (data.notes ?? null);
      if (!Array.isArray(incoming)) throw new Error('Unrecognized format');

      const valid = incoming.filter(n => n && typeof n.id === 'string' && typeof n.content === 'string');
      if (valid.length === 0) throw new Error('No valid notes found in file');

      const existingIds = new Set(state.notes.map(n => n.id));
      const newNotes = valid.filter(n => !existingIds.has(n.id));
      const dupes = valid.length - newNotes.length;

      // Import folders if present (skip duplicates by id)
      if (Array.isArray(data.folders)) {
        const existingFolderIds = new Set(state.folders.map(f => f.id));
        const newFolders = data.folders.filter(f => f && typeof f.id === 'string' && !existingFolderIds.has(f.id));
        state.folders = [...state.folders, ...newFolders];
        await persistFolders(state.folders);
      }

      state.notes = [...newNotes, ...state.notes];
      await saveNotes();
      renderFolders();
      renderSidebar(dom.searchInput.value);

      let msg = `✦ Imported ${newNotes.length} note${newNotes.length !== 1 ? 's' : ''}`;
      if (dupes > 0) msg += ` (${dupes} dupe${dupes !== 1 ? 's' : ''} skipped)`;
      showToast(msg, 3000);

      if (!state.activeId && newNotes.length > 0) openNote(newNotes[0].id);
    } catch (err) {
      showToast(`✖ Import failed: ${err.message}`, 3500);
    }
  };
  reader.readAsText(file);
}

export function initImportExport() {
  dom.exportBtn.addEventListener('click', exportNotes);

  dom.importBtn.addEventListener('click', () => {
    dom.importFileInput.value = '';
    dom.importFileInput.click();
  });

  dom.importFileInput.addEventListener('change', () => {
    const file = dom.importFileInput.files[0];
    if (!file) return;
    handleImportFile(file);
  });
}
