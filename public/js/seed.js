/* ==========================================
   seed.js — first-run demo note
   ========================================== */

import { state } from './state.js';
import { createNote, saveNotes } from './notes.js';

const WELCOME_CONTENT = `# Welcome to TakeNote ◈

TakeNote is a minimal Markdown note-taking app inspired by Obsidian.

## Features

- **Live split preview** — press \`Ctrl+P\` to toggle
- **Auto-save** — your notes save as you type
- **Markdown toolbar** — tap formatting buttons above the editor
- **Full Markdown support** — headings, lists, code, tables, and more

## Markdown Cheatsheet

### Text Formatting
**bold**, *italic*, ~~strikethrough~~, \`inline code\`

### Lists
- Unordered list item
- Another item
  - Nested item

1. Ordered list
2. Second item

### Task Lists
- [x] Build TakeNote
- [ ] Write more notes
- [ ] Take over the world

### Code

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('world'));
\`\`\`

### Blockquote

> The best way to predict the future is to invent it.
> — Alan Kay

### Table

| Feature | Status |
|---------|--------|
| Editor | ✅ Done |
| Preview | ✅ Done |
| Search | ✅ Done |
| Mobile | ✅ Done |

---

Start writing your own note with the **+** button.
`;

export async function seedDemoNotes() {
  const welcome = await createNote();
  Object.assign(welcome, {
    title: 'Welcome to TakeNote',
    content: WELCOME_CONTENT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  state.notes = [welcome];
  await saveNotes();
  return welcome;
}
