/* ==========================================
   storage.js — IndexedDB persistence via Dexie
   ========================================== */

import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.mjs';

const db = new Dexie('TakeNote');

db.version(1).stores({
  notes:   'id, folderId, deletedAt, updatedAt',
  folders: 'id',
  meta:    'key',   // sidebar width and other small prefs
});

// ── Notes ────────────────────────────────────────────────

export async function loadNotes() {
  try {
    return await db.notes.toArray();
  } catch {
    return [];
  }
}

/** Upsert a single note (preferred — only touches one record). */
export async function persistNote(note) {
  await db.notes.put(note);
}

/** Bulk-replace all notes (used for import / purge). */
export async function persistNotes(notes) {
  await db.transaction('rw', db.notes, async () => {
    await db.notes.clear();
    await db.notes.bulkPut(notes);
  });
}

export async function deleteNoteRecord(id) {
  await db.notes.delete(id);
}

// ── Folders ──────────────────────────────────────────────

export async function loadFolders() {
  try {
    return await db.folders.toArray();
  } catch {
    return [];
  }
}

export async function persistFolder(folder) {
  await db.folders.put(folder);
}

export async function persistFolders(folders) {
  await db.transaction('rw', db.folders, async () => {
    await db.folders.clear();
    await db.folders.bulkPut(folders);
  });
}

export async function deleteFolderRecord(id) {
  await db.folders.delete(id);
}

// ── Sidebar width (tiny pref — stays in localStorage) ────

export const SIDEBAR_WIDTH_KEY = 'takenote_sidebar_width';

export function loadSidebarWidth() {
  const saved = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
  return Number.isFinite(saved) ? saved : null;
}

export function persistSidebarWidth(width) {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, width);
}

// ── Migration: import any existing localStorage data ──────

const LEGACY_NOTES_KEY   = 'takenote_notes';
const LEGACY_FOLDERS_KEY = 'takenote_folders';

export async function migrateLegacyStorage() {
  const rawNotes   = localStorage.getItem(LEGACY_NOTES_KEY);
  const rawFolders = localStorage.getItem(LEGACY_FOLDERS_KEY);
  if (!rawNotes && !rawFolders) return;

  const existingCount = await db.notes.count();
  if (existingCount > 0) {
    // IndexedDB already has data — just clear the old keys
    localStorage.removeItem(LEGACY_NOTES_KEY);
    localStorage.removeItem(LEGACY_FOLDERS_KEY);
    return;
  }

  try {
    const notes   = rawNotes   ? JSON.parse(rawNotes)   : [];
    const folders = rawFolders ? JSON.parse(rawFolders) : [];
    if (notes.length)   await db.notes.bulkPut(notes);
    if (folders.length) await db.folders.bulkPut(folders);
    localStorage.removeItem(LEGACY_NOTES_KEY);
    localStorage.removeItem(LEGACY_FOLDERS_KEY);
    console.info(`[TakeNote] Migrated ${notes.length} notes and ${folders.length} folders from localStorage → IndexedDB`);
  } catch (err) {
    console.warn('[TakeNote] Legacy migration failed — original data untouched', err);
  }
}
