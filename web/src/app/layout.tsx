import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "UDI 查詢系統 | 醫療器材識別碼",
  description: "快速核對醫療器材單一識別碼與許可證資訊，符合 Material Design 3 規範的查詢工具。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${roboto.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
