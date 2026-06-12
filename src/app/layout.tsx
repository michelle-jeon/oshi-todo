import type { Metadata } from "next";
import { CaptureHandleConfig } from "@/components/capture-handle-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "OshiTodo",
  description: "투두 완료로 최애 캐릭터를 키우는 성장형 체크리스트",
  icons: {
    icon: "/oshi-todo-favicon.png?v=20260612",
    shortcut: "/oshi-todo-favicon.png?v=20260612",
    apple: "/oshi-todo-favicon.png?v=20260612"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <CaptureHandleConfig />
        {children}
      </body>
    </html>
  );
}
