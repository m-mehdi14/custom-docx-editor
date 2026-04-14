"use client";

import type { Editor } from "@tiptap/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
  Code2,
  CornerDownLeft,
  FileText,
  Grid2x2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Merge,
  MessageSquarePlus,
  Minus,
  LayoutPanelLeft,
  LayoutPanelTop,
  Pencil,
  Pilcrow,
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
import { CommentMark } from "@/extensions/comment-mark";
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
const HIGHLIGHT_COLORS = ["#fef08a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff"];
const INSERT_TABLE_MAX = 10;

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Calibri", value: "Calibri, Candara, Segoe, sans-serif" },
  { label: "Cambria", value: "Cambria, Georgia, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Consolas", value: "Consolas, Monaco, monospace" },
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

function findCommentPosition(editor: Editor, commentId: string): number | null {
  let foundPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (foundPos !== null || !node.isText) return false;
    const hasComment = node.marks.some(
      (mark) => mark.type.name === "comment" && mark.attrs.commentId === commentId,
    );
    if (hasComment) {
      foundPos = pos;
      return false;
    }
    return true;
  });
  return foundPos;
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
        "h-9 w-9 shrink-0 rounded-lg text-slate-600 hover:bg-slate-200/80 hover:text-slate-900",
        active && "bg-slate-900 text-white hover:bg-slate-800 hover:text-white",
        className,
      )}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  );
}

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
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6)]",
        className,
      )}
    >
      {children}
    </div>
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
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="select-none pl-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {title}
      </span>
      {bare ? (
        children
      ) : (
        <ToolbarCluster label={title} className={clusterClassName}>
          {children}
        </ToolbarCluster>
      )}
    </div>
  );
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
            class: "text-blue-600 underline underline-offset-2",
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
    const pos = findCommentPosition(editor, commentId);
    if (pos === null) return;
    editor.chain().focus().setTextSelection(pos).run();
    setActiveCommentId(commentId);
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

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-6 px-4 pb-12 pt-5 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_1px_0_0_rgb(15_23_42/0.04),0_8px_24px_-4px_rgb(15_23_42/0.08)] sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-slate-800 to-slate-900 text-white shadow-inner shadow-white/10">
            <FileText className="size-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-slate-900">{editorState.fileName}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              DOCX — export keeps structure (tables, headings, images)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={editorState.isProcessing}
            className="h-10 border-slate-200/90 bg-white px-4 shadow-sm hover:bg-slate-50"
          >
            <Upload className="mr-2 size-4" />
            Upload
          </Button>
          <Button
            onClick={handleExport}
            disabled={!editor || editorState.isProcessing}
            className="h-10 px-5 shadow-md shadow-slate-900/15"
          >
            <Save className="mr-2 size-4" />
            {editorState.isProcessing ? "Processing…" : "Export DOCX"}
          </Button>
        </div>
      </div>

      <div className="sticky top-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_1px_0_0_rgb(15_23_42/0.05),0_12px_32px_-8px_rgb(15_23_42/0.12)] backdrop-blur-md supports-backdrop-filter:bg-white/90">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 sm:gap-x-4">
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

          <ToolbarSection title="Headings">
            <ToolbarButton
              title="Paragraph"
              onClick={() => editor?.chain().focus().setParagraph().run()}
              active={currentToolbarState.isParagraph}
              disabled={!editor}
            >
              <Pilcrow className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 1"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={currentToolbarState.isHeading1}
              disabled={!editor}
            >
              <Heading1 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 2"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={currentToolbarState.isHeading2}
              disabled={!editor}
            >
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 3"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={currentToolbarState.isHeading3}
              disabled={!editor}
            >
              <Heading3 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Heading 4"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
              active={currentToolbarState.isHeading4}
              disabled={!editor}
              className="w-9 px-0 text-[11px] font-semibold"
            >
              H4
            </ToolbarButton>
            <ToolbarButton
              title="Heading 5"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}
              active={currentToolbarState.isHeading5}
              disabled={!editor}
              className="w-9 px-0 text-[11px] font-semibold"
            >
              H5
            </ToolbarButton>
            <ToolbarButton
              title="Heading 6"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}
              active={currentToolbarState.isHeading6}
              disabled={!editor}
              className="w-9 px-0 text-[11px] font-semibold"
            >
              H6
            </ToolbarButton>
          </ToolbarSection>

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

          <ToolbarSection title="Font" clusterClassName="items-stretch gap-1.5 px-2 py-1">
            <label htmlFor="toolbar-font-family" className="sr-only">
              Font family
            </label>
            <select
              id="toolbar-font-family"
              disabled={!editor}
              value={currentToolbarState.fontFamily || ""}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="h-9 max-w-42 min-w-32 rounded-lg border border-slate-200/80 bg-white px-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
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
              className="h-9 w-22 shrink-0 rounded-lg border border-slate-200/80 bg-white px-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
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
        </div>

        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 sm:gap-x-4">
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

          <ToolbarSection title="Highlight">
            <ToolbarButton
              title="Toggle highlight"
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              active={currentToolbarState.isHighlight}
              disabled={!editor}
            >
              <Highlighter className="size-4" />
            </ToolbarButton>
            {HIGHLIGHT_COLORS.map((color) => (
              <Button
                key={color}
                type="button"
                variant="ghost"
                size="icon"
                title={`Highlight ${color}`}
                aria-label={`Highlight ${color}`}
                onClick={() => handleSetHighlightColor(color)}
                disabled={!editor}
                className={cn(
                  "h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-200/80",
                  currentToolbarState.isHighlight &&
                    currentToolbarState.highlightColor === color &&
                    "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2 ring-offset-[rgb(248_250_252)] hover:bg-slate-800 hover:text-white",
                )}
              >
                <span
                  className="h-4 w-4 rounded-full border border-slate-300/80 shadow-sm"
                  style={{ backgroundColor: color }}
                />
              </Button>
            ))}
            <ToolbarButton title="Clear highlight" onClick={handleClearHighlight} disabled={!editor}>
              <Ban className="size-4" />
            </ToolbarButton>
          </ToolbarSection>

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
        </div>

        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 sm:gap-x-4">
          <ToolbarSection title="Table" bare>
            <div className="flex flex-wrap items-end gap-2">
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

          <ToolbarSection title="Insert">
            <ToolbarButton
              title="Insert image"
              onClick={() => {
                const src = window.prompt("Image URL");
                if (src) {
                  editor?.chain().focus().setImage({ src }).run();
                }
              }}
              disabled={!editor}
            >
              <ImagePlus className="size-4" />
            </ToolbarButton>
          </ToolbarSection>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start lg:gap-8">
        <div className="editor-canvas p-4 sm:p-6 md:p-8 lg:p-10">
          <div
            className="editor-canvas-paper relative mx-auto w-full max-w-[816px] px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-14"
            data-placeholder={isPlaceholderDoc ? "true" : "false"}
          >
            {isPlaceholderDoc ? (
              <div className="mb-6 rounded-2xl border-2 border-dashed border-slate-300/90 bg-linear-to-b from-white to-slate-50/90 p-7 text-center shadow-[inset_0_1px_0_0_rgb(255_255_255/0.8)] sm:mb-8 sm:p-8">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20">
                  <Upload className="size-7" strokeWidth={1.75} />
                </div>
                <p className="mt-5 text-base font-semibold tracking-tight text-slate-900">Open a document</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Upload a .docx file to edit with full formatting, or start typing in the page below.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 h-10 border-slate-200 bg-white px-6 shadow-sm hover:bg-slate-50"
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
                className="z-50 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg shadow-slate-900/10"
                shouldShow={({ editor: ed }) => !ed.state.selection.empty}
              >
                {currentToolbarState.isCommentMark ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
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
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_0_0_rgb(15_23_42/0.04),0_12px_32px_-8px_rgb(15_23_42/0.1)]">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">Comments</h2>
            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
              {comments.length}
            </span>
          </div>
          {comments.length === 0 ? (
            <p className="text-sm leading-relaxed text-slate-500">
              Select text in the document — the floating{" "}
              <strong className="font-medium text-slate-800">Comment</strong> button appears above your selection.
            </p>
          ) : (
            <div className="flex max-h-[min(70vh,560px)] flex-col gap-2 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    comment.resolved && "opacity-60",
                    activeCommentId === comment.id ? "border-slate-900 bg-slate-50" : "border-slate-200/90 bg-slate-50/30",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left text-sm leading-snug text-slate-800"
                    onClick={() => handleJumpToComment(comment.id)}
                  >
                    {comment.text}
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditCommentDialog(comment.id)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleResolved(comment.id)}>
                      {comment.resolved ? "Unresolve" : "Resolve"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteComment(comment.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <p className="text-center text-xs leading-relaxed text-slate-400/90">
        Complex nested tables and merged cells may not round-trip perfectly.
      </p>

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
            className="min-h-[120px] w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Write a comment…"
            autoFocus
          />
          <DialogFooter>
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
            <div className="mx-auto w-fit rounded-xl border border-slate-200 bg-slate-50/90 p-2 shadow-inner">
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
                        "size-3.5 rounded-sm border transition-colors sm:size-4",
                        inSelection
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-200/90 bg-white hover:bg-slate-100",
                      )}
                      onMouseEnter={() => setInsertTableHover({ rows: row, cols: col })}
                      onClick={() => handleInsertTableFromPicker(row, col)}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-center text-sm font-medium tabular-nums text-slate-700">
              {insertTableHover.rows} × {insertTableHover.cols}
            </p>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300 accent-slate-900"
                checked={insertTableHeaderRow}
                onChange={(event) => setInsertTableHeaderRow(event.target.checked)}
              />
              Use header row
            </label>
          </div>
          <DialogFooter>
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
    </div>
  );
}
