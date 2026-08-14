import type { Metadata } from "next";
import "./globals.css";

// Fonts are loaded via a <link> tag rather than next/font/google so that
// `next build` never depends on reaching fonts.googleapis.com at build time
// (keeps CI / offline / firewalled build environments working). The actual
// family names are wired to --font-display/--font-sans/--font-mono in
// globals.css, which Tailwind's fontFamily config already points at.
export const metadata: Metadata = {
  title: "TIPO 專利狀態智動化分析系統",
  description: "專利狀態批次查詢與分析工具 — 上傳 Excel，自動比對 TIPO 開放資料並判定案件狀態。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="font-sans bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
