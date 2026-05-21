import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OshiTodo",
  description: "투두 완료로 최애 캐릭터를 키우는 성장형 체크리스트"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
