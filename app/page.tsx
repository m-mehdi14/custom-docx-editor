import { DocxEditor } from "@/components/docx-editor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-linear-to-b from-slate-100 to-slate-50">
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-4 shadow-sm shadow-slate-200/30 backdrop-blur-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Custom DOCX Editor</h1>
        <p className="mt-0.5 text-xs text-slate-500">Edit in the browser, export to .docx</p>
      </header>
      <DocxEditor />
    </main>
  );
}
