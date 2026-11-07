import {isShowcaseOnly} from "@/lib/runtime-mode";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { StudioProvider } from "@/components/store";
import "./globals.css";
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});
export const metadata: Metadata = {
  title: "DeckPick — 메시지에 맞는 장표를 고르세요",
  description:
    "AI와 발표 구성을 다듬고, 세 가지 레이아웃을 비교해 편집 가능한 PPTX를 만드세요.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={pretendard.variable}>
        {isShowcaseOnly()?children:<StudioProvider>{children}</StudioProvider>}
      </body>
    </html>
  );
}
