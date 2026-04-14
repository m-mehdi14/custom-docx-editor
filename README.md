# Custom DOCX Editor

Browser-based editor for Word documents: upload a `.docx`, edit rich text in the page, add comments, and export back to `.docx`. Built with [Next.js](https://nextjs.org) (App Router), [TipTap](https://tiptap.dev), [Mammoth](https://github.com/mwilliamson/mammoth.js) for import, and `html-to-docx` for export.

## Features

- **Import / export** — `.docx` → HTML (edit) → `.docx` download
- **Rich text** — headings, lists, links, images, alignment, font family & size, highlight, tables (resize, merge/split, headers), and more
- **Comments** — select text and add comments shown in the sidebar
- **Toolbar** — grouped controls with labeled sections for quicker scanning

## Requirements

- [Node.js](https://nodejs.org/) 20+ (recommended)
- [pnpm](https://pnpm.io/) (or npm / yarn / bun)

## Getting started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command       | Description                    |
| ------------- | ------------------------------ |
| `pnpm dev`    | Start dev server (Turbopack)   |
| `pnpm build`  | Production build               |
| `pnpm start`  | Run production server          |
| `pnpm lint`   | Run ESLint                     |

## Project layout

- `app/` — Next.js routes, layout, global styles
- `app/api/export-docx/` — server route that turns HTML into a `.docx` blob
- `components/` — UI (e.g. `docx-editor.tsx`, `ui/`)
- `extensions/` — TipTap extensions (e.g. comment marks)
- `lib/` — helpers (`docx` import/export helpers)

## AI assistants & [graphify](https://github.com/safishamsi/graphify)

This repo includes **graphify** integration for Cursor and Claude (via `CLAUDE.md` → `AGENTS.md`):

- **Cursor:** `.cursor/rules/graphify.mdc` (always applied) — points the assistant at `graphify-out/GRAPH_REPORT.md` once you build a graph.
- **Claude Code / same instructions:** `AGENTS.md` § graphify.

**One-time setup (Python 3.10+):**

```bash
pip install graphifyy
graphify install
# If `graphify` is not on PATH (Windows): use `python -m graphify install` — same subcommands, e.g. `python -m graphify cursor install`
```

**Build the full knowledge graph (first time or after doc/image changes):** this is **not** a plain terminal path. Use your AI tool’s **slash command** so the graphify skill runs (e.g. in **Claude Code** type **`/graphify .`** at the repo root). That is different from `python -m graphify .`, which will error — the CLI has no `.` command.

**Terminal-only (no LLM) — after a graph exists, code-only refresh:**

```bash
python -m graphify update .
```

**Other CLI examples:** `python -m graphify --help`, `python -m graphify query "…"`, `python -m graphify watch .`

Outputs go to `graphify-out/` (ignored by git). See the [graphify README](https://github.com/safishamsi/graphify/blob/v4/README.md) for `query`, `.graphifyignore`, and MCP options.

## Notes

- Very complex tables (deep nesting, heavy merging) may not round-trip perfectly between import and export.
- Refer to `AGENTS.md` / `CLAUDE.md` for repo-specific conventions when contributing.

## Deploy

You can deploy like any Next.js app (e.g. [Vercel](https://vercel.com/docs/frameworks/nextjs)). Ensure the `/api/export-docx` route runs in your hosting environment.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [TipTap documentation](https://tiptap.dev/docs)
