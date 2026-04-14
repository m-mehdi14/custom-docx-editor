# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # Start dev server (Turbopack) — http://localhost:3000
pnpm build      # Production build
pnpm lint       # Run ESLint
```

No test suite is configured.

## Stack

- **Next.js 16** (App Router) with React 19 — read `node_modules/next/dist/docs/` before touching routing/config; this version has breaking changes
- **TipTap v3** (`@tiptap/react`) — rich-text editor; extensions live in `extensions/`
- **Tailwind CSS v4** with `@tailwindcss/postcss` — config is CSS-first (no `tailwind.config.js`)
- **Mammoth** — `.docx` → HTML import (client-side, converts images to base64 data URIs)
- **html-to-docx** — HTML → `.docx` export (server-side only, via API route)

## Architecture

The entire editing experience is a single large Client Component: `components/docx-editor.tsx`. It owns all editor state, the toolbar, comment sidebar, and modal dialogs. There is no state manager — React `useState`/`useRef` only.

**Data flow:**
1. User uploads `.docx` → `lib/docx.ts:importDocx` (mammoth, runs in browser) → HTML string → TipTap `editor.commands.setContent`
2. User edits → TipTap ProseMirror document
3. Export → `lib/docx.ts:exportDocx` → POST `/api/export-docx` → `html-to-docx` → `.docx` blob → `file-saver` download

**Key files:**
- `components/docx-editor.tsx` — monolithic editor component; contains toolbar sub-components (`ToolbarButton`, `ToolbarGroup`, `ToolbarDivider`), comment logic, and table helpers inline
- `app/api/export-docx/route.ts` — Node.js runtime only (`export const runtime = "nodejs"`); must stay server-side because `html-to-docx` uses Node APIs
- `extensions/comment-mark.ts` — custom TipTap `Mark` that stores a `commentId` attribute; comments are stored as React state (`CommentItem[]`) and the mark links editor text to comment IDs
- `lib/docx.ts` — thin wrappers around mammoth (import) and the export API fetch
- `types/editor.ts` — `EditorState` interface; `types/html-to-docx.d.ts` — ambient module declaration for the untyped `html-to-docx` package

**TipTap extension set:** `StarterKit`, `Table`/`TableRow`/`TableHeader`/`TableCell`, `Image`, `TextStyle` (with `FontFamily` + `FontSize`), `TextAlign`, `Highlight`, `Subscript`, `Superscript`, `BubbleMenu`, `CommentMark`

**Comments:** stored in React state as `{ id, text, resolved, createdAt }`. The `CommentMark` TipTap extension marks spans with `data-comment-id`. `findCommentRange` walks the ProseMirror doc to locate a comment's text range for scrolling/highlighting.

## Constraints

- `app/api/export-docx/route.ts` must keep `export const runtime = "nodejs"` — edge runtime does not support `html-to-docx`
- Images are embedded as base64 data URIs during import; round-trip fidelity degrades for complex tables with deep nesting or heavy cell merging
