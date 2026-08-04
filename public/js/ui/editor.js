/* ==========================================
   ui/editor.js — editor pane, autosave, preview
   ========================================== */

import { state, dom, isMobile } from '../state.js';
import { getNote, updateNote, deleteNote, permanentlyDeleteNote, restoreNote, daysUntilPurge } from '../notes.js';
import { renderMarkdown } from '../markdown.js';
import { formatDate } from '../format.js';
import { renderFolders, renderSidebar } from './sidebar.js';
import { closeSidebar } from './mobile.js';
import { showToast } from './toast.js';

const SAVE_DEBOUNCE_MS = 600;
const SAVE_INDICATOR_MS = 1800;

export function openNote(id) {
  const note = getNote(id);
  if (!note) return;
  state.activeId = id;

  dom.emptyState.classList.add('hidden');
  dom.editorArea.classList.remove('hidden');

  dom.noteTitle.value = note.title;
  dom.editor.value = note.content;

  dom.mobileNoteTitleDisplay.textContent = note.title || 'Untitled';

  // Trashed notes: show Restore button, lock editing
  const isTrashed = !!note.deletedAt;
  dom.restoreNoteBtn.classList.toggle('hidden', !isTrashed);
  dom.noteTitle.readOnly = isTrashed;
  dom.editor.readOnly = isTrashed;
  dom.editorArea.classList.toggle('trashed', isTrashed);

  updateFooter(note);
  enterReadingMode();
  renderSidebar(dom.searchInput.value);

  // On mobile: close sidebar after selecting note
  if (isMobile()) {
    closeSidebar();
  }
}

export function closeEditor() {
  state.activeId = null;
  dom.mobileNoteTitleDisplay.textContent = 'TakeNote';
  dom.emptyState.classList.remove('hidden');
  dom.editorArea.classList.add('hidden');
}

export function updatePreview() {
  dom.previewContent.innerHTML = renderMarkdown(dom.editor.value);
  dom.previewContent.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
}

/* ----- reading / editing modes -----
   Reading mode: rendered Markdown fills the pane (default on open).
   Editing mode: raw textarea, entered by clicking/tapping the preview. */

export function enterReadingMode() {
  if (state.previewMode) return; // manual split-preview takes priority
  state.readingMode = true;
  updatePreview();
  dom.paneContainer.classList.add('reading');
}

export function enterEditMode(focusOptions) {
  if (state.previewMode) return; // already showing editor alongside preview
  state.readingMode = false;
  dom.paneContainer.classList.remove('reading');
  dom.editor.focus();
  if (focusOptions?.selectAll) {
    dom.editor.select();
  } else if (focusOptions?.caretPos != null) {
    dom.editor.setSelectionRange(focusOptions.caretPos, focusOptions.caretPos);
  }
}

export function updateFooter(note) {
  const content = dom.editor.value;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  dom.wordCount.textContent = `${words}w`;
  dom.charCount.textContent = `${content.length}c`;
  dom.lastModified.textContent = note ? `Saved ${formatDate(note.updatedAt)}` : '';
}

export function scheduleSave() {
  dom.saveStatus.textContent = 'Saving…';
  dom.saveStatus.className = 'saving';
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(async () => {
    if (!state.activeId) return;
    const newTitle = dom.noteTitle.value.trim() || 'Untitled';
    await updateNote(state.activeId, {
      title: newTitle,
      content: dom.editor.value,
    });
    dom.mobileNoteTitleDisplay.textContent = newTitle;
    renderSidebar(dom.searchInput.value);
    const note = getNote(state.activeId);
    updateFooter(note);
    dom.saveStatus.textContent = '✓';
    dom.saveStatus.className = 'saved';
    setTimeout(() => {
      dom.saveStatus.textContent = '';
      dom.saveStatus.className = '';
    }, SAVE_INDICATOR_MS);
  }, SAVE_DEBOUNCE_MS);
}

export function setPreviewMode(on) {
  state.previewMode = on;
  if (on) {
    dom.paneContainer.classList.remove('reading');
    dom.paneContainer.classList.add('split');
    dom.previewPane.classList.remove('hidden');
    dom.togglePreviewBtn.classList.add('active');
    updatePreview();
  } else {
    dom.paneContainer.classList.remove('split');
    dom.previewPane.classList.add('hidden');
    dom.togglePreviewBtn.classList.remove('active');
    // Returning from split-preview: go back to reading mode, matching
    // the default style for a note that isn't being actively edited.
    if (state.activeId) enterReadingMode();
  }
}

export function initEditorEvents() {
  document.addEventListener('note:open', e => openNote(e.detail));
  document.addEventListener('editor:close', () => closeEditor());

  dom.editor.addEventListener('input', () => {
    scheduleSave();
    if (state.previewMode) updatePreview();
    const note = getNote(state.activeId);
    updateFooter(note);
  });

  dom.noteTitle.addEventListener('input', () => {
    scheduleSave();
    dom.mobileNoteTitleDisplay.textContent = dom.noteTitle.value || 'Untitled';
  });

  dom.togglePreviewBtn.addEventListener('click', () => {
    setPreviewMode(!state.previewMode);
  });

  dom.closeNoteBtn.addEventListener('click', () => {
    closeEditor();
    renderSidebar(dom.searchInput.value);
  });

  dom.deleteNoteBtn.addEventListener('click', async () => {
    if (!state.activeId) return;
    const note = getNote(state.activeId);
    const title = note?.title || 'Untitled';

    if (note?.deletedAt) {
      // Already in Trash — permanently delete
      if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
      await permanentlyDeleteNote(state.activeId);
      closeEditor();
      renderFolders();
      renderSidebar(dom.searchInput.value);
      showToast(`🗑 "${title}" permanently deleted`);
    } else {
      // Soft-delete: move to Trash
      await deleteNote(state.activeId);
      closeEditor();
      renderFolders();
      renderSidebar(dom.searchInput.value);
      showToast(`🗑 "${title}" moved to Trash`);
    }
  });

  dom.restoreNoteBtn.addEventListener('click', async () => {
    if (!state.activeId) return;
    const note = getNote(state.activeId);
    if (!note?.deletedAt) return;
    const title = note.title || 'Untitled';
    await restoreNote(state.activeId);
    closeEditor();
    renderFolders();
    renderSidebar(dom.searchInput.value);
    showToast(`✦ "${title}" restored`);
  });

  // Tab inserts a 2-space indent inside the editor textarea
  dom.editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = dom.editor;
      dom.editor.setRangeText('  ', s, end, 'end');
    }
  });

  // clicking the rendered preview enters edit mode.
  dom.previewContent.addEventListener('mousedown', e => {
    if (!state.readingMode || !state.activeId) return;
    // Let clicks on real links / checkboxes behave normally instead of
    // hijacking them into edit mode.
    if (e.target.closest('a, input[type="checkbox"]')) return;
    e.preventDefault();
    enterEditMode({ selectAll: false, caretPos: dom.editor.value.length });
  });

  // Leaving the textarea (click elsewhere, tab away) returns to reading mode.
  dom.editor.addEventListener('blur', () => {
    if (state.previewMode || !state.activeId) return;
    // Skip the flash back to reading mode if focus is moving to the
    // markdown toolbar — those buttons act on the editor and refocus it.
    requestAnimationFrame(() => {
      if (document.activeElement === dom.editor) return;
      if (document.activeElement?.closest('#md-toolbar')) return;
      enterReadingMode();
    });
  });
}
