# Custom DOCX Editor — UI Design Specification
**Route:** `http://localhost:3000/`

---

## Aesthetic Direction: *Warm Editorial*

This interface is a premium document editing environment — not a productivity SaaS, not a Chrome extension. The reference world is a bespoke publishing house: warm linen paper, ink that means something, tools that recede so the writing commands full attention.

Every surface decision asks: **does this help the words, or compete with them?**

**What makes it unforgettable:** The paper. It looks and feels like paper — warm, textured, generous margins, deep warm shadows. Everything else (chrome, toolbar, sidebar) is intentionally subordinate.

---

## Typography System

| Role | Font | Rationale |
|------|------|-----------|
| UI chrome (header, toolbar, sidebar) | `Instrument Sans` — geometric sans, clean but characterful | Crisp enough to read at 11–13 px; distinctive enough to not feel generic |
| Document body (inside paper) | `Lora` — optical-size serif, designed for reading | Makes the document feel like a real document, not a form |
| Document headings | `Fraunces` — variable-axis quirky serif | Adds literary personality to H1–H3; H4–H6 fall back to Lora |
| Code & mono | `Fira Code` — humanist monospace with ligatures | Warm, not cold; matches the editorial tone |
| Status bar / metadata | `Instrument Sans` tabular numbers | Counters and page estimates read cleanly |

**Google Fonts import (in `globals.css`):**
```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Instrument+Sans:wght@400;500;600&family=Lora:ital,wght@0,400..700;1,400..700&family=Fira+Code:wght@400;500&display=swap');
```

**CSS variables:**
```css
--font-ui:       'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
--font-prose:    'Lora', Georgia, 'Times New Roman', serif;
--font-display:  'Fraunces', Georgia, serif;
--font-mono:     'Fira Code', 'Cascadia Code', monospace;
```

---

## Colour System

The palette is warm-biased throughout. No cool greys. No pure whites. No sterile black.

```css
:root {
  /* Surfaces */
  --c-canvas:      #EDE8DF;   /* warm linen — the world around the paper */
  --c-paper:       #FEFCF5;   /* warm near-white — the document page */
  --c-chrome:      #F5F0E6;   /* header, toolbar — same warmth as canvas */
  --c-chrome-glass:rgba(245, 240, 230, 0.92); /* toolbar backdrop */

  /* Ink / text */
  --c-ink:         #1C1712;   /* near-black with warmth — main text */
  --c-ink-muted:   #6B5F52;   /* secondary text, labels */
  --c-ink-faint:   #A89A8C;   /* placeholders, timestamps */

  /* Borders */
  --c-border:      #D6CEC2;   /* default borders */
  --c-border-soft: #E8E0D5;   /* paper edge, subtle dividers */

  /* Accent — Terracotta */
  --c-accent:      #C2410C;   /* active toolbar button bg, primary action */
  --c-accent-dark: #9A330A;   /* hover on accent */
  --c-accent-tint: #FEF0E7;   /* highlight background behind accent text */

  /* Semantic */
  --c-comment:     #FDE68A;   /* amber-200 — comment marks in text */
  --c-comment-bg:  #FFFBEB;   /* comment card background */
  --c-select:      rgba(194, 65, 12, 0.12); /* text selection */
  --c-error:       #B91C1C;
  --c-error-bg:    #FEF2F2;
  --c-error-border:#FECACA;
}
```

**Colour roles:**
| Token | Used for |
|-------|---------|
| `--c-canvas` | Page background, `.editor-canvas` fill |
| `--c-paper` | `.editor-canvas-paper` fill |
| `--c-chrome` | Header bar, toolbar strip |
| `--c-accent` | Primary button, toolbar active state |
| `--c-comment` | `span.comment-mark` highlight |
| `--c-select` | ProseMirror `::selection` |

---

## Texture & Atmosphere

### Canvas background
Replace the mechanical dot grid with a warm linen texture:
```css
.editor-canvas {
  background-color: var(--c-canvas);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}
```

### Paper surface
The paper has warmth, grain, and depth:
```css
.editor-canvas-paper {
  background-color: var(--c-paper);
  background-image:
    url("data:image/svg+xml,...noise-grain..."); /* same noise, opacity 0.025 */
  box-shadow:
    0 0 0 1px var(--c-border-soft),
    0 2px 4px  rgba(28, 23, 18, 0.04),
    0 8px 20px rgba(28, 23, 18, 0.07),
    0 32px 64px rgba(28, 23, 18, 0.10),
    0 64px 96px rgba(28, 23, 18, 0.06);
}
```

### Header & toolbar tint
Both use the canvas warmth, not stark white:
```css
background-color: var(--c-chrome-glass);
backdrop-filter: blur(16px) saturate(1.4);
```

---

## Motion Specification

### Principles
- **One entrance per zone, not per element.** The page loads with three staggered reveals — header, toolbar, canvas — not 40 individual tweens.
- **Buttons feel physical.** Press them down with `scale(0.94)`. Hover lifts them with a colour shift. No bounce, no spring.
- **Dialogs breathe in.** `fade-in zoom-in-95` — not a slide, not a pop.
- **Nothing auto-plays.** All motion is triggered by user intent.

### Page load — staggered reveal
```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

header        { animation: fade-up 300ms ease both; }
.toolbar      { animation: fade-up 300ms ease 80ms both; }
.editor-canvas{ animation: fade-up 300ms ease 160ms both; }
aside         { animation: fade-up 300ms ease 220ms both; }
```

### Toolbar buttons
```css
.toolbar-btn {
  transition: background-color 120ms ease, color 120ms ease, transform 80ms ease;
}
.toolbar-btn:active { transform: scale(0.94); }
```

### BubbleMenu
```css
/* TipTap BubbleMenu wrapper */
animation: fade-up 120ms ease both;
```

### Dialogs (Radix)
```css
[data-state=open]  { animation: zoom-in 180ms cubic-bezier(0.16,1,0.3,1) both; }
[data-state=closed]{ animation: zoom-out 140ms ease both; }

@keyframes zoom-in  { from { opacity:0; transform: scale(0.95); } to { opacity:1; transform: scale(1); } }
@keyframes zoom-out { from { opacity:1; transform: scale(1);    } to { opacity:0; transform: scale(0.97); } }
```

### Paper: upload-complete pulse
After a document loads, the paper does a single warm pulse:
```css
@keyframes paper-settle {
  0%   { box-shadow: 0 0 0 3px rgba(194,65,12,0.15), ...normal shadows...; }
  100% { box-shadow: ...normal shadows only...; }
}
.editor-canvas-paper.just-loaded { animation: paper-settle 600ms ease-out both; }
```

### Drag overlay
```css
.drag-overlay { animation: fade-in 80ms ease both; }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
```

### Error banner
```css
.error-banner { animation: slide-down 200ms cubic-bezier(0.16,1,0.3,1) both; }
@keyframes slide-down { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }
```

---

## Layout & Spatial Composition

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER  sticky · z-30 · h-[52px] · bg: --c-chrome-glass            │
│  border-b: 1px solid --c-border-soft · backdrop-blur-xl              │
├──────────────────────────────────────────────────────────────────────┤
│  TOOLBAR  sticky · z-20 · top-[52px] · bg: --c-chrome-glass         │
│  border-b: 1px solid --c-border-soft · backdrop-blur-xl              │
│  ── Row 1: Structure & Typography ──────────────────────────────── │
│  ── Row 2: Inline Formatting ───────────────────────────────────── │
│  ── Row 3: Tables & Insert ─────────────────────────────────────── │
├──────────────────────────────────────────────────────────────────────┤
│  ERROR BANNER  (conditional)                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  MAIN CONTENT  max-w-[1360px] · px-5→12 · pt-8 · pb-6              │
│  ┌──────────────────────────────────┬───────────────────────────┐   │
│  │  CANVAS  order-1  flex-1         │  SIDEBAR  order-2         │   │
│  │  .editor-canvas  p-8→14          │  min-w-[280px] max-w-[340px]  │
│  │  linen texture bg                │  sticky top-[calc(52px+toolbar)]  │
│  │                                  │                           │   │
│  │  ┌──────────────────────────┐    │  ┌─────────────────────┐  │   │
│  │  │  PAPER  max-w-[816px]    │    │  │  Comments           │  │   │
│  │  │  .editor-canvas-paper    │    │  │  header + badge     │  │   │
│  │  │  px-[96px] py-[96px]     │    │  │  ─────────────────  │  │   │
│  │  │                          │    │  │  card list          │  │   │
│  │  │  [placeholder OR prose]  │    │  │  (scrollable)       │  │   │
│  │  │  [BubbleMenu on select]  │    │  └─────────────────────┘  │   │
│  │  └──────────────────────────┘    │                           │   │
│  └──────────────────────────────────┴───────────────────────────┘   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  STATUS BAR  border-t --c-border-soft · bg --c-chrome · h-8         │
│  Words · Characters · ~N pages · filename (right)                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1 — Header Bar

**Container:**
```
sticky top-0 z-30 h-[52px] shrink-0
border-b border-[--c-border-soft]
bg-[--c-chrome-glass] backdrop-blur-xl backdrop-saturate-150
```

**Inner layout:** `mx-auto max-w-[1360px] flex items-center justify-between gap-3 px-5 sm:px-8 lg:px-12`

### Left — Brand identity
| Element | Spec |
|---------|------|
| Logotype | `DOCX` in `font-[--font-display] font-semibold text-lg tracking-tight text-[--c-ink]` — no box, no icon wrapper; the word itself is the brand |
| Divider | `w-px h-4 bg-[--c-border] mx-2` |
| File name | `font-[--font-ui] text-sm text-[--c-ink-muted] truncate max-w-[260px]` — current filename |

### Right — Actions
| Button | Style |
|--------|-------|
| Upload | `h-8 px-3 rounded-md border border-[--c-border] bg-transparent text-[--c-ink-muted] text-sm font-[--font-ui] font-medium hover:bg-[--c-accent-tint] hover:text-[--c-accent] hover:border-[--c-accent] transition-colors` |
| Export DOCX | `h-8 px-4 rounded-md bg-[--c-accent] text-white text-sm font-[--font-ui] font-medium hover:bg-[--c-accent-dark] shadow-[0_1px_3px_rgba(194,65,12,0.35)] transition-colors` |

During `isProcessing`: `Loader2` spinner at `size-3.5 animate-spin` replaces the button icon.

---

## 2 — Toolbar

**Container:**
```
sticky top-[52px] z-20 flex flex-col gap-2.5
border-b border-[--c-border-soft]
bg-[--c-chrome-glass] backdrop-blur-xl backdrop-saturate-150
px-5 py-2.5 sm:px-8 lg:px-12
```

### Section label style
```
text-[9px] font-semibold uppercase tracking-[0.12em] text-[--c-ink-faint]
```
Rendered as a hairline — barely there, purely functional.

### ToolbarCluster
```
flex flex-wrap items-center gap-0.5
rounded-lg border border-[--c-border-soft]
bg-[rgba(255,252,240,0.7)] p-0.5
```

### ToolbarButton
```
h-8 w-8 shrink-0 rounded-md
font-[--font-ui] text-[--c-ink-muted]
hover:bg-[--c-accent-tint] hover:text-[--c-accent]
transition-colors duration-100
active:scale-[0.94]
```
**Active state:**
```
bg-[--c-accent] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]
hover:bg-[--c-accent-dark] hover:text-white
```

---

### Row 1 — Structure & Typography

| Section | Controls | Notes |
|---------|----------|-------|
| HISTORY | Undo2, Redo2 | Disabled = `opacity-30 pointer-events-none` |
| BLOCK | ¶ Paragraph, H1, H2, H3 icons; `H4` `H5` `H6` text labels | H4–H6 use `text-[10px] font-semibold font-[--font-ui]` |
| ALIGN | AlignLeft, AlignCenter, AlignRight, AlignJustify | — |
| FONT | `<select>` family (min-w-[128px]) + `<select>` size (w-[80px]) | Both: `h-8 rounded-md border border-[--c-border-soft] bg-[--c-paper] px-2 text-sm font-[--font-ui] text-[--c-ink] focus:ring-1 focus:ring-[--c-accent]` |

**Font family options:** Default, Lora, Fraunces, Georgia, Times New Roman, Cambria, Verdana, Trebuchet MS, Courier New, Fira Code

**Font size options:** Default, 8pt → 48pt (14 steps)

---

### Row 2 — Inline Formatting

| Section | Controls |
|---------|----------|
| STYLE | Bold, Italic, Underline, Strikethrough, Code, Link2 |
| HIGHLIGHT | Highlighter toggle · 5 swatches · Ban (clear) |
| SCRIPT | Subscript, Superscript |
| BLOCKS | Code2, Quote, Minus (HR), CornerDownLeft (hard break), RemoveFormatting |
| LISTS | List (bullet), ListOrdered |

**Highlight swatches:** `h-8 w-8` ghost button containing `h-3.5 w-3.5 rounded-full border border-[--c-border] shadow-sm` colour circle.

Swatch colours: `#FDE68A` (amber), `#BFDBFE` (sky), `#BBF7D0` (mint), `#FECACA` (rose), `#E9D5FF` (lavender).

Active swatch: terracotta ring `ring-1 ring-[--c-accent] ring-offset-1 ring-offset-[--c-chrome]`.

---

### Row 3 — Tables & Insert

Three sub-clusters inside the Table section:

| Sub-cluster | Controls |
|-------------|----------|
| Insert & Rows | Table2 (picker), ArrowUpToLine, ArrowDownToLine, Trash2, ArrowLeftToLine, ArrowRightToLine, Scissors |
| Header Style | LayoutPanelTop, LayoutPanelLeft, Grid2x2 |
| Cells | Merge, TableColumnsSplit, ChevronLeft, ChevronRight, XCircle |

Insert section: `ImagePlus` (opens image URL dialog).

Table buttons: `opacity-30 pointer-events-none` when cursor is not inside a table.

---

## 3 — Error Banner

```
rounded-full border border-[--c-error-border] bg-[--c-error-bg]
px-4 py-2 text-sm font-[--font-ui] text-[--c-error]
role="alert"
animation: slide-down 200ms cubic-bezier(0.16,1,0.3,1)
```

Placed `mx-auto max-w-[1360px] px-5 pt-3 sm:px-8 lg:px-12`.

---

## 4 — Editor Canvas

**Class `.editor-canvas`:**
```
relative rounded-2xl
border border-[--c-border-soft]
p-8 sm:p-10 md:p-12 lg:p-14
background: linen texture (see Texture section above)
```

### Drag-and-drop overlay
Shown when a `.docx` file is dragged over the canvas.
```
absolute inset-0 z-20 rounded-2xl
flex flex-col items-center justify-center gap-3
border-2 border-dashed border-[--c-accent]
bg-[rgba(254,240,231,0.85)] backdrop-blur-sm
pointer-events-none aria-hidden
animation: fade-in 80ms ease
```
Content:
- `Upload` icon — `size-12 text-[--c-accent] stroke-[1.5]`
- "Drop .docx to open" — `font-[--font-display] text-xl font-semibold text-[--c-ink]`

---

## 5 — Paper Element

**`.editor-canvas-paper`:**
```
mx-auto w-full max-w-[816px]
px-6 py-8 md:px-[96px] md:py-[96px]    ← 1-inch Word margins at md+
rounded-[2px]
border border-[--c-border-soft]
background: --c-paper + noise grain (opacity 0.025)
box-shadow: 4-layer warm shadow (see Texture section)
```

**Focus-within:** `ring-1 ring-[--c-accent]/20 ring-offset-2 ring-offset-[--c-canvas]`

**`min-height` of ProseMirror:** `min(70vh, 960px)`; in placeholder mode: `min(52vh, 680px)`

---

### 5a — Empty / Placeholder State

Shown when `editor.isEmpty`. Sits above the ProseMirror area.

```
mb-8 rounded-xl
border-2 border-dashed border-[--c-border]
bg-[rgba(254,252,245,0.7)]
p-8 text-center
```

| Element | Spec |
|---------|------|
| Icon | `Upload` — `size-12 stroke-[1.5] text-[--c-accent]` (no wrapper box) |
| Headline | `mt-5 font-[--font-display] text-xl font-semibold tracking-tight text-[--c-ink]` — "Open a document" |
| Sub-copy | `mt-2 max-w-xs font-[--font-ui] text-sm leading-relaxed text-[--c-ink-muted]` |
| CTA | outline upload button in terracotta accent: `border-[--c-accent] text-[--c-accent] hover:bg-[--c-accent-tint]` |

---

### 5b — Document Typography

All inside `.editor-canvas-paper .ProseMirror`. Body text uses `--font-prose` (Lora). Headings H1–H3 use `--font-display` (Fraunces).

| Element | CSS |
|---------|-----|
| Body text | `font-family: var(--font-prose); font-size: 16px; line-height: 1.75; color: var(--c-ink)` |
| H1 | `font-family: var(--font-display); font-size: 2.25rem; font-weight: 700; letter-spacing: -0.02em; color: var(--c-ink)` |
| H2 | `font-family: var(--font-display); font-size: 1.625rem; font-weight: 600; color: var(--c-ink)` |
| H3 | `font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--c-ink)` |
| H4 | `font-family: var(--font-prose); font-size: 1.1rem; font-weight: 700; color: var(--c-ink)` |
| H5 | `font-family: var(--font-prose); font-size: 1rem; font-weight: 700; font-style: italic; color: var(--c-ink)` |
| H6 | `font-family: var(--font-ui); font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--c-ink-muted)` |
| `<a>` | `color: var(--c-accent); text-decoration: underline; text-underline-offset: 3px` |
| `<mark>` | `background: var(--c-comment); border-radius: 3px; padding: 0 2px` |
| `.comment-mark` | `background: var(--c-comment); border-bottom: 1.5px solid #D97706; border-radius: 2px; padding: 0 2px` |
| `<blockquote>` | `border-left: 3px solid var(--c-accent); padding-left: 1.25rem; color: var(--c-ink-muted); font-style: italic` |
| `<hr>` | `border: none; border-top: 1px solid var(--c-border); margin: 2rem 0` |
| `<code>` | `font-family: var(--font-mono); font-size: 0.875em; background: var(--c-accent-tint); color: var(--c-accent); border-radius: 4px; padding: 1px 5px` |
| `<pre>` | `font-family: var(--font-mono); background: var(--c-ink); color: var(--c-paper); border-radius: 8px; padding: 1rem 1.25rem; font-size: 0.875rem` |
| `<img>` | `max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(28,23,18,0.12)` |
| `<table>` | `width: 100%; border-collapse: collapse; border: 1px solid var(--c-border)` |
| `<td>`, `<th>` | `border: 1px solid var(--c-border); padding: 0.5rem 0.75rem; vertical-align: top` |
| `<th>` | `background: var(--c-accent-tint); font-family: var(--font-ui); font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--c-ink)` |
| `::selection` | `background: var(--c-select)` |
| Table wrapper | `overflow-x: auto; margin: 1.5rem 0` |

---

### 5c — BubbleMenu

Appears on any non-empty text selection.

```
z-50 flex items-center gap-1
rounded-lg border border-[--c-border]
bg-[--c-paper] px-1 py-1
shadow-[0_4px_16px_rgba(28,23,18,0.14)]
animation: fade-up 120ms ease
```

| State | Content |
|-------|---------|
| Selection has comment mark | `"Remove comment"` — outline `sm` button, terracotta text |
| No comment mark | `"Comment"` — solid terracotta `sm` button, `MessageSquarePlus` icon + label |

---

## 6 — Comments Sidebar

**Container:**
```
order-2 w-full min-w-0
lg:min-w-[280px] lg:max-w-[340px]
h-fit
rounded-xl border border-[--c-border-soft]
bg-[--c-paper]
p-5
shadow-[0_1px_0_rgba(28,23,18,0.04),0_8px_24px_rgba(28,23,18,0.08)]
lg:sticky lg:top-[calc(52px+toolbar-height)]
lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto
```

**Header row:** `mb-4 pb-4 border-b border-[--c-border-soft] flex items-center justify-between`
- Label: `font-[--font-ui] text-sm font-semibold text-[--c-ink]` — "Comments"
- Count badge: `rounded-full bg-[--c-accent] px-2.5 py-0.5 text-xs font-semibold font-[--font-ui] text-white tabular-nums`

**Empty state:** `font-[--font-ui] text-sm leading-relaxed text-[--c-ink-muted]`

### Comment card

```
rounded-lg border p-3 cursor-pointer
transition-colors duration-100 outline-none
font-[--font-ui]
hover:border-[--c-border]
focus-visible:ring-1 focus-visible:ring-[--c-accent]
```

| State | Border | Background |
|-------|--------|------------|
| Default | `--c-border-soft` | transparent |
| Active (cursor on marked text) | `--c-accent` | `--c-comment-bg` |
| Resolved | default + `opacity-55` | — |

Card internals:
- Comment text: `text-sm leading-snug text-[--c-ink]` (Instrument Sans)
- Timestamp: `mt-1.5 text-[11px] text-[--c-ink-faint]`
- Active accent: `border-l-2 border-[--c-accent] -ml-3 pl-2.5` on the active card (left terracotta stripe)
- Actions row: `mt-2.5 flex flex-wrap gap-1.5`
  - Edit: `size-7 rounded-md` outline button + `Pencil` at `size-3`
  - Resolve / Unresolve: `h-7 px-2.5 text-xs` outline button
  - Delete: `size-7 rounded-md` outline button + `Trash2` at `size-3`

---

## 7 — Status Bar

```
flex min-h-8 flex-wrap items-center gap-x-5 gap-y-1
border-t border-[--c-border-soft]
bg-[--c-chrome]
px-5 py-1.5
font-[--font-ui] text-[11px] tabular-nums text-[--c-ink-faint]
```

| Slot | Content |
|------|---------|
| Words | `Words: ` + `<strong class="text-[--c-ink-muted] font-medium">{n}</strong>` |
| Characters | `Characters: ` + `<strong class="text-[--c-ink-muted] font-medium">{n}</strong>` |
| Pages | `~{n} page` / `~{n} pages` — `Math.ceil(words / 250)` |
| Filename | `ml-auto min-w-0 truncate text-[--c-ink-faint]` — right-aligned |

---

## 8 — Dialogs

All Radix `<Dialog>` — focus-trapped, Escape to close, portal-rendered.

**Overlay:** `bg-[rgba(28,23,18,0.45)] backdrop-blur-sm`

**Content panel:**
```
rounded-xl border border-[--c-border-soft]
bg-[--c-paper]
p-6 shadow-[0_16px_64px_rgba(28,23,18,0.2)]
font-[--font-ui]
animation: zoom-in 180ms cubic-bezier(0.16,1,0.3,1)
```

**Dialog title:** `font-[--font-display] text-xl font-semibold text-[--c-ink]`
**Dialog description:** `text-sm text-[--c-ink-muted] leading-relaxed mt-1`

**Input / Textarea base:**
```
rounded-md border border-[--c-border]
bg-[--c-paper]
px-3 py-2 text-sm font-[--font-ui] text-[--c-ink]
outline-none
focus:ring-1 focus:ring-[--c-accent] focus:border-[--c-accent]
transition-shadow duration-100
```

**Footer button row:** `flex items-center justify-end gap-2 mt-5`
- Cancel: `outline` variant — `border-[--c-border] text-[--c-ink-muted] hover:bg-[--c-accent-tint] hover:text-[--c-accent]`
- Primary: `bg-[--c-accent] text-white hover:bg-[--c-accent-dark] shadow-[0_1px_3px_rgba(194,65,12,0.3)]`

### Comment dialog
- Body: `<textarea>` `min-h-[120px] resize-y`
- `autoFocus` on open

### Insert table dialog
- 10×10 grid picker:
  - Cells: `size-4 rounded-sm border transition-colors`
  - In selection: `border-[--c-accent] bg-[--c-accent]`
  - Out: `border-[--c-border-soft] bg-[--c-canvas] hover:bg-[--c-accent-tint]`
- Grid wrapper: `rounded-lg border border-[--c-border-soft] bg-[--c-canvas] p-2`
- Size label: `text-center text-sm font-semibold tabular-nums text-[--c-ink] mt-3`
- Header row toggle: `accent-[--c-accent]` native checkbox

### Insert image dialog
- Single URL `<input type="text">` `h-9 w-full`
- Insert button disabled when input is empty

---

## 9 — Responsiveness

| Breakpoint | Behaviour |
|------------|-----------|
| `< sm` (< 640 px) | Header shows icon-only buttons; toolbar wraps more aggressively; paper padding `px-6 py-8` |
| `sm` (≥ 640 px) | Header buttons show text labels |
| `< md` (< 768 px) | Paper at `px-6 py-8` |
| `md` (≥ 768 px) | Paper at full `px-[96px] py-[96px]` (Word 1-inch margins) |
| `< lg` (< 1024 px) | Sidebar stacks below canvas, full width, not sticky |
| `lg` (≥ 1024 px) | Side-by-side grid; sidebar sticky |

---

## 10 — Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Y` | Redo |
| `Ctrl/Cmd+B` | Bold |
| `Ctrl/Cmd+I` | Italic |
| `Ctrl/Cmd+U` | Underline |
| `Tab` (in table) | Next cell |
| `Shift+Tab` (in table) | Previous cell |
| `Escape` | Close dialog |

---

## 11 — Accessibility

| Pattern | Implementation |
|---------|----------------|
| Toolbar rows | `role="toolbar"` + `aria-label` |
| Button groups | `role="group"` via `ToolbarCluster` |
| Every toolbar button | `title` + `aria-label` (same string) |
| Font selects | `<label class="sr-only">` with `htmlFor` |
| Colour swatches | `aria-label="Highlight warm amber"` etc. |
| Comment cards | `role="button" tabIndex={0}` + Enter/Space handler |
| Drag overlay | `aria-hidden pointer-events-none` |
| Error banner | `role="alert"` |
| Dialogs | Radix — focus trapped, Escape closes, portal |
| Processing state | `aria-label` on spinner describes action |
| Focus ring | `ring-1 ring-[--c-accent]` everywhere — terracotta, not the default browser blue |

---

## 12 — What Makes It Unforgettable

1. **The paper IS the product.** The linen canvas, warm shadows, and grain texture make the document feel like something worth writing. Not a form, not a SaaS — a document.
2. **Terracotta accent throughout.** One sharp colour runs from the primary button through active toolbar states, the insert-table grid, the focus ring, and comment marks. Cohesion without repetition.
3. **Fraunces headings.** The variable optical-size serif adds unexpected literary character to every H1 in every uploaded document.
4. **Everything else recedes.** The header is 52 px and warm-tinted, not a proud branding exercise. The toolbar blends into the canvas warmth. When you read, the chrome disappears.
