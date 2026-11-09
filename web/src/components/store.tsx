"use client";
import {updateSetupInput,saveDeckArchive,loadDeckArchive,listDeckArchives,deleteDeckArchive} from "@/lib/deck-session";
import { setActiveRunDeck } from "@/lib/client-run-context";
import { executionSchema,mergeExecution } from "@/lib/execution-model";
import { generationStateSchema } from "@/lib/run-state";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { persistedDeckSchema, type Deck, type DeckInput } from "@/lib/model";
import { design } from "@/lib/design";
import { invalidateStaleReview } from "@/lib/review-state";
import {publicDemoOnly} from "@/lib/runtime-mode";
import { z } from "zod";
export const defaultInput: DeckInput = {
  deckType: "consulting",
  designSystemId: "ict-forest",
  topic: "",
  purpose: "",
  audience: "",
  slideCount: 6,
};
export function freshDeck(): Deck {
  return {
    id: crypto.randomUUID(),
    input: structuredClone(defaultInput),
    designSystem: design("ict-forest"),
    research: [],
    chat: { setup: [], outline: [], slides: {} },
    outline: [],
    candidates: {},
    picked: {},
    edited: {},
    demo: process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE!=="1",
  };
}
type Credentials = {
  provider: "openai" | "anthropic";
  key: string;
  model: string;
  connected: boolean;
};
type State = {
  deck: Deck | null;
  setDeck: Dispatch<SetStateAction<Deck | null>>;
  changeInput:(patch:Partial<DeckInput>,keepConversation?:boolean)=>void;
  startNewTopic:()=>void;
  restoreDeck:(id:string)=>void;
  deleteArchive:(id:string)=>void;
  archivedDecks:ReturnType<typeof listDeckArchives>;
  ready: boolean;
  storageError: string;
  credentials: Credentials;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
  serverKeys: { openai: boolean; anthropic: boolean };
};
const Context = createContext<State | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const [deck, updateDeck] = useState<Deck | null>(null),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState("");
  const setDeck: Dispatch<SetStateAction<Deck | null>> = useCallback(action => {
    updateDeck(previous => invalidateStaleReview(previous, typeof action === "function" ? action(previous) : action));
  }, []);
  useEffect(()=>{setActiveRunDeck(deck?.id);},[deck?.id]);
  useEffect(()=>{
    const receive=(event:Event)=>{const detail=(event as CustomEvent).detail;const parsed=executionSchema.safeParse(detail?.execution);if(!parsed.success)return;
      updateDeck(previous=>previous&&previous.id===detail.deckId&&JSON.stringify(previous.input)===detail.input?{...previous,execution:mergeExecution(previous.execution,parsed.data)}:previous);
    };window.addEventListener("deckpick-execution",receive);return()=>window.removeEventListener("deckpick-execution",receive);
  },[]);
  useEffect(()=>{const receive=(event:Event)=>{const detail=(event as CustomEvent).detail,parsed=generationStateSchema.safeParse(detail?.generation);if(!parsed.success)return;updateDeck(previous=>previous&&previous.id===detail.deckId&&JSON.stringify(previous.input)===detail.input?{...previous,generation:{...parsed.data,completedStages:parsed.data.completedStages.length?parsed.data.completedStages:previous.generation?.completedStages??[],lastCompletedStage:parsed.data.lastCompletedStage??previous.generation?.lastCompletedStage}}:previous);};window.addEventListener("deckpick-generation",receive);return()=>window.removeEventListener("deckpick-generation",receive);},[]);
  const [archivedDecks,setArchivedDecks]=useState<ReturnType<typeof listDeckArchives>>([]);
  function switchDeck(next:Deck){
    try{if(deck)saveDeckArchive(localStorage,deck);localStorage.setItem("deckpick-deck",JSON.stringify(next));setArchivedDecks(listDeckArchives(localStorage));}
    catch{setStorageError("이전 작업을 보관할 공간이 부족합니다. PPTX를 내려받은 뒤 다시 시도해 주세요.");return;}
    setStorageError("");setActiveRunDeck(next.id);setDeck(next);
  }
  function changeInput(patch:Partial<DeckInput>,keepConversation=false){if(!deck)return;const next=updateSetupInput(deck,patch,keepConversation);if(next.id!==deck.id)switchDeck(next);else setDeck(previous=>previous?.id===deck.id?updateSetupInput(previous,patch,keepConversation):previous);}
  function startNewTopic(){const next=freshDeck();if(deck){next.demo=deck.demo;next.input={...next.input,topic:"",purpose:"",audience:"",deckType:deck.input.deckType,designSystemId:deck.input.designSystemId,customPrimary:deck.input.customPrimary,slideCount:deck.input.slideCount};next.designSystem=structuredClone(deck.designSystem);}switchDeck(next);}
  function restoreDeck(id:string){try{const saved=loadDeckArchive(localStorage,id);if(saved)switchDeck({...saved,demo:process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE==="1"?false:publicDemoOnly||saved.demo});else setStorageError("보관된 작업을 읽지 못했습니다.");}catch{setStorageError("보관된 작업을 읽지 못했습니다.");}}
  function deleteArchive(id:string){try{const deleted=deleteDeckArchive(localStorage,id,deck?.id,topic=>window.confirm(`“${topic}” 보관본을 삭제할까요?\n삭제한 대화와 장표는 다시 불러올 수 없습니다. 현재 작업과 원본 첨부 파일은 삭제하지 않습니다.`));if(deleted){setArchivedDecks(listDeckArchives(localStorage));setStorageError("");}}catch{setStorageError("보관된 작업을 삭제하지 못했습니다. 다시 시도해 주세요.");}}
  const [credentials, setCredentials] = useState<Credentials>({
    provider: "openai",
    key: "",
    model: "gpt-6-luna",
    connected: false,
  });
  const [serverKeys, setServerKeys] = useState({
    openai: false,
    anthropic: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/config", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((value: unknown) => {
        const parsed = z
          .object({
            serverKeys: z.object({
              openai: z.boolean(),
              anthropic: z.boolean(),
            }),
          })
          .safeParse(value);
        if (parsed.success) setServerKeys(parsed.data.serverKeys);
      })
      .catch(() => {
        /* Manual key entry remains available if configuration discovery fails. */
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("deckpick-deck");
      if (raw) {
        const r = persistedDeckSchema.safeParse(JSON.parse(raw));
        if (r.success) setDeck({...r.data,demo:process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE==="1"?false:publicDemoOnly || r.data.demo} as Deck);
        else
          setStorageError(
            "이전에 저장한 자료를 읽지 못했습니다. 새 덱을 만들 수 있습니다.",
          );
      }
      setArchivedDecks(listDeckArchives(localStorage));
      const keyRaw = sessionStorage.getItem("deckpick-ai");
      if (keyRaw && !publicDemoOnly) {
        const v: unknown = JSON.parse(keyRaw);
        if (
          typeof v === "object" &&
          v &&
          "key" in v &&
          typeof v.key === "string" &&
          "provider" in v &&
          ["openai", "anthropic"].includes(String(v.provider)) &&
          "model" in v &&
          typeof v.model === "string"
        )
          setCredentials({
            key: v.key,
            provider: v.provider as Credentials["provider"],
            model: v.provider === "openai" && v.model === "gpt-4.1-mini" ? "gpt-6-luna" : v.model,
            connected: false,
          });
      }
    } catch {
      setStorageError(
        "브라우저 저장소를 사용할 수 없습니다. 새로고침 전에 PPTX를 내려받아 주세요.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !deck) return;
    try {
      localStorage.setItem("deckpick-deck", JSON.stringify(deck));
    } catch {
      setStorageError(
        "브라우저 저장 공간이 부족합니다. 새로고침 전에 PPTX를 내려받아 주세요.",
      );
    }
  }, [deck, ready]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        "deckpick-ai",
        JSON.stringify({
          provider: credentials.provider,
          key: credentials.key,
          model: credentials.model,
        }),
      );
    } catch {
      setStorageError("API 키는 현재 화면에서만 유지됩니다.");
    }
  }, [credentials, ready]);
  return (
    <Context.Provider
      value={{
        deck,
        setDeck,
        ready,
        changeInput,startNewTopic,restoreDeck,deleteArchive,archivedDecks,
        storageError,
        credentials,
        setCredentials,
        serverKeys,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStudio() {
  const c = useContext(Context);
  if (!c) throw Error("StudioProvider missing");
  return c;
}
