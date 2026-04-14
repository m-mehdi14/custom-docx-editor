"use client";

import type { Editor } from "@tiptap/core";
import { type ReactNode, useRef, useState } from "react";
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
  Minus,
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
import type { EditorState } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY_CONTENT = "<p>Upload a DOCX file to start editing.</p>";
const HIGHLIGHT_COLORS = ["#fef08a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff"];

function getBlockTextAlign(editor: Editor | null): "left" | "center" | "right" | "justify" {
  if (!editor) return "left";
  const node = editor.state.selection.$from.parent;
  const ta = node.attrs.textAlign as string | undefined;
  if (ta === "center" || ta === "right" || ta === "justify" || ta === "left") return ta;
  return "left";
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
      isHighlight: currentEditor?.isActive("highlight") ?? false,
      highlightColor: (currentEditor?.getAttributes("highlight").color as string) ?? "",
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
    isHighlight: false,
    highlightColor: "",
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-medium text-slate-700">{editorState.fileName}</p>
        <div className="flex items-center gap-2">
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

      <div className="sticky top-3 z-10 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
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

      <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 md:p-6">
        <div className="mx-auto min-h-[70vh] max-w-4xl bg-white p-8 shadow-sm">
          <EditorContent editor={editor} className="prose prose-slate max-w-none" />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        Complex nested tables and merged cells may not round-trip perfectly.
      </p>
    </div>
  );
}
