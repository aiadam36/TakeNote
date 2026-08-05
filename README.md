# ◈ TakeNote

TakeNote is a minimal Markdown note-taking app inspired by Obsidian.

![TakeNote](https://img.shields.io/badge/client--side-only-brightgreen) ![License](https://img.shields.io/badge/license-source--available-blue)

---

## Features

- **Markdown editor** with full GFM support — headings, bold, italic, tables, blockquotes, task lists, fenced code blocks, and more
- **Live split preview** — toggle a side-by-side rendered view as you type
- **Markdown toolbar** — one-click buttons for bold, italic, inline code, links, headings, lists, blockquotes, and dividers
- **Auto-save** — notes are saved to IndexedDB automatically as you type, with a visible save indicator
- **Search** — instant full-text search across note titles and content
- **Import / Export** — back up all notes as JSON and restore them later; duplicate detection on import
- **Syntax highlighting** — code blocks are highlighted via highlight.js with the GitHub Dark theme
- **Mobile-friendly** — responsive sidebar overlay, hamburger menu, swipe-to-open gesture, and a mobile top bar showing the active note title
- **Resizable sidebar** — drag the sidebar edge to your preferred width on desktop
- **Word & character count** — live stats in the editor footer alongside the last-saved timestamp
- **Trash & recovery** — deleted notes move to Trash instead of being removed immediately; restore them any time, or let them be permanently purged after 30 days
- **Keyboard shortcuts** — see the table below

---

## Getting Started

TakeNote is a static app — there is no build step.

1. Clone or download this repository.
2. Serve the `public/` folder over local HTTP server
3. Open the URL in your browser

That's it. Notes are stored in your browser's **IndexedDB** via [Dexie.js](https://dexie.org) and persist across sessions.

> **Note:** `index.html` loads `js/main.js` as an ES module, so opening the file directly via `file://` will be blocked by the browser CORS policy for modules in some browsers

---

## Keyboard Shortcuts

| Shortcut          | Action                              |
|-------------------|-------------------------------------|
| `Ctrl / ⌘` + `N`  | Create a new note                   |
| `Ctrl / ⌘` + `P`  | Toggle split preview                |
| `Ctrl / ⌘` + `F`  | Focus search                        |
| `Tab` (in editor) | Insert 2-space indent               |
| `Escape`          | Close search / close mobile sidebar |

---

## Storage

TakeNote uses the browser's **IndexedDB** (via Dexie.js) to persist notes and folders

| What            | Where                               |
|-----------------|-------------------------------------|
| Notes & folders | IndexedDB (`TakeNote` database)     |
| Sidebar width   | `localStorage` (single small value) |

To clear all data, open DevTools → Application → IndexedDB → delete the `TakeNote` database.

---

## Import & Export

**Export** — Click **Export** in the sidebar footer to download a `takenote-export-YYYY-MM-DD.json` file containing all your notes.

**Import** — Click **Import** and select a previously exported JSON file. Notes with duplicate IDs are skipped automatically; a toast confirms how many were imported and how many were skipped.
