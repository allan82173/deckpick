"use client";
import {createContext, useCallback, useContext, useEffect, useState, type ReactNode} from "react";
import {englishMessages} from "./ui-messages";

export type UiLanguage = "ko" | "en";
export const UI_LANGUAGE_KEY = "deckpick.ui-language";
export function translateUi(text: string, language: UiLanguage, values: readonly (string | number)[] = []): string {
  const template = language === "ko" ? text : englishMessages[text] ?? text;
  return template.replace(/\{(\d+)\}/g, (match, index: string) => values[Number(index)] === undefined ? match : String(values[Number(index)]));
}
const LanguageContext = createContext<{language: UiLanguage; setLanguage: (value: UiLanguage) => void}>({language: "ko", setLanguage: () => {}});
export function UiLanguageProvider({children}: {children: ReactNode}) {
  const [language, setValue] = useState<UiLanguage>("ko");
  useEffect(() => {
    try { if (localStorage.getItem(UI_LANGUAGE_KEY) === "en") setValue("en"); } catch { /* Storage can be unavailable. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((value: UiLanguage) => {
    setValue(value);
    try { localStorage.setItem(UI_LANGUAGE_KEY, value); } catch { /* Keep the current selection in memory. */ }
  }, []);
  return <LanguageContext.Provider value={{language, setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useUiLanguage() { return useContext(LanguageContext); }
export function useUiText() {
  const {language} = useUiLanguage();
  return useCallback((text: string, values?: readonly (string | number)[]) => translateUi(text, language, values), [language]);
}
export function LanguageSwitcher() {
  const {language, setLanguage} = useUiLanguage();
  return <div className="language-switcher" role="group" aria-label={language === "en" ? "Interface language" : "화면 언어"}>
    <button type="button" lang="ko" aria-pressed={language === "ko"} onClick={() => setLanguage("ko")}>한국어</button>
    <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
  </div>;
}
