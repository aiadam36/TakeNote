/* ==========================================
   folders.js — folder CRUD + storage
   ========================================== */

import { state } from './state.js';
import { persistFolder, persistFolders, deleteFolderRecord } from './storage.js';
import { persistNote } from './storage.js';

function makeFolderId() {
  return 'f_' + crypto.randomUUID();
}

export async function createFolder(name) {
  const folder = {
    id: makeFolderId(),
    name: name.trim() || 'New Folder',
    createdAt: new Date().toISOString(),
  };
  state.folders.push(folder);
  await persistFolder(folder);
  return folder;
}

export async function deleteFolder(id) {
  state.folders = state.folders.filter(f => f.id !== id);
  // Move notes that were in this folder back to "All Notes"
  const affected = state.notes.filter(n => n.folderId === id);
  affected.forEach(n => { n.folderId = null; });
  await deleteFolderRecord(id);
  await Promise.all(affected.map(n => persistNote(n)));
}

export async function renameFolder(id, newName) {
  const folder = state.folders.find(f => f.id === id);
  if (!folder) return;
  folder.name = newName.trim() || folder.name;
  await persistFolder(folder);
}

export function getFolderById(id) {
  return state.folders.find(f => f.id === id) || null;
}
