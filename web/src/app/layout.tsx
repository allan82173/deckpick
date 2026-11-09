import {isShowcaseOnly} from "@/lib/runtime-mode";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { StudioProvider } from "@/components/store";
import "./globals.css";
import {UiLanguageProvider} from "@/lib/ui-language";
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});
export const metadata: Metadata = {
  title: "DeckPick — AI Presentation Workspace",
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
        <UiLanguageProvider>{isShowcaseOnly()?children:<StudioProvider>{children}</StudioProvider>}</UiLanguageProvider>
      </body>
    </html>
  );
}
