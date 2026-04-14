"use client";

import type { Editor } from "@tiptap/core";
import { type DragEvent, type ReactNode, useEffect, useRef, useState } from "react";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Ban,
  Bold,
  ChevronLeft,
  ChevronRight,
  Code,
  ChartColumn,
  Code2,
  CornerDownLeft,
  Frame,
  Grid2x2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Merge,
  MessageSquarePlus,
  Minus,
  LayoutPanelLeft,
  LayoutPanelTop,
  Pencil,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  Scissors,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  TableColumnsSplit,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Upload,
  XCircle,
} from "lucide-react";
import { saveAs } from "file-saver";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";

import { importDocx, exportDocx } from "@/lib/docx";
import { ChartBlock } from "@/extensions/chart-block";
import { CommentMark } from "@/extensions/comment-mark";
import { Figure } from "@/extensions/figure";
import type { EditorState } from "@/types/editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EMPTY_CONTENT = "<p></p>";
const HIGHLIGHT_COLORS = [
  { hex: "#FDE68A", label: "warm amber" },
  { hex: "#BFDBFE", label: "sky blue" },
  { hex: "#BBF7D0", label: "mint" },
  { hex: "#FECACA", label: "rose" },
  { hex: "#E9D5FF", label: "lavender" },
];
const INSERT_TABLE_MAX = 10;

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Lora", value: "var(--font-lora), Georgia, serif" },
  { label: "Fraunces", value: "var(--font-fraunces), Georgia, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Cambria", value: "Cambria, Georgia, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Fira Code", value: "var(--font-fira), monospace" },
];

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "8 pt", value: "8pt" },
  { label: "9 pt", value: "9pt" },
  { label: "10 pt", value: "10pt" },
  { label: "11 pt", value: "11pt" },
  { label: "12 pt", value: "12pt" },
  { label: "14 pt", value: "14pt" },
  { label: "16 pt", value: "16pt" },
  { label: "18 pt", value: "18pt" },
  { label: "20 pt", value: "20pt" },
  { label: "24 pt", value: "24pt" },
  { label: "28 pt", value: "28pt" },
  { label: "36 pt", value: "36pt" },
  { label: "48 pt", value: "48pt" },
];

interface CommentItem {
  id: string;
  text: string;
  resolved: boolean;
  createdAt: string;
}

function getBlockTextAlign(editor: Editor | null): "left" | "center" | "right" | "justify" {
  if (!editor) return "left";
  const node = editor.state.selection.$from.parent;
  const ta = node.attrs.textAlign as string | undefined;
  if (ta === "center" || ta === "right" || ta === "justify" || ta === "left") return ta;
  return "left";
}

function isCursorInTable(editor: Editor | null): boolean {
  if (!editor) return false;
  const { $anchor } = editor.state.selection;
  for (let d = $anchor.depth; d > 0; d--) {
    if ($anchor.node(d).type.name === "table") return true;
  }
  return false;
}

function findCommentRange(editor: Editor, commentId: string): { from: number; to: number } | null {
  let from: number | null = null;
  let to: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const mark = node.marks.find(
      (m) => m.type.name === "comment" && m.attrs.commentId === commentId,
    );
    if (mark) {
      const textLen = node.text?.length ?? 0;
      const start = pos;
      const end = pos + textLen;
      if (from === null || to === null) {
        from = start;
        to = end;
      } else {
        from = Math.min(from, start);
        to = Math.max(to, end);
      }
    }
    return true;
  });
  if (from === null || to === null) return null;
  return { from, to };
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  children,
  title,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "toolbar-btn h-8 w-8 min-w-8 shrink-0 rounded-md text-[var(--c-ink-muted)] hover:bg-[var(--c-accent-tint)] hover:text-[var(--c-accent)]",
        disabled && "pointer-events-none opacity-30",
        active &&
          "bg-[var(--c-accent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[var(--c-accent-dark)] hover:text-white",
        className,
      )}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1.5 h-7 w-px shrink-0 bg-[var(--c-border)]/80" aria-hidden />;
}

function ToolbarGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {children}
    </div>
  );
}

/** Flat cluster (Google Docs–style: no boxed border, no label row). */
function ToolbarCluster({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ToolbarGroup label={label} className={className}>
      {children}
    </ToolbarGroup>
  );
}

function ToolbarSection({
  title,
  children,
  bare = false,
  clusterClassName,
}: {
  title: string;
  children: ReactNode;
  bare?: boolean;
  clusterClassName?: string;
}) {
  if (bare) {
    return <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{children}</div>;
  }
  return <ToolbarCluster label={title} className={clusterClassName}>{children}</ToolbarCluster>;
}

function getBlockTypeSelectValue(s: {
  isHeading1: boolean;
  isHeading2: boolean;
  isHeading3: boolean;
  isHeading4: boolean;
  isHeading5: boolean;
  isHeading6: boolean;
}): string {
  if (s.isHeading1) return "h1";
  if (s.isHeading2) return "h2";
  if (s.isHeading3) return "h3";
  if (s.isHeading4) return "h4";
  if (s.isHeading5) return "h5";
  if (s.isHeading6) return "h6";
  return "paragraph";
}

export function DocxEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    content: EMPTY_CONTENT,
    isProcessing: false,
    fileName: "untitled.docx",
  });
  const [error, setError] = useState<string>("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string>("");
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentDialogMode, setCommentDialogMode] = useState<"add" | "edit">("add");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const pendingSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const [insertTableOpen, setInsertTableOpen] = useState(false);
  const [insertTableHover, setInsertTableHover] = useState({ rows: 3, cols: 3 });
  const [insertTableHeaderRow, setInsertTableHeaderRow] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [paperPulse, setPaperPulse] = useState(false);
  const canvasDropRef = useRef<HTMLDivElement>(null);
  const [figureDialogOpen, setFigureDialogOpen] = useState(false);
  const [figureUrlDraft, setFigureUrlDraft] = useState("");
  const [figureAltDraft, setFigureAltDraft] = useState("");
  const [figureCaptionDraft, setFigureCaptionDraft] = useState("");
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [chartTitleDraft, setChartTitleDraft] = useState("");
  const [chartTypeDraft, setChartTypeDraft] = useState<"bar" | "line">("bar");
  const [chartLabelsDraft, setChartLabelsDraft] = useState("Q1,Q2,Q3,Q4");
  const [chartValuesDraft, setChartValuesDraft] = useState("12,19,14,22");
  const [chartCaptionDraft, setChartCaptionDraft] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-[var(--c-accent)] underline underline-offset-[3px]",
          },
        },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CommentMark,
      BubbleMenuExtension,
      Subscript,
      Superscript,
      Table.configure({
        resizable: true,
        renderWrapper: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: true,
      }),
      Figure,
      ChartBlock,
    ],
    content: editorState.content,
  });

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor?.isActive("bold") ?? false,
      isItalic: currentEditor?.isActive("italic") ?? false,
      isStrike: currentEditor?.isActive("strike") ?? false,
      isUnderline: currentEditor?.isActive("underline") ?? false,
      isCode: currentEditor?.isActive("code") ?? false,
      isLink: currentEditor?.isActive("link") ?? false,
      isCommentMark: currentEditor?.isActive("comment") ?? false,
      isHighlight: currentEditor?.isActive("highlight") ?? false,
      highlightColor: (currentEditor?.getAttributes("highlight").color as string) ?? "",
      selectedCommentId: (currentEditor?.getAttributes("comment").commentId as string) ?? "",
      isSubscript: currentEditor?.isActive("subscript") ?? false,
      isSuperscript: currentEditor?.isActive("superscript") ?? false,
      isBulletList: currentEditor?.isActive("bulletList") ?? false,
      isOrderedList: currentEditor?.isActive("orderedList") ?? false,
      isBlockquote: currentEditor?.isActive("blockquote") ?? false,
      isCodeBlock: currentEditor?.isActive("codeBlock") ?? false,
      isHeading1: currentEditor?.isActive("heading", { level: 1 }) ?? false,
      isHeading2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      isHeading3: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      isHeading4: currentEditor?.isActive("heading", { level: 4 }) ?? false,
      isHeading5: currentEditor?.isActive("heading", { level: 5 }) ?? false,
      isHeading6: currentEditor?.isActive("heading", { level: 6 }) ?? false,
      isParagraph: currentEditor?.isActive("paragraph") ?? true,
      inTable: isCursorInTable(currentEditor ?? null),
      textAlign: getBlockTextAlign(currentEditor ?? null),
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
      canMergeCells: currentEditor?.can().chain().focus().mergeCells().run() ?? false,
      canSplitCell: currentEditor?.can().chain().focus().splitCell().run() ?? false,
      fontFamily: (currentEditor?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
      fontSize: (currentEditor?.getAttributes("textStyle").fontSize as string | undefined) ?? "",
    }),
  });
  const currentToolbarState = toolbarState ?? {
    isBold: false,
    isItalic: false,
    isStrike: false,
    isUnderline: false,
    isCode: false,
    isLink: false,
    isCommentMark: false,
    isHighlight: false,
    highlightColor: "",
    selectedCommentId: "",
    isSubscript: false,
    isSuperscript: false,
    isBulletList: false,
    isOrderedList: false,
    isBlockquote: false,
    isCodeBlock: false,
    isHeading1: false,
    isHeading2: false,
    isHeading3: false,
    isHeading4: false,
    isHeading5: false,
    isHeading6: false,
    isParagraph: true,
    inTable: false,
    textAlign: "left" as const,
    canUndo: false,
    canRedo: false,
    canMergeCells: false,
    canSplitCell: false,
    fontFamily: "",
    fontSize: "",
  };

  const isPlaceholderDoc = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => (currentEditor ? currentEditor.isEmpty : false),
  });

  const wordStats = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) return { words: 0, chars: 0 };
      const text = currentEditor.getText().trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      return { words, chars: text.length };
    },
  });

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(""), 6000);
    return () => window.clearTimeout(id);
  }, [error]);

  useEffect(() => {
    if (currentToolbarState.selectedCommentId) {
      setActiveCommentId(currentToolbarState.selectedCommentId);
    }
  }, [currentToolbarState.selectedCommentId]);

  const setProcessing = (value: boolean) => {
    setEditorState((prev) => ({
      ...prev,
      isProcessing: value,
    }));
  };

  const handleUpload = async (file?: File) => {
    if (!file || !editor) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      const html = await importDocx(file);
      editor.commands.setContent(html || EMPTY_CONTENT);
      setEditorState((prev) => ({
        ...prev,
        content: html || EMPTY_CONTENT,
        fileName: file.name,
      }));
      setComments([]);
      setActiveCommentId("");
      setPaperPulse(true);
      window.setTimeout(() => setPaperPulse(false), 700);
    } catch {
      setError("Could not import DOCX. Try a different file.");
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!editor || editorState.isProcessing) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      const html = editor.getHTML();
      const blob = await exportDocx(html);
      const safeName = editorState.fileName.replace(/\.docx$/i, "");
      saveAs(blob, `${safeName || "document"}-edited.docx`);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSetLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleClearFormatting = () => {
    editor?.chain().focus().unsetAllMarks().clearNodes().run();
  };

  const handleSetHighlightColor = (color: string) => {
    editor?.chain().focus().setHighlight({ color }).run();
  };

  const handleClearHighlight = () => {
    editor?.chain().focus().unsetHighlight().run();
  };

  const handleFontFamilyChange = (value: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "") chain.unsetFontFamily().run();
    else chain.setFontFamily(value).run();
  };

  const handleFontSizeChange = (value: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "") chain.unsetFontSize().run();
    else chain.setFontSize(value).run();
  };

  const handleBlockTypeChange = (value: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "paragraph") {
      chain.setParagraph().run();
      return;
    }
    const m = /^h([1-6])$/.exec(value);
    if (m) {
      const level = Number(m[1]) as 1 | 2 | 3 | 4 | 5 | 6;
      chain.setHeading({ level }).run();
    }
  };

  const handleInsertTableDialogOpenChange = (open: boolean) => {
    setInsertTableOpen(open);
    if (open) {
      setInsertTableHover({ rows: 3, cols: 3 });
      setInsertTableHeaderRow(true);
    }
  };

  const handleInsertTableFromPicker = (rows: number, cols: number) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: insertTableHeaderRow }).run();
    setInsertTableOpen(false);
  };

  const handleCanvasDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setDragOverCanvas(true);
    }
  };

  const handleCanvasDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDragLeave = (e: DragEvent) => {
    e.preventDefault();
    const next = e.relatedTarget as Node | null;
    if (!canvasDropRef.current?.contains(next)) {
      setDragOverCanvas(false);
    }
  };

  const handleCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOverCanvas(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.toLowerCase().endsWith(".docx")) {
      void handleUpload(file);
    }
  };

  const handleImageDialogOpenChange = (open: boolean) => {
    setImageDialogOpen(open);
    if (!open) setImageUrlDraft("");
  };

  const handleImageDialogSubmit = () => {
    const src = imageUrlDraft.trim();
    if (!src || !editor) return;
    editor.chain().focus().setImage({ src }).run();
    setImageDialogOpen(false);
    setImageUrlDraft("");
  };

  const handleFigureDialogOpenChange = (open: boolean) => {
    setFigureDialogOpen(open);
    if (open) {
      setFigureUrlDraft("");
      setFigureAltDraft("");
      setFigureCaptionDraft("");
    }
  };

  const handleFigureSubmit = () => {
    const src = figureUrlDraft.trim();
    if (!src || !editor) return;
    editor
      .chain()
      .focus()
      .insertFigure({ src, alt: figureAltDraft.trim(), caption: figureCaptionDraft.trim() })
      .run();
    handleFigureDialogOpenChange(false);
  };

  const handleChartDialogOpenChange = (open: boolean) => {
    setChartDialogOpen(open);
    if (open) {
      setChartTitleDraft("");
      setChartTypeDraft("bar");
      setChartLabelsDraft("Q1,Q2,Q3,Q4");
      setChartValuesDraft("12,19,14,22");
      setChartCaptionDraft("");
    }
  };

  const handleChartSubmit = () => {
    if (!editor) return;
    const labels = chartLabelsDraft
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const values = chartValuesDraft
      .split(/[,;\s]+/)
      .map((x) => parseFloat(x.trim()))
      .filter((n) => !Number.isNaN(n));
    if (labels.length === 0 || values.length === 0) return;
    editor
      .chain()
      .focus()
      .insertChartBlock({
        title: chartTitleDraft.trim(),
        chartType: chartTypeDraft,
        labels,
        values,
        caption: chartCaptionDraft.trim(),
      })
      .run();
    setChartDialogOpen(false);
  };

  const openAddCommentDialog = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setError("Select text before adding a comment.");
      return;
    }
    pendingSelectionRef.current = { from, to };
    setCommentDialogMode("add");
    setEditingCommentId(null);
    setCommentDraft("");
    setCommentDialogOpen(true);
    setError("");
  };

  const openEditCommentDialog = (commentId: string) => {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment) return;
    pendingSelectionRef.current = null;
    setCommentDialogMode("edit");
    setEditingCommentId(commentId);
    setCommentDraft(comment.text);
    setCommentDialogOpen(true);
  };

  const handleCommentDialogSubmit = () => {
    const text = commentDraft.trim();
    if (!text) return;

    if (commentDialogMode === "add") {
      if (!editor || !pendingSelectionRef.current) return;
      const { from, to } = pendingSelectionRef.current;
      const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
      editor.chain().focus().setTextSelection({ from, to }).setComment(id).run();
      setComments((prev) => [
        {
          id,
          text,
          resolved: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActiveCommentId(id);
      pendingSelectionRef.current = null;
    } else if (editingCommentId) {
      setComments((prev) =>
        prev.map((item) => (item.id === editingCommentId ? { ...item, text } : item)),
      );
    }

    setCommentDialogOpen(false);
    setCommentDraft("");
    setEditingCommentId(null);
    setError("");
  };

  const handleCommentDialogOpenChange = (open: boolean) => {
    setCommentDialogOpen(open);
    if (!open) {
      pendingSelectionRef.current = null;
      setCommentDraft("");
      setEditingCommentId(null);
    }
  };

  const handleJumpToComment = (commentId: string) => {
    if (!editor) return;
    const range = findCommentRange(editor, commentId);
    if (range === null) return;
    editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).scrollIntoView().run();
    setActiveCommentId(commentId);
    requestAnimationFrame(() => {
      const root = editor.view.dom as HTMLElement;
      const escaped =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(commentId)
          : commentId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const el = root.querySelector(`[data-comment-id="${escaped}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  };

  const handleToggleResolved = (commentId: string) => {
    setComments((prev) =>
      prev.map((item) => (item.id === commentId ? { ...item, resolved: !item.resolved } : item)),
    );
  };

  const handleDeleteComment = (commentId: string) => {
    if (!editor) return;
    const { state } = editor;
    let tr = state.tr;
    let changed = false;
    state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      node.marks.forEach((mark) => {
        if (mark.type.name === "comment" && mark.attrs.commentId === commentId) {
          tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
          changed = true;
        }
      });
      return true;
    });
    if (changed) {
      editor.view.dispatch(tr);
    }
    setComments((prev) => prev.filter((item) => item.id !== commentId));
    if (activeCommentId === commentId) {
      setActiveCommentId("");
    }
  };

  const pageEstimate = Math.ceil((wordStats?.words ?? 0) / 250);

  const chartLabelsParsed = chartLabelsDraft
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const chartValuesParsed = chartValuesDraft
    .split(/[,;\s]+/)
    .map((x) => parseFloat(x.trim()))
    .filter((n) => !Number.isNaN(n));
  const canInsertChart = chartLabelsParsed.length > 0 && chartValuesParsed.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="editorial-head sticky top-0 z-30 flex h-[52px] shrink-0 items-center border-b border-[var(--c-border-soft)] bg-[var(--c-chrome-glass)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--c-ink)]">
              DOCX
            </span>
            <span className="mx-0.5 h-4 w-px shrink-0 bg-[var(--c-border)]" aria-hidden />
            <p
              className="min-w-0 max-w-[260px] truncate text-sm text-[var(--c-ink-muted)]"
              title={editorState.fileName}
            >
              {editorState.fileName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              aria-label="Upload"
              title="Upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={editorState.isProcessing}
              className="h-8 px-0 text-sm font-medium sm:px-3"
            >
              {editorState.isProcessing ? (
                <Loader2 className="mx-auto size-3.5 animate-spin sm:mx-0" aria-hidden />
              ) : (
                <Upload className="mx-auto size-3.5 sm:mx-0 sm:mr-2" aria-hidden />
              )}
              <span className="hidden sm:inline">Upload</span>
            </Button>
            <Button
              type="button"
              aria-label="Export DOCX"
              title="Export DOCX"
              onClick={handleExport}
              disabled={!editor || editorState.isProcessing}
              className="h-8 px-0 text-sm font-medium sm:px-4"
            >
              {editorState.isProcessing ? (
                <Loader2 className="mx-auto size-3.5 animate-spin sm:mx-0" aria-hidden />
              ) : (
                <Save className="mx-auto size-3.5 sm:mx-0 sm:mr-2" aria-hidden />
              )}
              <span className="hidden sm:inline">
                {editorState.isProcessing ? "Processing…" : "Export DOCX"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="editorial-toolbar sticky top-[52px] z-20 w-full min-w-0 border-b border-[var(--c-border-soft)] bg-[var(--c-chrome-glass)] backdrop-blur-xl backdrop-saturate-150">
        <div className="flex flex-col gap-0 px-3 py-2 sm:px-6 lg:px-10">
          <div
            role="toolbar"
            aria-label="Font and text styles"
            className="flex min-h-[38px] w-full min-w-0 flex-wrap items-center gap-0 overflow-x-auto [scrollbar-width:thin]"
          >
          <ToolbarSection title="History">
            <ToolbarButton
              title="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor || !currentToolbarState.canUndo}
            >
              <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor || !currentToolbarState.canRedo}
            >
              <Redo2 className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarGroup label="Text styles">
            <label htmlFor="toolbar-block-type" className="sr-only">
              Paragraph style
            </label>
            <select
              id="toolbar-block-type"
              disabled={!editor}
              value={getBlockTypeSelectValue(currentToolbarState)}
              onChange={(e) => handleBlockTypeChange(e.target.value)}
              className="h-8 min-w-[10.5rem] max-w-[12rem] rounded-md border border-[var(--c-border-soft)] bg-[var(--c-paper)] px-2 text-sm text-[var(--c-ink)] shadow-sm focus:border-[var(--c-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--c-accent)] disabled:pointer-events-none disabled:opacity-30 font-[family-name:var(--font-ui)]"
            >
              <option value="paragraph">Normal text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
              <option value="h5">Heading 5</option>
              <option value="h6">Heading 6</option>
            </select>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarSection title="Font" clusterClassName="items-stretch gap-1.5">
            <label htmlFor="toolbar-font-family" className="sr-only">
              Font family
            </label>
            <select
              id="toolbar-font-family"
              disabled={!editor}
              value={currentToolbarState.fontFamily || ""}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="h-8 min-w-[9.5rem] max-w-[12rem] rounded-md border border-[var(--c-border-soft)] bg-[var(--c-paper)] px-2 text-sm text-[var(--c-ink)] shadow-sm focus:border-[var(--c-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--c-accent)] disabled:pointer-events-none disabled:opacity-30 font-[family-name:var(--font-ui)]"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.label + f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
              {currentToolbarState.fontFamily &&
              !FONT_FAMILIES.some((f) => f.value === currentToolbarState.fontFamily) ? (
                <option value={currentToolbarState.fontFamily}>
                  {currentToolbarState.fontFamily.length > 28
                    ? `${currentToolbarState.fontFamily.slice(0, 28)}…`
                    : currentToolbarState.fontFamily}
                </option>
              ) : null}
            </select>
            <label htmlFor="toolbar-font-size" className="sr-only">
              Font size
            </label>
            <select
              id="toolbar-font-size"
              disabled={!editor}
              value={currentToolbarState.fontSize || ""}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              className="h-8 w-[80px] shrink-0 rounded-md border border-[var(--c-border-soft)] bg-[var(--c-paper)] px-2 text-sm text-[var(--c-ink)] shadow-sm focus:border-[var(--c-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--c-accent)] disabled:pointer-events-none disabled:opacity-30 font-[family-name:var(--font-ui)]"
            >
              {FONT_SIZES.map((s) => (
                <option key={s.label + s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
              {currentToolbarState.fontSize &&
              !FONT_SIZES.some((s) => s.value === currentToolbarState.fontSize) ? (
                <option value={currentToolbarState.fontSize}>{currentToolbarState.fontSize}</option>
              ) : null}
            </select>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Style">
            <ToolbarButton
              title="Bold"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={currentToolbarState.isBold}
              disabled={!editor}
            >
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Italic"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={currentToolbarState.isItalic}
              disabled={!editor}
            >
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Underline"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={currentToolbarState.isUnderline}
              disabled={!editor}
            >
              <UnderlineIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Strikethrough"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={currentToolbarState.isStrike}
              disabled={!editor}
            >
              <Strikethrough className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Inline code"
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={currentToolbarState.isCode}
              disabled={!editor}
            >
              <Code className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Link"
              onClick={handleSetLink}
              active={currentToolbarState.isLink}
              disabled={!editor}
            >
              <Link2 className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Highlight">
            <ToolbarButton
              title="Toggle highlight"
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              active={currentToolbarState.isHighlight}
              disabled={!editor}
            >
              <Highlighter className="size-4" />
            </ToolbarButton>
            {HIGHLIGHT_COLORS.map(({ hex, label }) => (
              <Button
                key={hex}
                type="button"
                variant="ghost"
                size="icon"
                title={`Highlight ${label}`}
                aria-label={`Highlight ${label}`}
                onClick={() => handleSetHighlightColor(hex)}
                disabled={!editor}
                className={cn(
                  "toolbar-btn h-8 w-8 rounded-md text-[var(--c-ink-muted)] hover:bg-[var(--c-accent-tint)] hover:text-[var(--c-accent)] disabled:pointer-events-none disabled:opacity-30",
                  currentToolbarState.isHighlight &&
                    currentToolbarState.highlightColor === hex &&
                    "ring-1 ring-[var(--c-accent)] ring-offset-1 ring-offset-[var(--c-chrome)]",
                )}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--c-border)] shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              </Button>
            ))}
            <ToolbarButton title="Clear highlight" onClick={handleClearHighlight} disabled={!editor}>
              <Ban className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Script">
            <ToolbarButton
              title="Subscript"
              onClick={() => editor?.chain().focus().toggleSubscript().run()}
              active={currentToolbarState.isSubscript}
              disabled={!editor}
            >
              <SubscriptIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Superscript"
              onClick={() => editor?.chain().focus().toggleSuperscript().run()}
              active={currentToolbarState.isSuperscript}
              disabled={!editor}
            >
              <SuperscriptIcon className="size-4" />
            </ToolbarButton>
          </ToolbarSection>
          </div>

          <div className="my-1.5 h-px w-full shrink-0 bg-[var(--c-border-soft)]" aria-hidden />

          <div
            role="toolbar"
            aria-label="Paragraph layout and inserts"
            className="flex min-h-[38px] w-full min-w-0 flex-wrap items-center gap-0 overflow-x-auto [scrollbar-width:thin]"
          >
          <ToolbarSection title="Align">
            <ToolbarButton
              title="Align left"
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              active={currentToolbarState.textAlign === "left"}
              disabled={!editor}
            >
              <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              active={currentToolbarState.textAlign === "center"}
              disabled={!editor}
            >
              <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              active={currentToolbarState.textAlign === "right"}
              disabled={!editor}
            >
              <AlignRight className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Justify"
              onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
              active={currentToolbarState.textAlign === "justify"}
              disabled={!editor}
            >
              <AlignJustify className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Lists">
            <ToolbarButton
              title="Bullet list"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={currentToolbarState.isBulletList}
              disabled={!editor}
            >
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Ordered list"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={currentToolbarState.isOrderedList}
              disabled={!editor}
            >
              <ListOrdered className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Blocks">
            <ToolbarButton
              title="Code block"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={currentToolbarState.isCodeBlock}
              disabled={!editor}
            >
              <Code2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Blockquote"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={currentToolbarState.isBlockquote}
              disabled={!editor}
            >
              <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Horizontal rule"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              disabled={!editor}
            >
              <Minus className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Line break"
              onClick={() => editor?.chain().focus().setHardBreak().run()}
              disabled={!editor}
            >
              <CornerDownLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="Clear formatting" onClick={handleClearFormatting} disabled={!editor}>
              <RemoveFormatting className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Table" bare>
            <div className="flex flex-wrap items-center gap-0.5">
              <ToolbarCluster label="Insert and rows">
            <ToolbarButton
              title="Insert table"
              onClick={() => setInsertTableOpen(true)}
              disabled={!editor}
            >
              <Table2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Add row above"
              onClick={() => editor?.chain().focus().addRowBefore().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <ArrowUpToLine className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Add row below"
              onClick={() => editor?.chain().focus().addRowAfter().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <ArrowDownToLine className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Delete row"
              onClick={() => editor?.chain().focus().deleteRow().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <Trash2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Add column before"
              onClick={() => editor?.chain().focus().addColumnBefore().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <ArrowLeftToLine className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Add column after"
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <ArrowRightToLine className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Delete column"
              onClick={() => editor?.chain().focus().deleteColumn().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <Scissors className="size-4" />
            </ToolbarButton>
          </ToolbarCluster>

          <ToolbarDivider />

          <ToolbarCluster label="Header style">
            <ToolbarButton
              title="Toggle header row"
              onClick={() => editor?.chain().focus().toggleHeaderRow().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <LayoutPanelTop className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Toggle header column"
              onClick={() => editor?.chain().focus().toggleHeaderColumn().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <LayoutPanelLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Toggle header cell"
              onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <Grid2x2 className="size-4" />
            </ToolbarButton>
          </ToolbarCluster>

          <ToolbarDivider />

          <ToolbarCluster label="Cells">
            <ToolbarButton
              title="Merge cells"
              onClick={() => editor?.chain().focus().mergeCells().run()}
              disabled={!editor || !currentToolbarState.inTable || !currentToolbarState.canMergeCells}
            >
              <Merge className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Split cell"
              onClick={() => editor?.chain().focus().splitCell().run()}
              disabled={!editor || !currentToolbarState.inTable || !currentToolbarState.canSplitCell}
            >
              <TableColumnsSplit className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Previous cell"
              onClick={() => editor?.chain().focus().goToPreviousCell().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <ChevronLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Next cell"
              onClick={() => editor?.chain().focus().goToNextCell().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <ChevronRight className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Delete table"
              onClick={() => editor?.chain().focus().deleteTable().run()}
              disabled={!editor || !currentToolbarState.inTable}
            >
              <XCircle className="size-4" />
            </ToolbarButton>
          </ToolbarCluster>
            </div>
          </ToolbarSection>

          <ToolbarDivider />

          <ToolbarSection title="Insert">
            <ToolbarButton
              title="Insert image"
              onClick={() => {
                setImageUrlDraft("");
                setImageDialogOpen(true);
              }}
              disabled={!editor}
            >
              <ImagePlus className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Insert figure with caption"
              onClick={() => {
                handleFigureDialogOpenChange(true);
              }}
              disabled={!editor}
            >
              <Frame className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Insert chart"
              onClick={() => handleChartDialogOpenChange(true)}
              disabled={!editor}
            >
              <ChartColumn className="size-4" />
            </ToolbarButton>
          </ToolbarSection>
        </div>
        </div>
      </div>

      {error ? (
        <div className="mx-auto w-full max-w-[1360px] px-5 pt-3 sm:px-8 lg:px-12">
          <p
            role="alert"
            className="editorial-error-banner rounded-full border border-[var(--c-error-border)] bg-[var(--c-error-bg)] px-4 py-2 text-sm text-[var(--c-error)] font-[family-name:var(--font-ui)]"
          >
            {error}
          </p>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-6 px-5 pb-6 pt-8 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start lg:gap-8">
          <div
            ref={canvasDropRef}
            className="editorial-canvas-reveal editor-canvas relative order-1 p-8 sm:p-10 md:p-12 lg:p-14"
            onDragEnter={handleCanvasDragEnter}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
          >
            {dragOverCanvas ? (
              <div
                className="editorial-drag-overlay pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--c-accent)] bg-[rgba(254,240,231,0.85)] backdrop-blur-sm"
                aria-hidden
              >
                <Upload className="size-12 text-[var(--c-accent)]" strokeWidth={1.5} />
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--c-ink)]">
                  Drop .docx to open
                </p>
              </div>
            ) : null}
            <div
              className={cn(
                "editor-canvas-paper relative mx-auto w-full max-w-[816px] px-6 py-8 md:px-[96px] md:py-[96px]",
                paperPulse && "editorial-paper-settle",
              )}
              data-placeholder={isPlaceholderDoc ? "true" : "false"}
            >
            {isPlaceholderDoc ? (
              <div className="mb-8 rounded-xl border-2 border-dashed border-[var(--c-border)] bg-[rgba(254,252,245,0.7)] p-8 text-center">
                <Upload className="mx-auto size-12 text-[var(--c-accent)]" strokeWidth={1.5} />
                <p className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--c-ink)]">
                  Open a document
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--c-ink-muted)] font-[family-name:var(--font-ui)]">
                  Upload a .docx file to edit with full formatting, or start typing in the page below.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 h-10 border-[var(--c-accent)] bg-transparent px-6 text-[var(--c-accent)] hover:bg-[var(--c-accent-tint)]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={editorState.isProcessing}
                >
                  <Upload className="mr-2 size-4" />
                  Choose file
                </Button>
              </div>
            ) : null}
            <EditorContent
              editor={editor}
              className="prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-relaxed"
            />
            {editor ? (
              <BubbleMenu
                editor={editor}
                className="animate-[editorial-fade-up_120ms_ease_both] z-50 flex items-center gap-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-paper)] p-1 shadow-[0_4px_16px_rgba(28,23,18,0.14)]"
                shouldShow={({ editor: ed }) => !ed.state.selection.empty}
              >
                {currentToolbarState.isCommentMark ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[var(--c-border)] text-[var(--c-accent)] hover:bg-[var(--c-accent-tint)]"
                    onClick={() => editor.chain().focus().unsetComment().run()}
                  >
                    Remove comment
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={openAddCommentDialog}>
                    <MessageSquarePlus className="mr-1 size-4" />
                    Comment
                  </Button>
                )}
              </BubbleMenu>
            ) : null}
          </div>
        </div>
        <aside className="editorial-aside-reveal order-2 h-fit w-full min-w-0 max-w-[340px] rounded-xl border border-[var(--c-border-soft)] bg-[var(--c-paper)] p-5 font-[family-name:var(--font-ui)] shadow-[0_1px_0_rgba(28,23,18,0.04),0_8px_24px_rgba(28,23,18,0.08)] lg:sticky lg:top-[var(--app-sidebar-top)] lg:max-h-[calc(100vh-9rem)] lg:min-w-[280px] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-[var(--c-border-soft)] pb-4">
            <h2 className="text-sm font-semibold text-[var(--c-ink)]">Comments</h2>
            <span className="rounded-full bg-[var(--c-accent)] px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
              {comments.length}
            </span>
          </div>
          {comments.length === 0 ? (
            <p className="text-sm leading-relaxed text-[var(--c-ink-muted)]">
              Select text in the document — the floating{" "}
              <strong className="font-medium text-[var(--c-ink)]">Comment</strong> button appears above your selection.
            </p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left font-[family-name:var(--font-ui)] transition-colors duration-100 outline-none hover:border-[var(--c-border)] focus-visible:ring-1 focus-visible:ring-[var(--c-accent)]",
                    comment.resolved && "opacity-[0.55]",
                    activeCommentId === comment.id
                      ? "border border-[var(--c-accent)] bg-[var(--c-comment-bg)] pl-3"
                      : "border border-[var(--c-border-soft)] bg-transparent",
                  )}
                  onClick={() => handleJumpToComment(comment.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleJumpToComment(comment.id);
                    }
                  }}
                >
                  <p className="text-sm leading-snug text-[var(--c-ink)]">{comment.text}</p>
                  <p className="mt-1.5 text-[11px] text-[var(--c-ink-faint)]">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-7 min-w-7 p-0"
                      onClick={() => openEditCommentDialog(comment.id)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => handleToggleResolved(comment.id)}
                    >
                      {comment.resolved ? "Unresolve" : "Resolve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-7 min-w-7 p-0"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
        </div>

        <footer className="flex min-h-8 flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--c-border-soft)] bg-[var(--c-chrome)] px-5 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tabular-nums text-[var(--c-ink-faint)]">
          <span>
            Words:{" "}
            <strong className="font-medium text-[var(--c-ink-muted)]">{wordStats?.words ?? 0}</strong>
          </span>
          <span>
            Characters:{" "}
            <strong className="font-medium text-[var(--c-ink-muted)]">{wordStats?.chars ?? 0}</strong>
          </span>
          <span>
            ~{pageEstimate} {pageEstimate === 1 ? "page" : "pages"}
          </span>
          <span className="ml-auto min-w-0 truncate" title={editorState.fileName}>
            {editorState.fileName}
          </span>
        </footer>
        <p className="text-center text-xs leading-relaxed text-[var(--c-ink-faint)]">
          Complex nested tables and merged cells may not round-trip perfectly.
        </p>
      </div>

      <Dialog open={commentDialogOpen} onOpenChange={handleCommentDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{commentDialogMode === "add" ? "Add comment" : "Edit comment"}</DialogTitle>
            <DialogDescription>
              {commentDialogMode === "add"
                ? "Comments appear in the sidebar and stay linked to the selected text."
                : "Update the text stored for this comment."}
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-2 text-sm text-[var(--c-ink)] outline-none transition-shadow duration-100 focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)] font-[family-name:var(--font-ui)]"
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Write a comment…"
            autoFocus
          />
          <DialogFooter className="mt-5 gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleCommentDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCommentDialogSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insertTableOpen} onOpenChange={handleInsertTableDialogOpenChange}>
        <DialogContent className="max-w-md gap-5">
          <DialogHeader>
            <DialogTitle>Insert table</DialogTitle>
            <DialogDescription>
              Hover the grid to choose a size (up to {INSERT_TABLE_MAX}×{INSERT_TABLE_MAX}), then click a cell to insert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="mx-auto w-fit rounded-lg border border-[var(--c-border-soft)] bg-[var(--c-canvas)] p-2">
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${INSERT_TABLE_MAX}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: INSERT_TABLE_MAX * INSERT_TABLE_MAX }).map((_, i) => {
                  const row = Math.floor(i / INSERT_TABLE_MAX) + 1;
                  const col = (i % INSERT_TABLE_MAX) + 1;
                  const inSelection = row <= insertTableHover.rows && col <= insertTableHover.cols;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Insert ${row} by ${col} table`}
                      className={cn(
                        "size-4 rounded-sm border transition-colors",
                        inSelection
                          ? "border-[var(--c-accent)] bg-[var(--c-accent)]"
                          : "border-[var(--c-border-soft)] bg-[var(--c-canvas)] hover:bg-[var(--c-accent-tint)]",
                      )}
                      onMouseEnter={() => setInsertTableHover({ rows: row, cols: col })}
                      onClick={() => handleInsertTableFromPicker(row, col)}
                    />
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-center text-sm font-semibold tabular-nums text-[var(--c-ink)]">
              {insertTableHover.rows} × {insertTableHover.cols}
            </p>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--c-ink-muted)]">
              <input
                type="checkbox"
                className="size-4 accent-[var(--c-accent)]"
                checked={insertTableHeaderRow}
                onChange={(event) => setInsertTableHeaderRow(event.target.checked)}
              />
              Use header row
            </label>
          </div>
          <DialogFooter className="mt-5 gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleInsertTableDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleInsertTableFromPicker(insertTableHover.rows, insertTableHover.cols)}
            >
              Insert {insertTableHover.rows} × {insertTableHover.cols}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageDialogOpen} onOpenChange={handleImageDialogOpenChange}>
        <DialogContent className="max-w-md gap-5">
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>
              Paste an image URL. The image is loaded from that address when you view or export the document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="insert-image-url" className="sr-only">
              Image URL
            </label>
            <input
              id="insert-image-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none transition-shadow duration-100 focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)] font-[family-name:var(--font-ui)]"
              placeholder="https://example.com/image.png"
              value={imageUrlDraft}
              onChange={(event) => setImageUrlDraft(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="mt-5 gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleImageDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImageDialogSubmit}
              disabled={!editor || !imageUrlDraft.trim()}
            >
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={figureDialogOpen} onOpenChange={handleFigureDialogOpenChange}>
        <DialogContent className="max-w-md gap-5">
          <DialogHeader>
            <DialogTitle>Insert figure</DialogTitle>
            <DialogDescription>
              Add an image with an optional caption. Figures are centered on the page and work well for diagrams and photos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 font-[family-name:var(--font-ui)]">
            <div>
              <label htmlFor="figure-url" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Image URL
              </label>
              <input
                id="figure-url"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                placeholder="https://…"
                value={figureUrlDraft}
                onChange={(e) => setFigureUrlDraft(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="figure-alt" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Alt text (accessibility)
              </label>
              <input
                id="figure-alt"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                placeholder="Describe the image"
                value={figureAltDraft}
                onChange={(e) => setFigureAltDraft(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="figure-caption" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Caption
              </label>
              <input
                id="figure-caption"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                placeholder="Figure 1 — …"
                value={figureCaptionDraft}
                onChange={(e) => setFigureCaptionDraft(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleFigureDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleFigureSubmit} disabled={!editor || !figureUrlDraft.trim()}>
              Insert figure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chartDialogOpen} onOpenChange={handleChartDialogOpenChange}>
        <DialogContent className="max-w-md gap-5">
          <DialogHeader>
            <DialogTitle>Insert chart</DialogTitle>
            <DialogDescription>
              Quick bar or line chart from comma-separated labels and numbers. Export to DOCX includes the graphic as SVG when possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 font-[family-name:var(--font-ui)]">
            <div>
              <label htmlFor="chart-title" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Title (optional)
              </label>
              <input
                id="chart-title"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                placeholder="Quarterly results"
                value={chartTitleDraft}
                onChange={(e) => setChartTitleDraft(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="chart-type" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Chart type
              </label>
              <select
                id="chart-type"
                className="h-9 w-full rounded-md border border-[var(--c-border-soft)] bg-[var(--c-paper)] px-2 text-sm text-[var(--c-ink)] focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                value={chartTypeDraft}
                onChange={(e) => setChartTypeDraft(e.target.value as "bar" | "line")}
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
              </select>
            </div>
            <div>
              <label htmlFor="chart-labels" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Labels (comma-separated)
              </label>
              <input
                id="chart-labels"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                value={chartLabelsDraft}
                onChange={(e) => setChartLabelsDraft(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="chart-values" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Values (comma-separated numbers)
              </label>
              <input
                id="chart-values"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                value={chartValuesDraft}
                onChange={(e) => setChartValuesDraft(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="chart-caption" className="mb-1 block text-xs font-medium text-[var(--c-ink-muted)]">
                Caption (optional)
              </label>
              <input
                id="chart-caption"
                type="text"
                className="h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-paper)] px-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)] focus:ring-1 focus:ring-[var(--c-accent)]"
                value={chartCaptionDraft}
                onChange={(e) => setChartCaptionDraft(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-5 gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleChartDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleChartSubmit} disabled={!editor || !canInsertChart}>
              Insert chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
