import { DocxEditor } from "@/components/docx-editor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Custom DOCX Editor</h1>
      </header>
      <DocxEditor />
    </main>
  );
}
