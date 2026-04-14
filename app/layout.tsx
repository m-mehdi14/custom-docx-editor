import type { Metadata } from "next";
import { Fraunces, Fira_Code, Instrument_Sans, Lora } from "next/font/google";
import "./globals.css";

const fontInstrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const fontLora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const fontFraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const fontFira = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Custom DOCX Editor",
  description: "Upload, edit, and export DOCX files in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontInstrument.variable} ${fontLora.variable} ${fontFraunces.variable} ${fontFira.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--c-canvas)] text-[var(--c-ink)]">
        {children}
      </body>
    </html>
  );
}
