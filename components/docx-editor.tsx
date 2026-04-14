"use client";

import type { Editor } from "@tiptap/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  CornerDownLeft,
  Eraser,
  FileText,
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
  Pencil,
  Pilcrow,
  Quote,
  Redo2,
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
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
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

const EMPTY_CONTENT = "<p>Upload a DOCX file to start editing.</p>";
const HIGHLIGHT_COLORS = ["#fef08a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff"];

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
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-9 shrink-0 px-2",
        active && "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
      )}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline underline-offset-2",
        },
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
      inTable: currentEditor?.isActive("table") ?? false,
      textAlign: getBlockTextAlign(currentEditor ?? null),
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
      canMergeCells: currentEditor?.can().chain().focus().mergeCells().run() ?? false,
      canSplitCell: currentEditor?.can().chain().focus().splitCell().run() ?? false,
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
  };

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
    <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm shadow-slate-200/40 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{editorState.fileName}</p>
            <p className="text-xs text-slate-500">DOCX · Export keeps structure (tables, headings, images)</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="border-slate-200"
          >
            <Upload className="mr-2 size-4" />
            Upload
          </Button>
          <Button onClick={handleExport} disabled={!editor || editorState.isProcessing}>
            <Save className="mr-2 size-4" />
            {editorState.isProcessing ? "Processing..." : "Export DOCX"}
          </Button>
        </div>
      </div>

      <div className="sticky top-3 z-10 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm shadow-slate-200/40 backdrop-blur-md supports-backdrop-filter:bg-white/90">
        <div className="flex flex-wrap items-center gap-1.5">
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

          <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />

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
          >
            <span className="text-xs font-semibold">H4</span>
          </ToolbarButton>
          <ToolbarButton
            title="Heading 5"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}
            active={currentToolbarState.isHeading5}
            disabled={!editor}
          >
            <span className="text-xs font-semibold">H5</span>
          </ToolbarButton>
          <ToolbarButton
            title="Heading 6"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}
            active={currentToolbarState.isHeading6}
            disabled={!editor}
          >
            <span className="text-xs font-semibold">H6</span>
          </ToolbarButton>

          <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />

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
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
          <ToolbarButton
            title="Highlight"
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
              variant="outline"
              size="sm"
              title={`Highlight ${color}`}
              aria-label={`Highlight ${color}`}
              onClick={() => handleSetHighlightColor(color)}
              disabled={!editor}
              className={cn(
                "h-9 w-9 p-0",
                currentToolbarState.isHighlight &&
                  currentToolbarState.highlightColor === color &&
                  "border-slate-900 ring-1 ring-slate-900",
              )}
            >
              <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: color }} />
            </Button>
          ))}
          <ToolbarButton title="Clear highlight" onClick={handleClearHighlight} disabled={!editor}>
            ClrHL
          </ToolbarButton>
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

          <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />

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
          <ToolbarButton
            title="Clear formatting"
            onClick={handleClearFormatting}
            disabled={!editor}
          >
            <Eraser className="size-4" />
          </ToolbarButton>

          <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />

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

          <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />

          <ToolbarButton
            title="Insert table"
            onClick={() =>
              editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            disabled={!editor}
          >
            <Table2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Add row"
            onClick={() => editor?.chain().focus().addRowAfter().run()}
            disabled={!editor || !currentToolbarState.inTable}
          >
            +Row
          </ToolbarButton>
          <ToolbarButton
            title="Delete row"
            onClick={() => editor?.chain().focus().deleteRow().run()}
            disabled={!editor || !currentToolbarState.inTable}
          >
            <Trash2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Add column"
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
            disabled={!editor || !currentToolbarState.inTable}
          >
            +Col
          </ToolbarButton>
          <ToolbarButton
            title="Delete column"
            onClick={() => editor?.chain().focus().deleteColumn().run()}
            disabled={!editor || !currentToolbarState.inTable}
          >
            <Scissors className="size-4" />
          </ToolbarButton>
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
            title="Delete table"
            onClick={() => editor?.chain().focus().deleteTable().run()}
            disabled={!editor || !currentToolbarState.inTable}
          >
            DelTbl
          </ToolbarButton>
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <div className="editor-canvas p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="editor-canvas-paper relative mx-auto w-full max-w-[816px] px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-14">
            <EditorContent
              editor={editor}
              className="prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-relaxed"
            />
            {editor ? (
              <BubbleMenu
                editor={editor}
                className="z-50 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-md"
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
        <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {comments.length}
            </span>
          </div>
          {comments.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              Select text in the document — the floating <strong className="font-medium text-slate-700">Comment</strong>{" "}
              button appears above your selection.
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
      <p className="text-center text-xs leading-relaxed text-slate-400">
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
    </div>
  );
}
