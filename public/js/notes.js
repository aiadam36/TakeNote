/* ==========================================
   notes.js — note CRUD
   ========================================== */

import { state } from './state.js';
import { persistNote, persistNotes, deleteNoteRecord } from './storage.js';

const TRASH_DAYS = 30;

function makeId() {
  return crypto.randomUUID();
}

export async function createNote() {
  const note = {
    id: makeId(),
    title: 'Untitled',
    content: '',
    folderId: state.activeFolderId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  state.notes.unshift(note);
  await persistNote(note);
  return note;
}

/** Soft-delete: moves note to Trash by stamping deletedAt. */
export async function deleteNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  note.deletedAt = new Date().toISOString();
  await persistNote(note);
}

/** Permanently removes a note from storage. */
export async function permanentlyDeleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  await deleteNoteRecord(id);
}

/** Restores a trashed note back to its folder. */
export async function restoreNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  note.deletedAt = null;
  await persistNote(note);
}

/** Removes all notes that have been in Trash for more than TRASH_DAYS days. */
export async function purgeExpiredNotes() {
  const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
  const before = state.notes.length;
  const expired = state.notes.filter(n => n.deletedAt && new Date(n.deletedAt).getTime() <= cutoff);
  state.notes = state.notes.filter(n => {
    if (!n.deletedAt) return true;
    return new Date(n.deletedAt).getTime() > cutoff;
  });
  if (expired.length) {
    await Promise.all(expired.map(n => deleteNoteRecord(n.id)));
  }
}

/** Returns how many days remain before a trashed note is auto-deleted. */
export function daysUntilPurge(note) {
  if (!note.deletedAt) return null;
  const deletedMs = new Date(note.deletedAt).getTime();
  const expiresMs = deletedMs + TRASH_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));
}

export async function updateNote(id, patch) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  Object.assign(note, patch, { updatedAt: new Date().toISOString() });
  state.notes = [note, ...state.notes.filter(n => n.id !== id)];
  await persistNote(note);
}

export function getNote(id) {
  return state.notes.find(n => n.id === id);
}

/** Bulk-save all notes (import / reorder). */
export async function saveNotes() {
  await persistNotes(state.notes);
}
