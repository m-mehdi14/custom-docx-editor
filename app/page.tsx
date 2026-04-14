import { FileText } from "lucide-react";

import { DocxEditor } from "@/components/docx-editor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-linear-to-b from-slate-100 via-slate-50/80 to-slate-100/90">
      <header className="border-b border-slate-200/80 bg-white/95 shadow-[0_1px_0_0_rgb(15_23_42/0.04),0_12px_40px_-12px_rgb(15_23_42/0.08)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1360px] items-center gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-slate-800 to-slate-900 text-white shadow-inner shadow-white/10">
            <FileText className="size-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Custom DOCX Editor
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">Edit in the browser, export to .docx</p>
          </div>
        </div>
      </header>
      <DocxEditor />
    </main>
  );
}
