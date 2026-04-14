<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost). If the CLI is not on PATH, use `python -m graphify update .`

Official tool: [safishamsi/graphify](https://github.com/safishamsi/graphify). Install: `pip install graphifyy` and `graphify install` (or `python -m graphify install`). **Full graph build:** use the assistant slash command **`/graphify .`** at the project root (e.g. Claude Code) — **not** `python -m graphify .` (that CLI has no such command). **Code-only refresh from terminal:** `python -m graphify update .` after `graphify-out/` exists. Cursor rule: `.cursor/rules/graphify.mdc`.
