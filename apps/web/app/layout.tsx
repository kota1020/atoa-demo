import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtoA — あなたを誰より理解するAI社員",
  description:
    "ファイル・コード・習慣・会話から学び、営業から支払いまで自走するAI社員。オンボーディングで会社を理解させ、あとは確認するだけ。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
