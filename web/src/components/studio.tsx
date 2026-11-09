"use client";
import {useUiText, useUiLanguage, LanguageSwitcher} from "@/lib/ui-language";

import {generationFlow,canResumeStoryline} from "@/lib/generation-flow";
import {applyResearchCoverage} from "@/lib/research-coverage";
import {ResearchScopeNotice} from "./research-scope-notice";
import {RequestProgress} from "./request-progress";
import {readApiResponse} from "@/lib/api-stream";
import {DeckSessionControls} from "./deck-session-controls";
import {hasDeckContext,appendSessionMessages} from "@/lib/deck-session";
import { activeRunDeck } from "@/lib/client-run-context";
import { mapConcurrent } from "@/lib/concurrency";
import { GenerationReportButton } from "./generation-report-button";
import { catalogCounts } from "@/lib/layout-catalog";
import { reviewSchema } from "@/lib/task-model";
import { researchRecordSchema } from "@/lib/evidence-model";
import {publicDemoOnly} from "@/lib/runtime-mode";
import {deckChatContext,applySlideChatChanges,slideChatResponseSchema} from "@/lib/slide-chat";
import {slideAttachmentOptions} from "@/lib/insert-page";
import {selectDraftAlternative} from "@/lib/draft-workflow";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Download,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCw,
  Send,
  Layers,
  ImagePlus,
  Sparkles,
  ChevronRight,
  FileText,
  ExternalLink,
  Copy,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useStudio, freshDeck } from "./store";
import { design } from "@/lib/design";
import { demoOutline, demoCandidates } from "@/lib/demo";
import {
  deckInputSchema,
  outlineItemSchema,
  slideSchema,
  sourceSchema,
  layoutNames,
  type Deck,
  type DeckInput,
  type ChatMessage,
  type OutlineItem,
  type SlideSpec,
  type Source,
  type LayoutId,
  MAX_DECK_SLIDES,
  FINAL_DEFAULT_SLIDES,
  type PresentationStage,
} from "@/lib/model";
import { z } from "zod";
import { SlidePreview } from "./slide-preview";
import { candidatePlan, candidateSignature, replaceCandidate, layoutPurpose, plannedFirstLayouts } from "@/lib/candidate-plan";
import { attachmentOptions } from "@/lib/attachment-model";
import { Attachments, useAttachmentUpload } from "./attachments";
import { coverAlternatives, coverStyleNames } from "@/lib/covers";
import { CoverEditor } from "./cover-editor";
import { LayoutLibrary } from "./layout-library";
import {SlideChatPanel} from "./slide-chat-panel";
import { FullDraftReview } from "./full-draft-review";
import { draftSlide,initializeDraftSelections,applyDraftCandidates,draftNeedsCandidates,appendDraftAlternative,sameDraftContext } from "@/lib/draft-workflow";
import {insertDraftPage,pageNeighborContext,type InsertPageInput} from "@/lib/insert-page";

type Stage = "home" | "new" | "outline" | "pick" | "final";
const steps = ["자료·대화", "목차 조정", "전체 초안·수정", "내려받기"];
const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ");
function IconButton({
  children,
  label,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx("icon-button", className)}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Studio({ stage, id }: { stage: Stage; id?: string }) {
  const ui = useUiText();

  const { deck, setDeck, ready, storageError } = useStudio(),
    router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    if (ready && stage === "new" && !deck) setDeck(freshDeck());
  }, [ready, stage, deck, setDeck]);
  const active =
    stage === "new"
      ? 0
      : stage === "outline"
        ? 1
        : stage === "pick"
          ? 2
          : stage === "final"
            ? 3
            : -1;
  const hasDeck = !!deck && (!id || id === deck.id);
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="wordmark">
          Deck<span>Pick</span>
          <span className="wordmark-dot" />
        </Link>
        <nav aria-label={ui("진행 단계")}>
          {steps.map((s, i) => {
            const enabled =
              i === 0 ||
              (!!deck?.outline.length &&
                (i < 3 ||
                  deck.outline.every((_, j) => deck.picked[j] !== undefined)));
            const url =
              i === 0
                ? "/new"
                : `/deck/${deck?.id}/${["", "outline", "pick", "final"][i]}`;
            return (
              <Link
                aria-disabled={!enabled}
                onClick={(e) => {
                  if (!enabled) e.preventDefault();
                }}
                href={enabled ? url : "#"}
                className={cx(
                  "step",
                  active === i && "active",
                  active > i && "done",
                )}
                key={s}
              >
                <span>{active > i ? <Check size={12} /> : i + 1}</span>
                {ui(s)}
              </Link>
            );
          })}
        </nav>
        <Link href="/catalog" target="_blank" className="catalog-link">{ui("디자인 유형 ·")}{catalogCounts.physical}</Link>
        <LanguageSwitcher/><span className="local-badge">{publicDemoOnly?"DEMO":"WORKSPACE"}</span>
      </header>
      {publicDemoOnly && <div className="notice" role="status">{ui("공개 데모 · API 키 없이 예시 슬라이드를 만들고 편집·다운로드할 수 있습니다. 실제 AI 대화·자료 분석·파일 첨부는 제공하지 않습니다. 작업은 현재 브라우저에 저장됩니다.")}</div>}
      {storageError && (
        <div className="notice warning" role="status">
          {ui(storageError)}
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {ui(error)}
          <button onClick={() => setError("")}>{ui("닫기")}</button>
        </div>
      )}
      {!ready ? (
        <div className="loading-page">
          <LoaderCircle className="spin" /> {ui("작업 공간을 준비하고 있습니다.")}</div>
      ) : stage === "home" ? (
        <Home />
      ) : !hasDeck ? (
        <main className="empty">
          <h1>{ui("저장된 덱을 찾을 수 없습니다.")}</h1>
          <p>
            {ui("덱은 이 브라우저에 저장됩니다. 사용하던 브라우저에서 열거나 새 덱을 만들어 주세요.")}</p>
          <Link className="button primary" href="/new">
            {ui("새 덱 만들기")}</Link>
        </main>
      ) : (
        <>
          <div className={cx("mode-strip", deck.demo && "demo-strip")}>
            <span>
              <i />
              {deck.demo
                ? ui("데모 모드 · AI 호출 없이 준비된 예시로 체험합니다. 수치·출처를 생성하지 않습니다.")
                : ui("AI 모드 · 입력 내용은 선택한 AI 제공자에게 전송됩니다.")}
            </span>
            {stage === "new" && !publicDemoOnly && process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE!=="1" && (
              <button
                onClick={() =>
                  setDeck((d) => (d ? { ...d, demo: !d.demo } : d))
                }
              >
                {deck.demo ? ui("실제 AI 연결하기") : ui("데모로 체험하기")}{" "}
                <ArrowRight size={12} />
              </button>
            )}
          </div>
          {stage === "new" ? (
            <Setup onError={setError} />
          ) : stage === "outline" ? (
            <OutlineEditor onError={setError} />
          ) : stage === "pick" ? (
            <Picker onError={setError} />
          ) : (
            <Final onError={setError} />
          )}
        </>
      )}
      <footer className="app-footer">
        <span>DeckPick</span>
        <span>{ui("전체 초안을 보고, 필요한 장만 다듬으세요.")}</span>
        <span>{ui("초안은 브라우저에 자동 저장됩니다.")}</span>
      </footer>
    </div>
  );
}
function Home() {
  const ui = useUiText();

  const { deck, startNewTopic } = useStudio();
  const router = useRouter();
  return (
    <main className="home">
      <div className="home-copy">
        <span className="eyebrow">FROM MESSAGE TO SLIDE</span>
        <h1>
          {ui("내용을 전달하면,")}<br />
          {ui("전체 초안부터 확인하세요.")}</h1>
        <p>
          {ui("AI가 내용과 구성을 채운 전체 덱을 먼저 만듭니다.")}<br className="desktop" /> {ui("마음에 들지 않는 장만 다른 후보로 바꾼 뒤 PPTX로 가져가세요.")}</p>
        <div className="home-actions">
          <button
            className="primary button"
            onClick={() => {
              if (
                deck?.outline.length &&
                !confirm(
                  ui("기존 작업을 보관하고 새 덱을 만들까요?"),
                )
              )
                return;
              startNewTopic();
              router.push("/new");
            }}
          >
            {ui("새 덱 만들기")}<ArrowRight size={17} />
          </button>
          {!!deck?.outline.length && (
            <Link className="button" href={`/deck/${deck.id}/outline`}>
              {ui("이어서 작업하기")}</Link>
          )}
        </div>
        <div className="home-meta">
          <span>
            <CheckCircle2 size={15} /> {ui("컨설팅·마케팅 레이아웃")}</span>
          <span>
            <CheckCircle2 size={15} /> {ui("편집 가능한 PPTX")}</span>
        </div>
      </div>
      {process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE!=="1"&&<div className="home-art">
        <div className="floating-label">
          <Sparkles size={14} /> {ui("컨설팅 장표 포지셔닝 맵 예시")}</div>
        <div className="stack back" />
        <div className="stack middle" />
        <div className="stack front">
          <img
            className="home-positioning-preview"
            src="/examples/positioning-map-blurred.png"
            alt={ui("컨설팅 장표 포지셔닝 맵 예시. 우리 솔루션·플레이어 이름과 범례는 선명하게 표시했습니다. 원래 키메시지, 국내 해외 분류와 설명을 포함한 맵 안의 나머지 내용은 블러 처리했습니다.")}
            width={1400}
            height={788}
          />
          <div className="art-caption">
            <span>
              <CheckCircle2 size={14} /> {ui("발표 사례")}</span>
            <span>POSITIONING MAP</span>
          </div>
        </div>
        <div className="mini-card">
          <Layers size={18} />
          <div>
            <strong>{ui("PowerPoint에서 계속 편집")}</strong>
            <small>{ui("텍스트와 도형을 그대로")}</small>
          </div>
        </div>
      </div>}
      <div className="home-process">
        {[
          ui("주제와 목적을 알려주세요"),
          ui("내용을 채운 전체 덱을 확인하세요"),
          ui("마음에 들지 않는 장만 바꾸세요"),
          ui("PPTX로 이어서 작업하세요"),
        ].map((s, i) => (
          <div key={s}>
            <b>0{i + 1}</b>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
const freshHomeInput: DeckInput = {
  deckType: "consulting",
  designSystemId: "ict-forest",
  topic: "전략 제안",
  purpose: "발표",
  slideCount: 6,
};
function Heading({
  title,
  sub,
  tag,
}: {
  title: string;
  sub: string;
  tag: string;
}) {
  const ui = useUiText();
  return (
    <div className="page-heading">
      <span className="eyebrow">{tag}</span>
      <h1>{title}</h1>
      <p>{ui(sub)}</p>
    </div>
  );
}
function Palette({
  id,
  selected,
  onClick,
  label,
  desc,
}: {
  id: string;
  selected: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  const ui = useUiText();
  const ds = design(id);
  return (
    <button
      type="button"
      className={cx("option-card", selected && "selected")}
      onClick={onClick}
    >
      <span className="option-title">
        {ui(label)}
        {selected && <CheckCircle2 size={15} />}
      </span>
      <small>{ui(desc)}</small>
      <div className="swatches">
        {["primary", "darkest", "accent", "tint", "panel"].map((k) => (
          <i
            key={k}
            style={{ background: ds.colors[k as keyof typeof ds.colors] }}
          />
        ))}
      </div>
    </button>
  );
}
function Setup({ onError }: { onError: (s: string) => void }) {
  const ui = useUiText();

  const { deck, setDeck, credentials, changeInput,startNewTopic,restoreDeck,deleteArchive,archivedDecks } = useStudio(),
    router = useRouter();
  const [renameOnly,setRenameOnly]=useState(false);
  useEffect(()=>setRenameOnly(false),[deck?.id]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"settings" | "chat">("settings");
  if (!deck) return null;
  const input = deck.input;
  const update=(patch:Partial<DeckInput>)=>changeInput(patch,renameOnly);
  async function generate() {
    if (!deck) return;
    const valid = deckInputSchema.safeParse(input);
    if (!valid.success) {
      onError(`주제와 목적을 입력하고, 슬라이드 수는 5~${MAX_DECK_SLIDES}장으로 정해 주세요.`);
      return;
    }
    setBusy(true);
    onError("");
    try {
      let outline: OutlineItem[];
      let researchRecord = deck.researchRecord;
      let researchSources = deck.research;
      if (deck.demo) outline = demoOutline(input);
      else {
        const r = await callAPI(
          "outline",
          {
            input,
            messages: deck.chat.setup,
            ...attachmentOptions(deck.attachments),
            context: "setup",
            sources: deck.research,
            researchRecord: deck.researchRecord,
            resumeStoryline:canResumeStoryline(deck.researchRecord,deck.generation),
          },
          credentials,
          (record, sources) => setDeck(previous => previous?.id === deck.id && JSON.stringify(previous.input) === JSON.stringify(input) ? { ...previous, researchRecord: record, research: sources.length ? sources : previous.research } : previous),
        );
        researchRecord = researchRecordSchema.parse(r.researchRecord);
        researchSources = z.array(sourceSchema).parse(r.sources);
        if (r.needsResearchReview) {
          setDeck(d => d?.id === deck.id ? { ...d, researchRecord, research: researchSources } : d);
          return;
        }
        outline = z.array(outlineItemSchema).parse(r.outlineDraft);
      }
      setDeck((d) =>
        d?.id === deck.id && JSON.stringify(d.input) === JSON.stringify(input) ? { ...d, outline, researchRecord, research: researchSources, candidates: {}, picked: {}, edited: {}, review: undefined } : d,
      );
      if(activeRunDeck()===deck.id)router.push(`/deck/${deck.id}/pick`);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace">
      <Heading
        tag="01 — INPUT & CONVERSATION"
        title={step === "settings" ? ui("어떤 발표 자료를 만들까요?") : ui("AI와 발표 흐름을 잡아보세요")}
        sub={step === "settings" ? ui("덱 유형과 디자인을 선택하고 기본 정보를 입력하세요.") : ui("자료와 요청을 전달한 뒤, 준비되면 전체 초안을 만드세요.")}
      />
      <DeckSessionControls key={deck.id} archives={archivedDecks.filter(d=>d.id!==deck.id)} disabled={busy} onNew={()=>{onError("");setStep("settings");startNewTopic();}} onRestore={id=>{onError("");setStep("settings");restoreDeck(id);}} onDelete={deleteArchive}/>
      <nav className="setup-steps" aria-label={ui("자료·대화 단계")}>
        <button type="button" className={cx("step", step === "settings" && "active")} aria-current={step === "settings" ? "step" : undefined} disabled={busy} onClick={() => setStep("settings")}><span>1</span> {ui("덱 설정")}</button>
        <button type="button" className={cx("step", step === "chat" && "active")} aria-current={step === "chat" ? "step" : undefined} disabled={busy} onClick={() => setStep("chat")}><span>2</span> {ui("AI와 대화")}</button>
      </nav>
      <div className="setup-settings-page" hidden={step !== "settings"}>
        <section className="settings">
          <div className="setting-section">
            <h2>{ui("덱 유형")}</h2>
            <div className="two-options">
              {(["consulting", "marketing"] as const).map((v, i) => (
                <button
                  key={v}
                  className={cx(
                    "option-card",
                    input.deckType === v && "selected",
                  )}
                  onClick={() => update({ deckType: v })}
                >
                  <span className="option-title">
                    {i ? ui("마케팅 / 피치") : ui("컨설팅 / 보고서")}
                    {input.deckType === v && <CheckCircle2 size={15} />}
                  </span>
                  <small>
                    {i
                      ? ui("짧은 카피, 큰 이미지와 숫자 중심")
                      : ui("결론형 헤드라인, 박스·표·흐름도 중심")}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <div className="setting-section">
            <h2>{ui("디자인 시스템")}</h2>
            <div className="two-options">
              <Palette
                id="ict-forest"
                selected={input.designSystemId === "ict-forest"}
                onClick={() => update({ designSystemId: "ict-forest" })}
                label={ui("숲녹색 컨설팅")}
                desc={ui("기본값 · 내 ICT 덱 스타일")}
              />
              <Palette
                id="navy"
                selected={input.designSystemId === "navy"}
                onClick={() => update({ designSystemId: "navy" })}
                label={ui("네이비 리포트")}
                desc={ui("차분한 보고서용")}
              />
              <Palette
                id="coral"
                selected={input.designSystemId === "coral"}
                onClick={() => update({ designSystemId: "coral" })}
                label={ui("코랄 브랜드")}
                desc={ui("마케팅 제안용")}
              />
              {(["lemonade", "sand", "charcoal"] as const).map((id) => <Palette key={id} id={id} selected={input.designSystemId === id} onClick={() => update({ designSystemId: id })} label={design(id).name} desc={id === "lemonade" ? ui("아이디어·신사업 제안") : id === "sand" ? ui("소비재·라이프스타일") : ui("절제된 범용 보고서")} />)}
              <div
                role="group"
                className={cx(
                  "option-card custom-card",
                  input.designSystemId === "custom" && "selected",
                )}
              >
                <button
                  className="plain option-title"
                  onClick={() =>
                    update({
                      designSystemId: "custom",
                      customPrimary: input.customPrimary ?? "#2F6FB0",
                    })
                  }
                >
                  {ui("주색 직접 입력")}{" "}
                  {input.designSystemId === "custom" && (
                    <CheckCircle2 size={15} />
                  )}
                </button>
                <small>{ui("한 가지 색에서 나머지를 만듭니다")}</small>
                <label className="custom-color">
                  <input
                    type="color"
                    aria-label={ui("사용자 지정 주색")}
                    value={input.customPrimary ?? "#2F6FB0"}
                    onChange={(e) =>
                      update({
                        designSystemId: "custom",
                        customPrimary: e.target.value,
                      })
                    }
                  />
                  <span>{input.customPrimary ?? "#2F6FB0"}</span>
                </label>
              </div>
            </div>
            <p className="hint">
              {ui("초안을 확인한 뒤에도 색을 다시 바꿀 수 있어요.")}</p>
          </div>
          <div className="setting-section">
            <h2>{ui("기본 정보")}</h2>
            <label>{ui("발표자료 언어")}<select value={input.language ?? "ko"} onChange={e => update({language: e.target.value as "ko" | "en"})}><option value="ko">한국어</option><option value="en">English</option></select><small>{ui("화면 언어와 별도로 적용됩니다. 기존 장표는 자동 번역하지 않습니다.")}</small></label>
            <label>
              {ui("주제")}<span className="required">*</span>
              <input
                value={input.topic}
                maxLength={250}
                onChange={(e) => update({ topic: e.target.value })}
              />
            </label>
            {hasDeckContext(deck)?<label className="generation-checkbox"><input type="checkbox" checked={renameOnly} onChange={e=>setRenameOnly(e.target.checked)}/><span>{ui("이전 대화를 유지하고 제목만 수정")}</span></label>:<p className="hint">{ui("새 주제의 대화는 별도로 시작합니다. 이전 작업은 보관된 작업에서 다시 열 수 있습니다.")}</p>}
            <label>
              {ui("목적")}<span className="required">*</span>
              <input
                value={input.purpose}
                maxLength={500}
                onChange={(e) => update({ purpose: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label>
                {ui("청중")}<span className="optional">{ui("선택")}</span>
                <input
                  value={input.audience ?? ""}
                  onChange={(e) => update({ audience: e.target.value })}
                />
              </label>
              <label className="count-field">
                {ui("발표 단계")}<select
                  value={input.stage ?? "interim"}
                  onChange={(e) => {
                    const stage = e.target.value as PresentationStage;
                    update({ stage, ...(stage === "final" && input.slideCount < 16 ? { slideCount: FINAL_DEFAULT_SLIDES } : {}) });
                  }}
                >
                  <option value="interim">{ui("중간 발표 · 진단·가설")}</option>
                  <option value="final">{ui("최종 발표 · 컨셉·로드맵")}</option>
                </select>
              </label>
              <label className="count-field">
                {ui("슬라이드 수")}<select
                  value={input.slideCount}
                  onChange={(e) =>
                    update({ slideCount: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: MAX_DECK_SLIDES - 4 }, (_, i) => (
                    <option key={i} value={i + 5}>
                      {i + 5}{ui("장")}{input.stage === "final" && i + 5 >= 20 ? ui(" · 최종 발표 권장") : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {ui("공개 검색 주제")}<span className="optional">{ui("선택 · 외부에 검색해도 되는 내용만 입력")}</span>
              <input value={input.publicSearchTopic ?? ""} onChange={e => update({ publicSearchTopic: e.target.value })} placeholder={ui("외부 검색에 사용할 지역·시장·기관·대상")} />
            </label>
            <label className="generation-checkbox"><input type="checkbox" checked={input.appendSources ?? false} onChange={e => update({ appendSources: e.target.checked })} /><span>{ui("마지막 장에 출처·근거 범위 포함")}<small>{ui("선택한 전체 장 수에 포함됩니다.")}</small></span></label>
            <label className="generation-checkbox"><input type="checkbox" checked={input.internalReview ?? false} onChange={e => update({ internalReview: e.target.checked })} /><span>{ui("내부 검토용 표시")}</span></label>
          </div>
          <button type="button" className="button primary" onClick={() => setStep("chat")}>
            {ui("AI와 대화로 이동")}<ArrowRight size={15} />
          </button>
        </section>
      </div>
      {step==="chat"&&<>
      <RequestProgress deckId={deck.id} busy={busy}/>
      <ResearchScopeNotice record={deck.researchRecord}/>
      <ResearchGate context="setup" mode="generate" busy={busy} onBusy={setBusy} onAttach={() => setStep("chat")} onError={onError}/>
      {deck.generation?.status==="failed"&&!deck.demo&&<div className="notice warning" role="status">{busy?ui("저장된 작업을 확인하고 이어서 생성 중입니다."):ui("마지막 저장 단계: {0}. 완료한 단계는 재사용합니다.", [deck.generation.lastCompletedStage??ui("시작 전")])} <button className="button" disabled={busy} onClick={()=>void generate()}>{busy?ui("진행 중…"):canResumeStoryline(deck.researchRecord,deck.generation)?ui("스토리라인만 다시 생성"):ui("이어서 생성")}</button></div>}
      </>}
      <div className="setup-conversation-page" hidden={step !== "chat"}>
        <ChatPanel key={deck.id} context="setup" onError={onError} />
          <button
            className="button outline-button"
            disabled={busy}
            onClick={generate}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <FileText size={15} />
            )}
            {busy ? ui("공개 조사·근거표·스토리라인 작성 중") : deck.generation?.status==="failed" ? ui("이어서 생성") : ui("전체 초안 만들기")}
            <ArrowRight size={15} />
          </button>
      </div>
    </main>
  );
}
function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.";
}
async function requestAPI(
  action: string,
  payload: Record<string, unknown>,
  credentials: { provider: string; key: string; model: string },
): Promise<Record<string, unknown>> {
  const executionDeckId=activeRunDeck();
  const startedAt=Date.now();
  const progress=(active:boolean)=>window.dispatchEvent(new CustomEvent("deckpick-request-progress",{detail:{deckId:executionDeckId,action,active,startedAt,contactAt:Date.now()}}));
  progress(true);
  try {
  const networkFailed=(error:unknown)=>{if(executionDeckId)window.dispatchEvent(new CustomEvent("deckpick-generation",{detail:{deckId:executionDeckId,input:JSON.stringify(payload.input),generation:{runId:executionDeckId,status:"failed",completedStages:[],updatedAt:new Date().toISOString(),error:"연결이 끊겼습니다. 이어서 생성할 수 있습니다."}}}));throw error instanceof TypeError&&/fetch|network/i.test(error.message)?new Error("서버와 연결이 끊겼습니다. 서버가 실행 중인지 확인한 뒤 저장된 단계에서 이어서 생성해 주세요."):error;};
  const transportResponse = await fetch("/api/" + action, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-deckpick-stream": "1",
      ...(credentials.key ? { "x-user-api-key": credentials.key } : {}),
    },
    body: JSON.stringify({
      ...payload,
      runId:executionDeckId,
      provider: credentials.provider,
      model: credentials.model,
    }),
  }).catch(networkFailed);
  const response = await readApiResponse(transportResponse,()=>progress(true)).catch(networkFailed);
  const result: unknown = await response.json().catch(networkFailed);
  if (typeof result !== "object" || result === null)
    throw Error("응답을 읽을 수 없습니다.");
  const data = result as Record<string, unknown>;
  if(data.executionDelta&&action!=="key-check")window.dispatchEvent(new CustomEvent("deckpick-execution",{detail:{deckId:executionDeckId,execution:data.executionDelta,input:JSON.stringify(payload.input)}}));
  if(data.generationState)window.dispatchEvent(new CustomEvent("deckpick-generation",{detail:{deckId:executionDeckId,generation:data.generationState,input:JSON.stringify(payload.input)}}));
  if (!response.ok)
    throw Error(
      typeof data.error === "string" ? data.error : "AI 요청에 실패했습니다.",
    );
  return data;
  } finally { progress(false); }
}
async function callAPI(action: string, payload: Record<string, unknown>, credentials: { provider: string; key: string; model: string }, onResearch?: (record: z.infer<typeof researchRecordSchema>, sources: Source[]) => void): Promise<Record<string, unknown>> {
  const origin=activeRunDeck();
  const request=(name:string,data:Record<string,unknown>,auth:typeof credentials)=>{if(activeRunDeck()!==origin)throw Error("주제가 바뀌어 이전 요청의 후속 작업을 중단했습니다.");return requestAPI(name,data,auth);};
  if (((action === "outline" || action === "chat") && payload.context !== "slide") || action==="storyline/resume") {
    return generationFlow(payload,(name,data)=>request(name,data,credentials),{cloud:process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE==="1",resumeOnly:action==="storyline/resume"||payload.resumeStoryline===true,onResearch});
  }
  return request(action, payload, credentials);
}

function ResearchGate({ context, mode, busy = false, onBusy, onAttach, onError }: { context: "setup" | "outline"; mode: "generate" | "proposal"; busy?: boolean; onBusy?: (value: boolean) => void; onAttach?: () => void; onError: (text: string) => void }) {
  const ui = useUiText();

  const { deck, setDeck, credentials } = useStudio();
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const record = deck?.researchRecord?applyResearchCoverage(deck.researchRecord):undefined;
  const legacyReview=!!deck?.researchRecord?.requiresReview;
  const gateRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(record?.requiresReview)gateRef.current?.scrollIntoView({behavior:"smooth",block:"center"});},[record?.requiresReview]);
  if (!deck || !record || (!record.requiresReview&&!legacyReview)) return null;
  async function proceed(additionalResearch: boolean) {
    if (working || busy || !deck) return;
    const snapshot = deck;
    setWorking(true); onBusy?.(true); onError("");
    try {
      const payload = { input: snapshot.input, messages: snapshot.chat[context], outline: snapshot.outline,
        researchRecord: snapshot.researchRecord, sources: snapshot.research, ...attachmentOptions(snapshot.attachments), context };
      const result = additionalResearch ? await callAPI("outline", payload, credentials)
        : await callAPI("storyline/resume", { ...payload, acceptLimitedEvidence: true }, credentials);
      const nextRecord = researchRecordSchema.parse(result.researchRecord);
      const sources = z.array(sourceSchema).parse(result.sources);
      const outline = z.array(outlineItemSchema).parse(result.outlineDraft ?? []);
      setDeck(previous => {
        if (!previous || previous.id !== snapshot.id || JSON.stringify(previous.input) !== JSON.stringify(snapshot.input)) return previous;
        const next = { ...previous, research: sources, researchRecord: nextRecord };
        if (result.needsResearchReview) return next;
        if (mode === "generate") return { ...next, outline, candidates: {}, picked: {}, edited: {}, review: undefined };
        return { ...next, chat: { ...next.chat, [context]: [...next.chat[context], { role: "assistant" as const, text: String(result.reply) + "\n" + nextRecord.notice, outlineDraft: outline, sources, createdAt: new Date().toISOString() }] } };
      });
      if (activeRunDeck()===snapshot.id && !result.needsResearchReview && mode === "generate") router.push(`/deck/${snapshot.id}/pick`);
    } catch (error) { onError(errorMessage(error)); }
    finally { setWorking(false); onBusy?.(false); }
  }
  return <section ref={gateRef} className="research-gate" role="status"><h3>{record.requiresReview?ui("사용할 공개 자료의 범위를 선택해 주세요."):ui("확인된 공개 자료로 초안을 계속할 수 있습니다.")}</h3>
    <p>{record.notice}</p><ul>{record.gaps?.map(gap => <li key={gap.questionId}><strong>{gap.question}</strong><br />{gap.missing}</li>)}</ul>
    <div className="research-gate-actions"><button className="button" disabled={working || busy} onClick={() => void proceed(true)}>{ui("추가 조사")}</button>
      {onAttach && <button className="button" disabled={working || busy} onClick={onAttach}>{ui("자료 첨부로 보완")}</button>}
      <button className="button primary" disabled={working || busy} onClick={() => void proceed(false)}>{working ? ui("진행 중") : ui("현재 자료 범위로 초안 만들기")}</button></div>
  </section>;
}

function Sources({ sources }: { sources: Source[] }) {
  const ui = useUiText();

  return (
    <div className="sources">
      {sources.length ? (
        sources.map((s) => (
          <a href={s.url} key={s.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={11} />
            {s.title}
          </a>
        ))
      ) : (
        <span>{ui("외부 자료 없음")}</span>
      )}
    </div>
  );
}
function ChatPanel({
  context,
  index = 0,
  onError,
  onRegenerate,
}: {
  context: "setup" | "outline" | "slide";
  index?: number;
  onError: (s: string) => void;
  onRegenerate?: (instruction: string) => Promise<void>;
}) {
  const ui = useUiText();

  const { deck, setDeck, credentials, setCredentials, serverKeys } =
      useStudio(),
    router = useRouter();
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [keyBusy, setKeyBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const uploads = useAttachmentUpload();
  const hasServerKey = serverKeys[credentials.provider];
  const localAgent = credentials.provider === "claude-code" || credentials.provider === "codex";
  const messages = deck
    ? context === "setup"
      ? deck.chat.setup
      : context === "outline"
        ? deck.chat.outline
        : (deck.chat.slides[index] ?? [])
    : [];
  const previouslyShown = new Set(messages.flatMap((message) => message.imageIds ?? []));
  const photoIds = uploads.files
    .filter((file) => file.kind === "image" && file.includeForAI !== false && !previouslyShown.has(file.id))
    .map((file) => file.id);
  const visiblePhotos = new Set<string>();
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, busy]);
  if (!deck) return null;
  function append(newMessages: ChatMessage[]) {
    if(deck)setDeck(d=>appendSessionMessages(d,deck.id,context,index,newMessages));
  }
  async function check() {
    setKeyBusy(true);
    onError("");
    try {
      await callAPI("key-check", {}, credentials);
      setCredentials((c) => ({ ...c, connected: true }));
      setDeck((d) => (d ? { ...d, demo: false } : d));
    } catch (e) {
      onError(errorMessage(e));
      setCredentials((c) => ({ ...c, connected: false }));
    } finally {
      setKeyBusy(false);
    }
  }
  async function send(value = text) {
    if ((!value.trim() && !photoIds.length) || busy || uploads.busy || !deck) return;
    value = value.trim() || "첨부한 사진을 보고 발표 자료에 반영할 핵심 내용과 구성을 제안해 주세요.";
    onError("");
    const message: ChatMessage = {
      role: "user",
      text: value.trim(),
      imageIds: photoIds,
      createdAt: new Date().toISOString(),
    };
    append([message]);
    setText("");
    setBusy(true);
    try {
      if (context === "slide") {
        await onRegenerate?.(value);
        append([
          {
            role: "assistant",
            text: deck.demo
              ? "데모 후보를 다시 배치했습니다. 실제 AI 수정은 API 연결 후 사용할 수 있습니다."
              : "요청 내용을 반영한 후보를 다시 만들었습니다.",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else if (deck.demo) {
        const requestedCount = Number(value.match(/(\d{1,2})\s*장/)?.[1]);
        const draft = demoOutline({
          ...deck.input,
          slideCount:
            requestedCount >= 5 && requestedCount <= 20
              ? requestedCount
              : deck.input.slideCount,
        });
        append([
          {
            role: "assistant",
            text: "데모용 아웃라인입니다. 실제 자료 조사와 자유로운 대화 수정은 API 연결 후 사용할 수 있어요. 아래 구성은 직접 수정할 수 있습니다.",
            outlineDraft: draft,
            sources: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        const requestedCount = Number(value.match(/(\d{1,2})\s*장/)?.[1]);
        const requestInput = {
          ...deck.input,
          slideCount:
            requestedCount >= 5 && requestedCount <= 20
              ? requestedCount
              : deck.input.slideCount,
        };
        const r = await callAPI(
          "chat",
          {
            context,
            input: requestInput,
            messages: [...messages, message],
            ...attachmentOptions(deck.attachments),
            outline: deck.outline,
            sources: deck.research,
            webSearch:
              context === "setup" && /조사|검색|리서치|근거/.test(value),
          },
          credentials,
        );
        if (r.needsResearchReview) {
          const record = researchRecordSchema.parse(r.researchRecord);
          const sources = z.array(sourceSchema).parse(r.sources);
          append([{ role: "assistant", text: record.notice, createdAt: new Date().toISOString() }]);
          setDeck(previous => previous?.id === deck.id ? { ...previous, input: requestInput, research: sources, researchRecord: record } : previous);
          return;
        }
        const draft = z.array(outlineItemSchema).parse(r.outlineDraft),
          sources = z.array(sourceSchema).parse(r.sources ?? []);
        append([
          {
            role: "assistant",
            text: String(r.reply) + "\n\n" + researchRecordSchema.parse(r.researchRecord).notice,
            outlineDraft: draft,
            sources,
            createdAt: new Date().toISOString(),
          },
        ]);
        setDeck((d) => (d?.id===deck.id ? { ...d, research: sources, researchRecord: researchRecordSchema.parse(r.researchRecord), input: requestInput } : d));
      }
    } catch (e) {
      if(activeRunDeck()!==deck.id)return;
      onError(errorMessage(e));
      append([
        {
          role: "assistant",
          text: "요청을 완료하지 못했습니다.\n" + errorMessage(e),
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  function apply(draft: OutlineItem[]) {
    if (!deck) return;
    if (
      deck.outline.length &&
      Object.keys(deck.candidates).length &&
      !confirm(
        "아웃라인을 바꾸면 기존 후보와 선택을 새로 만들어야 합니다. 반영할까요?",
      )
    )
      return;
    setDeck((d) =>
      d
        ? {
            ...d,
            outline: draft.map((v, i) => ({ ...v, index: i })),
            input: { ...d.input, slideCount: draft.length },
            candidates: {},
            picked: {},
            edited: {},
          }
        : d,
    );
    if (context === "setup") router.push(`/deck/${deck.id}/pick`);
  }
  return (
    <aside
      className={cx(
        "chat-panel",
        context === "setup" ? "setup-chat" : "compact-chat",
      )}
      aria-label={ui("AI 채팅")}
      onPasteCapture={(e) => { const photos = Array.from(e.clipboardData.items).filter((item) => item.kind === "file" && item.type.startsWith("image/")).map((item) => item.getAsFile()).filter((file): file is File => file !== null); if (photos.length) { e.preventDefault(); void uploads.upload(photos); } }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); void uploads.upload(Array.from(e.dataTransfer.files)); } }}
    >
      <div className="chat-heading">
        <span>
          <Sparkles size={15} /> {ui("AI와 대화")}</span>
        <span
          className={cx(
            "connection-badge",
            credentials.connected && "connected",
          )}
        >
          {deck.demo
            ? ui("데모 모드")
            : credentials.connected
              ? ui("연결됨")
              : hasServerKey
                ? ui("서버 키 설정됨")
                : ui("API 키 미연결")}
        </span>
      </div>
      {!publicDemoOnly && <details className="api-settings" open={!credentials.key && !hasServerKey}>
        <summary>{ui("AI 연결 설정")}</summary>
        <div className="key-row">
          <select
            aria-label={ui("AI 제공자")}
            value={credentials.provider}
            onChange={(e) =>
              setCredentials((c) => ({
                ...c,
                provider: e.target.value as typeof c.provider,
                model:
                  e.target.value === "openai"
                    ? "gpt-6-luna"
                    : e.target.value === "claude-code"
                      ? "sonnet"
                      : e.target.value === "codex"
                        ? "default"
                        : "claude-sonnet-5-5",
                key: "",
                connected: false,
              }))
            }
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Claude</option>
            {serverKeys["claude-code"] && <option value="claude-code">{ui("Claude Code (이 PC 로그인)")}</option>}
            {serverKeys.codex && <option value="codex">{ui("Codex (이 PC 로그인)")}</option>}
          </select>
          {!localAgent && <input
            aria-label={ui("API 키")}
            placeholder={hasServerKey ? ui("저장된 서버 키 사용") : ui("API 키")}
            type="password"
            autoComplete="off"
            value={credentials.key}
            onChange={(e) =>
              setCredentials((c) => ({
                ...c,
                key: e.target.value,
                connected: false,
              }))
            }
          />}
          <button
            className="primary"
            disabled={keyBusy || (!credentials.key.trim() && !hasServerKey)}
            onClick={check}
          >
            {keyBusy ? (
              <LoaderCircle size={13} className="spin" />
            ) : hasServerKey && !credentials.key ? (
              ui("연결 확인")
            ) : (
              ui("연결")
            )}
          </button>
        </div>
        <label className="model-label">
          {ui("모델")}<input
            aria-label={ui("모델 이름")}
            value={credentials.model}
            onChange={(e) =>
              setCredentials((c) => ({
                ...c,
                model: e.target.value,
                connected: false,
              }))
            }
          />
        </label>
        <p className="hint">
          {localAgent
            ? ui("API 키 없이 이 PC에 로그인된 CLI로 실행합니다. 사용량은 해당 구독 한도에서 차감되고, 공개 사이트에서는 쓸 수 없습니다.")
            : hasServerKey && !credentials.key
            ? ui("API 키가 서버에 설정돼 있습니다. 키를 다시 입력하지 않아도 됩니다. 연결 확인과 채팅에는 API 크레딧이 필요합니다.")
            : ui("직접 입력한 키는 이 브라우저 세션에만 저장하며, 선택한 AI 제공자의 연결 확인과 생성 요청에 사용합니다.")}
        </p>
        {credentials.key && (
          <button
            className="text-button"
            onClick={() =>
              setCredentials((c) => ({ ...c, key: "", connected: false }))
            }
          >
            {ui("저장된 키 지우기")}</button>
        )}
      </details>}
      <Attachments state={uploads} collapseList />
      <div className="chat-log" ref={logRef}>
        <div className="bubble assistant">
          {context === "setup"
            ? ui("주제와 참고 내용을 알려주세요. 자료를 조사해서 목차와 키메시지를 먼저 잡아 드릴게요.")
            : context === "outline"
              ? ui("구성에서 바꾸고 싶은 부분을 알려주세요. 제안을 확인한 뒤 반영할 수 있습니다.")
              : ui("선택한 장표에서 바꾸고 싶은 내용을 알려주세요. 세 후보를 다시 제안합니다.")}
        </div>
        {messages.map((m, i) => {
          const newPhotos = (m.imageIds ?? []).filter((id) => {
            if (visiblePhotos.has(id)) return false;
            visiblePhotos.add(id);
            return true;
          });
          return (
          <div className={cx("message", m.role)} key={i}>
            <span className="message-role">
              {m.role === "user" ? ui("나") : "DeckPick"}
            </span>
            <div className={cx("bubble", m.role)}>{newPhotos.length ? <div className="message-photos">{newPhotos.map((id) => <a key={id} href={`/api/attachments/${id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/attachments/${id}`} alt={ui("대화에 첨부한 사진")} width={120} height={90} /></a>)}</div> : null}{m.text}</div>
            {m.outlineDraft && (
              <div className="draft-card">
                <div className="draft-label">
                  <FileText size={13} /> {ui("구성 제안")}{" "}
                  <small>{m.outlineDraft.length}{ui("장")}</small>
                </div>
                {m.outlineDraft.map((o, j) => (
                  <div className="draft-row" key={j}>
                    <b>{String(j + 1).padStart(2, "0")}</b>
                    <div>
                      <small>{o.section}</small>
                      <p>{o.message}</p>
                    </div>
                  </div>
                ))}
                <Sources sources={m.sources ?? []} />
                <button
                  className="button primary"
                  onClick={() => apply(m.outlineDraft!)}
                >
                  {context === "setup" ? ui("이 구성으로 진행") : ui("이 제안 반영")}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          );
        })}
        {busy && (
          <div className="bubble assistant pending">
            <LoaderCircle size={14} className="spin" />{" "}
            {deck.demo ? ui("예시를 준비하고 있어요") : ui("구성을 검토하고 있어요…")}
          </div>
        )}
      </div>
      <div className="chat-bottom">
        {context === "setup" && (
          <div className="chips">
            {[
              ui("조사부터 해줘"),
              ui("결론을 앞에 두는 흐름으로"),
              ui("슬라이드 6장 안으로"),
            ].map((s) => (
              <button key={s} disabled={busy} onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <input type="file" ref={photoInput} hidden multiple accept="image/png,image/jpeg,image/webp" aria-label={ui("사진 파일 선택")} onChange={(e) => { if (e.target.files) void uploads.upload(Array.from(e.target.files)); e.target.value = ""; }} />
        <div className="composer">
          <button type="button" className="photo-attach-button" aria-label={ui("사진 첨부")} title={ui("사진 첨부 · 캡처는 Ctrl+V")} disabled={uploads.busy || uploads.files.length >= 5} onClick={() => photoInput.current?.click()}><ImagePlus size={18} /></button>
          <textarea
            aria-label={ui("메시지")}
            value={text}
            placeholder={
              context === "slide"
                ? ui("예: 두 대안을 비교하는 흐름으로")
                : ui("추가할 맥락이나 요청을 입력하세요")
            }
            onChange={(e) => setText(e.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !composing.current &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="primary send-button"
            disabled={busy || uploads.busy || (!text.trim() && !photoIds.length)}
            aria-label={ui("보내기")}
            onClick={() => void send()}
          >
            <Send size={15} />
          </button>
        </div>
        <small>{ui("Ctrl+V 사진 붙여넣기 · Enter 전송 · Shift + Enter 줄바꿈")}</small>
      </div>
    </aside>
  );
}
function OutlineEditor({ onError }: { onError: (s: string) => void }) {
  const ui = useUiText();

  const { deck, setDeck } = useStudio(),
    router = useRouter();
  if (!deck) return null;
  const change = (index: number, patch: Partial<OutlineItem>) =>
    setDeck((d) =>
      d
        ? {
            ...d,
            outline: d.outline.map((o, i) =>
              i === index ? { ...o, ...patch } : o,
            ),
            candidates: {},
            picked: {},
            edited: {},
          }
        : d,
    );
  function move(i: number, delta: number) {
    setDeck((d) => {
      if (!d) return d;
      const outline = [...d.outline];
      [outline[i], outline[i + delta]] = [outline[i + delta], outline[i]];
      return {
        ...d,
        outline: outline.map((o, j) => ({ ...o, index: j })),
        candidates: {},
        picked: {},
        edited: {},
      };
    });
  }
  return (
    <main className="workspace">
      <Heading
        tag="02 — OUTLINE"
        title={ui("먼저, 이야기의 흐름을 맞춰볼까요?")}
        sub={ui("각 장의 섹션과 핵심 메시지를 확인하세요. 장표를 만들기 전 내용을 다듬는 단계입니다.")}
      />
      <div className="outline-grid">
        <section>
          <div className="section-toolbar">
            <span>
              <b>{deck.outline.length}{ui("장의 슬라이드")}</b>
              <small>{ui("순서와 문구를 자유롭게 수정하세요.")}</small>
            </span>
            <span className="saved">
              <Check size={13} /> {ui("자동 저장")}</span>
          </div>
          <div className="outline-list">
            {deck.outline.map((o, i) => (
              <article className="outline-item" key={i}>
                <span className="outline-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="outline-content">
                  <label>
                    {ui("섹션")}<input
                      aria-label={ui("{0}번 섹션", [i + 1])}
                      maxLength={8}
                      value={o.section}
                      onChange={(e) => change(i, { section: e.target.value })}
                    />
                  </label>
                  <label>
                    {ui("키메시지")}<input
                      aria-label={ui("{0}번 키메시지", [i + 1])}
                      value={o.message}
                      onChange={(e) => change(i, { message: e.target.value })}
                    />
                  </label>
                  <details>
                    <summary>{ui("포함할 내용")}</summary>
                    <textarea
                      aria-label={ui("{0}번 포함할 내용", [i + 1])}
                      value={o.contentHint}
                      onChange={(e) =>
                        change(i, { contentHint: e.target.value })
                      }
                    />
                  </details>
                </div>
                <div className="outline-controls">
                  <IconButton
                    label={ui("{0}번 위로", [i + 1])}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    label={ui("{0}번 아래로", [i + 1])}
                    disabled={i === deck.outline.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton
                    label={ui("{0}번 삭제", [i + 1])}
                    disabled={deck.outline.length <= 5}
                    onClick={() => {
                      if (confirm(ui("{0}번 슬라이드를 삭제할까요?", [i + 1])))
                        setDeck((d) =>
                          d
                            ? {
                                ...d,
                                input: {
                                  ...d.input,
                                  slideCount: d.outline.length - 1,
                                },
                                outline: d.outline
                                  .filter((_, j) => j !== i)
                                  .map((v, j) => ({ ...v, index: j })),
                                candidates: {},
                                picked: {},
                                edited: {},
                              }
                            : d,
                        );
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </article>
            ))}
          </div>
          <button
            className="button add-slide"
            disabled={deck.outline.length >= MAX_DECK_SLIDES}
            onClick={() =>
              setDeck((d) =>
                d
                  ? {
                      ...d,
                      input: { ...d.input, slideCount: d.outline.length + 1 },
                      outline: [
                        ...d.outline,
                        {
                          index: d.outline.length,
                          section: ui("추가"),
                          message: ui("새로운 핵심 메시지를 입력해 주세요"),
                          contentHint: ui("포함할 내용을 입력해 주세요"),
                        },
                      ],
                      candidates: {},
                      picked: {},
                      edited: {},
                    }
                  : d,
              )
            }
          >
            <Plus size={15} /> {ui("슬라이드 추가")}</button>
          <div className="page-actions">
            <Link href="/new" className="button">
              <ArrowLeft size={14} /> {ui("입력으로")}</Link>
            <button
              className="button primary"
              onClick={() => {
                const r = z
                  .array(outlineItemSchema)
                  .min(5)
                  .max(MAX_DECK_SLIDES)
                  .safeParse(deck.outline);
                if (!r.success) {
                  onError(ui("비어 있는 섹션·메시지를 확인해 주세요."));
                  return;
                }
                if(activeRunDeck()===deck.id)router.push(`/deck/${deck.id}/pick`);
              }}
            >
              {ui("전체 초안 만들기")}<ArrowRight size={15} />
            </button>
          </div>
        </section>
        <ResearchGate context="outline" mode="proposal" onError={onError}/>
        <ChatPanel context="outline" onError={onError} />
      </div>
    </main>
  );
}
function Picker({ onError }: { onError: (s: string) => void }) {
  const ui = useUiText();

  const { deck, setDeck, credentials } = useStudio(),
    router = useRouter();
  const [current, setCurrent] = useState(0),
    [reviewView,setReviewView]=useState<"full"|"compare">("full"),
    [busy, setBusy] = useState<number | null>(null),
    [failed, setFailed] = useState<{ index: number; slot?: number; requestedLayout?:LayoutId;kind?:"draft"|"alternatives" } | null>(null),
    [running, setRunning] = useState(false),
    [replacing, setReplacing] = useState<{ index: number; slot: number } | null>(null);
  const generationLock = useRef(false);
  const deckRef = useRef(deck),
    credentialsRef = useRef(credentials);
  const cancel = useRef(false);
  const [color, setColor] = useState(
    deck?.designSystem.colors.primary ?? "#244C3C",
  );
  deckRef.current = deck;
  credentialsRef.current = credentials;
  async function generate(
    index: number,
    instruction = "",
    singleIndex?: number,
    requestedLayout?:LayoutId,
  ) {
    const d = deckRef.current;
    if (!d) return;
    if (generationLock.current) throw Error("다른 후보를 만들고 있습니다. 완료 후 다시 시도해 주세요.");
    generationLock.current = true;
    setReplacing(singleIndex === undefined ? null : { index, slot: singleIndex });
    setBusy(index);
    onError("");
    try {
      const existing = d.candidates[index] ?? [];
      const round = d.candidateRounds?.[index] ?? (existing.length ? 1 : 0);
      const exclude = singleIndex === undefined && (d.input.deckType !== "consulting" || index === 0) ? [] : [...new Set(existing.map((v) => v.layoutId).filter((v) => !v.endsWith("cover")))];
      const previousSignatures = singleIndex === undefined ? [] : existing.map(candidateSignature);
      let candidates: SlideSpec[];
      if (d.demo)
        candidates = demoCandidates(d.input, d.outline[index], exclude, round, singleIndex === undefined ? 3 : 1, previousSignatures,requestedLayout);
      else {
        const r = await callAPI(
          singleIndex === undefined ? "candidates" : "candidates/regenerate",
          {
            input: d.input,
            item: d.outline[index],
            ...slideAttachmentOptions(d,index),
            outline: d.outline,
            sources: d.research,
            researchRecord: d.researchRecord,
            previousLayouts: (() => { const planned = plannedFirstLayouts(d.input, d.outline); return d.outline.slice(0, index).map((_, i) => draftSlide(d, i)?.layoutId ?? planned[i]).filter(Boolean); })(),
            instruction,
            exclude,
            rotation: round,
            previousSignatures,
            requestedLayout,
          },
          credentialsRef.current,
        );
        candidates = z.array(slideSchema).parse(r.candidates);
      }
      setDeck((previous) => {
        if (
          !previous ||
          previous.id !== d.id ||
          JSON.stringify(previous.outline) !== JSON.stringify(d.outline)
        )
          return previous;
        let result: Deck;
        if (singleIndex !== undefined) result = replaceCandidate(previous, index, singleIndex, candidates[0]);
        else {
          const picked = { ...previous.picked }, edited = { ...previous.edited };
          delete picked[index]; delete edited[index];
          result = { ...previous, candidates: { ...previous.candidates, [index]: candidates }, picked, edited };
        }
        result = { ...result, candidateRounds: { ...previous.candidateRounds, [index]: (round + 1) % 10000 } };
        deckRef.current = result;
        return result;
      });
      setFailed(null);
    } catch (e) {
      setFailed({ index, slot: singleIndex,requestedLayout });
      onError(errorMessage(e));
      throw e;
    } finally {
      setBusy(null);
      setReplacing(null);
      generationLock.current = false;
    }
  }
  async function sendSlideChat(index:number,text:string){
    const snapshot=deckRef.current,primary=snapshot?draftSlide(snapshot,index):undefined;
    if(!snapshot||!primary)throw Error("이 장의 초안을 먼저 준비해 주세요.");
    const message:ChatMessage={role:"user",text,createdAt:new Date().toISOString()};
    const history=[...(snapshot.chat.slides[index]??[]),message];
    setDeck(d=>d&&sameDraftContext(d,snapshot)?{...d,chat:{...d.chat,slides:{...d.chat.slides,[index]:history}}}:d);
    try{
      const result=snapshot.demo?{reply:"데모에서는 실제 AI 수정이 실행되지 않습니다. 이 요청과 다른 장의 최신 내용을 함께 읽는 연결은 준비되어 있습니다. 실제 AI 모드에서 이 장의 문구를 수정하거나 질문할 수 있습니다.",changes:[]} :slideChatResponseSchema.parse(await callAPI("slides/chat",{input:snapshot.input,currentSlide:primary,designSystem:snapshot.designSystem,targetIndex:index,messages:history.slice(-8),deckContext:deckChatContext(snapshot),researchRecord:snapshot.researchRecord,...slideAttachmentOptions(snapshot,index)},credentialsRef.current));
      const proposed=result.changes.length?applySlideChatChanges(primary,snapshot.designSystem,index,snapshot.input.topic,snapshot.outline.map(o=>o.section),result.changes):null;
      setDeck(d=>{
        if(!d||d.id!==snapshot.id)return d;
        const currentIndex=Object.entries(d.chat.slides).find(([,log])=>log.some(m=>m.createdAt===message.createdAt&&m.role==="user"&&m.text===text));
        if(!currentIndex)return d;
        const target=Number(currentIndex[0]),current=draftSlide(d,target);
        const unchanged=current&&JSON.stringify(current)===JSON.stringify(primary);
        let updated=d,reply=result.reply;
        if(proposed&&unchanged){updated={...d,edited:{...d.edited,[target]:proposed}};}
        else if(result.changes.length)reply+="\n응답 도중 장표가 수정되어 자동 적용하지 않았습니다. 최신 내용으로 다시 요청해 주세요.";
        const next={...updated,chat:{...updated.chat,slides:{...updated.chat.slides,[target]:[...(updated.chat.slides[target]??[]),{role:"assistant" as const,text:reply,createdAt:new Date().toISOString()}]}}};deckRef.current=next;return next;
      });
    }catch(e){throw Error(errorMessage(e));}
  }
  async function requestInitialCandidates(snapshot:Deck,index:number):Promise<SlideSpec[]>{
    const item=snapshot.outline[index],primary=draftSlide(snapshot,index);
    const existing=snapshot.candidates[index]??(primary?[primary]:[]);
    const target=candidatePlan(snapshot.input,item).length;
    if(existing.length>=target)return existing;
    const sources=[...new Map([...snapshot.research,...(primary?.sources??[])].map(s=>[s.url,s])).values()];
    const base={input:snapshot.input,item,outline:snapshot.outline,sources,researchRecord:snapshot.researchRecord,previousLayouts:snapshot.outline.slice(0,index).map((item,i)=>draftSlide(snapshot,i)?.layoutId??candidatePlan(snapshot.input,item)[0]).filter(Boolean),...slideAttachmentOptions(snapshot,index)};
    if(!existing.length){
      if(snapshot.demo)return demoCandidates(snapshot.input,item,[],0,target);
      const r=await callAPI("candidates",{...base,instruction:"첫 완성 초안과 장별 후보를 함께 만듭니다. 후보별 핵심 메시지와 근거는 유지하고, 장 역할에 적합한 서로 다른 표현 구조를 사용하세요. 사실·추론·가정을 구분하며 없는 수치를 만들지 마세요. 앞뒤 장의 내용: "+JSON.stringify(pageNeighborContext(snapshot,index)).slice(0,3600)},credentialsRef.current);
      return z.array(slideSchema).min(1).max(3).parse(r.candidates);
    }
    const seen=[...existing];
    for(let slot=seen.length;slot<target;slot++){
      if(cancel.current)break;
      const exclude=seen.filter(s=>!s.layoutId.endsWith("cover")).map(s=>s.layoutId);
      const instruction="현재 초안과 직접 편집을 보존하고 다른 표현 후보를 만듭니다. 핵심 메시지와 근거는 유지하세요. 현재 초안: "+JSON.stringify({headline:primary?.headline,data:primary?.data,canvasEdits:primary?.canvasEdits}).slice(0,4000);
      const candidate=snapshot.demo?demoCandidates(snapshot.input,item,exclude,slot,1,seen.map(candidateSignature))[0]:z.array(slideSchema).length(1).parse((await callAPI("candidates/regenerate",{...base,exclude,rotation:slot,previousSignatures:seen.map(candidateSignature),instruction},credentialsRef.current)).candidates)[0];
      seen.push(candidate);
    }
    return seen;
  }
  async function insertAndGenerate(at:number,input:InsertPageInput){
    const snapshot=deckRef.current;if(!snapshot||generationLock.current)throw Error("진행 중인 작업이 끝난 뒤 추가해 주세요.");
    const inserted=insertDraftPage(snapshot,at,input);
    generationLock.current=true;setRunning(true);setBusy(at);setFailed(null);onError("");setCurrent(at);
    setDeck(previous=>{if(!previous||!sameDraftContext(previous,snapshot))return previous;const next=insertDraftPage(previous,at,input);deckRef.current=next;return next;});
    try{
      const options=await requestInitialCandidates(inserted,at);
      if(!cancel.current)setDeck(previous=>{if(!previous||!sameDraftContext(previous,inserted))return previous;const next=applyDraftCandidates(previous,at,options);deckRef.current=next;return next;});
    }catch(e){if(!cancel.current){setFailed({index:at,kind:"draft"});onError("페이지 위치와 키메시지는 저장했습니다. "+errorMessage(e));}}
    finally{generationLock.current=false;if(!cancel.current){setRunning(false);setBusy(null);}}
  }
  async function inspectWholeDraft(snapshot: Deck) {
    if (snapshot.demo || !snapshot.researchRecord?.analysis || snapshot.outline.some((_, index) => !draftSlide(snapshot, index))) return;
    const result = await callAPI("deck/review", { input: snapshot.input, currentDeck: snapshot }, credentialsRef.current);
    const replacements = z.array(z.object({ index: z.number().int(), before: slideSchema, slide: slideSchema, swapWith: z.number().int().optional() })).parse(result.replacements);
    const review = reviewSchema.parse(result.review);
    if (cancel.current) return;
    setDeck(previous => {
      if (!previous || !sameDraftContext(previous, snapshot)) return previous;
      let next = previous;
      let stale = false;
      for (const replacement of replacements) {
        if (JSON.stringify(draftSlide(next, replacement.index)) !== JSON.stringify(replacement.before)) { stale = true; continue; }
        const slot = next.picked[replacement.index] ?? 0;
        const candidates = [...next.candidates[replacement.index]];
        // 레이아웃 반복 수정은 새로 만들지 않고 기존 후보와 자리를 바꾼다(swapWith). 원래 후보는 바꾼 자리로 옮겨 남긴다.
        if (replacement.swapWith !== undefined && replacement.swapWith !== slot && candidates[replacement.swapWith]) candidates[replacement.swapWith] = candidates[slot];
        candidates[slot] = replacement.slide;
        next = { ...next, candidates: { ...next.candidates, [replacement.index]: candidates } };
      }
      next = { ...next, review: stale ? { ...review, summary: "검토 도중 장표가 변경돼 일부 수정을 적용하지 않았습니다. 전체 검토를 다시 실행해 주세요." } : review };
      deckRef.current = next;
      return next;
    });
  }
  async function reviewDraft() {
    const snapshot = deckRef.current;
    if (!snapshot || generationLock.current) return;
    generationLock.current = true; setRunning(true); setBusy(null); onError("");
    try { await inspectWholeDraft(snapshot); }
    catch (error) { onError("전체 논리 검토를 완료하지 못했습니다. " + errorMessage(error)); }
    finally { generationLock.current = false; if (!cancel.current) setRunning(false); }
  }
  async function buildDraft(){
    const snapshot=deckRef.current;
    if(!snapshot?.outline.length||generationLock.current)return;
    generationLock.current=true;cancel.current=false;setRunning(true);setFailed(null);onError("");
    setDeck(d=>{if(!d||!sameDraftContext(d,snapshot))return d;const next=initializeDraftSelections(d);deckRef.current=next;return next;});
    let activeIndex=0;
    // React state updaters run on the next render, so deckRef can lag behind the last finished slide.
    // Keep a synchronously built copy for the automatic whole-deck review below.
    let built=initializeDraftSelections(deckRef.current&&sameDraftContext(deckRef.current,snapshot)?deckRef.current:snapshot);
    try{
      const missing=snapshot.outline.map((_,i)=>i).filter(i=>draftNeedsCandidates(deckRef.current??snapshot,i));
      const results=await mapConcurrent(missing,async i=>{
        if(cancel.current)return;
        setBusy(i);
        const working=deckRef.current&&sameDraftContext(deckRef.current,snapshot)?deckRef.current:snapshot;
        const options=await requestInitialCandidates(working,i);
        if(cancel.current)return;
        built=applyDraftCandidates(built,i,options);
        setDeck(previous=>{if(!previous||!sameDraftContext(previous,snapshot))return previous;const next=applyDraftCandidates(previous,i,options);deckRef.current=next;return next;});
      });
      const failure=results.findIndex(r=>r.status==="rejected");if(failure>=0){activeIndex=missing[failure];const result=results[failure];if(result.status==="rejected")throw result.reason;}
      if (!cancel.current) {
        setBusy(null);
        const latest=deckRef.current&&sameDraftContext(deckRef.current,snapshot)&&deckRef.current.outline.every((_,index)=>!!draftSlide(deckRef.current!,index))?deckRef.current:built;
        await inspectWholeDraft(latest);
      }
    }catch(e){if(!cancel.current){setFailed({index:activeIndex,kind:"draft"});onError(errorMessage(e));}}
    finally{generationLock.current=false;if(!cancel.current){setRunning(false);setBusy(null);}}
  }
  async function ensureAlternatives(index:number){
    const snapshot=deckRef.current;
    if(!snapshot||generationLock.current||(snapshot.candidates[index]?.length??0)>=3)return;
    const primary=draftSlide(snapshot,index);if(!primary)return;
    generationLock.current=true;setBusy(index);setFailed(null);onError("");
    let seen=[...(snapshot.candidates[index]??[primary])];
    try{
      for(let slot=seen.length;slot<candidatePlan(snapshot.input,snapshot.outline[index]).length;slot++){
        if(cancel.current)break;
        setReplacing({index,slot});
        const round=(snapshot.candidateRounds?.[index]??0)+slot;
        const exclude=seen.filter(s=>!s.layoutId.endsWith("cover")).map(s=>s.layoutId);
        let candidate:SlideSpec;
        if(snapshot.demo)candidate=demoCandidates(snapshot.input,snapshot.outline[index],exclude,round,1,seen.map(candidateSignature))[0];
        else{
          const sources=[...new Map([...snapshot.research,...primary.sources].map(s=>[s.url,s])).values()];
          const r=await callAPI("candidates/regenerate",{input:snapshot.input,item:snapshot.outline[index],outline:snapshot.outline,sources,researchRecord:snapshot.researchRecord,previousLayouts:snapshot.outline.slice(0,index).map((item,i)=>draftSlide(snapshot,i)?.layoutId??candidatePlan(snapshot.input,item)[0]).filter(Boolean),...slideAttachmentOptions(snapshot,index),exclude,rotation:round,previousSignatures:seen.map(candidateSignature),instruction:"현재 초안을 유지하고 다른 표현 후보를 만듭니다. 핵심 메시지·근거·사용자 수정을 보존하며 표현 구조를 바꾸세요. 현재 초안: "+JSON.stringify({headline:primary.headline,data:primary.data,notes:primary.notes,canvasEdits:primary.canvasEdits}).slice(0,4000)},credentialsRef.current);
          candidate=z.array(slideSchema).length(1).parse(r.candidates)[0];
        }
        if(cancel.current)break;
        seen=[...seen,candidate];
        setDeck(previous=>{if(!previous||!sameDraftContext(previous,snapshot))return previous;const next=appendDraftAlternative(previous,index,candidate);deckRef.current=next;return next;});
      }
    }catch(e){if(!cancel.current){setFailed({index,kind:"alternatives"});onError(errorMessage(e));}}
    finally{generationLock.current=false;if(!cancel.current){setBusy(null);setReplacing(null);}}
  }
  useEffect(()=>{
    cancel.current=false;
    if(["failed","incomplete"].includes(deckRef.current?.generation?.status??""))return;
    if(deckRef.current?.generation?.completedStages.some(stage=>stage.startsWith("candidate:"))&&deckRef.current.outline.some((_,i)=>!draftSlide(deckRef.current!,i)))return;
    const timer=window.setTimeout(()=>void buildDraft(),0);
    return()=>{window.clearTimeout(timer);cancel.current=true;};
  },[]); // Prepare the full draft and suitable alternatives together on first entry.
  if (!deck) return null;
  const selected = deck.picked[current],
    candidates = deck.candidates[current],
    slide = deck.edited[current] ?? candidates?.[selected],
    count = Object.keys(deck.picked).length,
    all = deck.outline.every((_, i) => deck.picked[i] !== undefined),
    regenerate = async (text: string) => {
      if (running || busy !== null) throw Error("현재 후보 생성이 끝난 뒤 다시 시도해 주세요.");
      if (
        deck.edited[current] &&
        !confirm("직접 수정한 내용이 초기화됩니다. 세 후보를 다시 만들까요?")
      )
        return;
      await generate(current, text);
    };
  function setDesign(id: string, hex?: string) {
    const ds = design(id, hex);
    setColor(ds.colors.primary);
    setDeck((d) =>
      d
        ? {
            ...d,
            designSystem: ds,
            input: {
              ...d.input,
              designSystemId: id as DeckInput["designSystemId"],
              customPrimary: hex ?? d.input.customPrimary,
            },
          }
        : d,
    );
  }
  const sections = deck.outline.map((o) => o.section);
  if(reviewView==="full")return <FullDraftReview onReview={()=>void reviewDraft()} deck={deck} busyIndex={busy} running={running} failed={failed?.kind==="draft"} onRetry={()=>void buildDraft()} onError={onError} onInsert={insertAndGenerate} onSlideChat={sendSlideChat} onLoadAlternatives={index=>{void ensureAlternatives(index);}} onSelectAlternative={(index,slot)=>setDeck(d=>d?selectDraftAlternative(d,index,slot):d)} onCompare={index=>{setCurrent(index);setReviewView("compare");void ensureAlternatives(index);}} onEdit={(edited,index)=>setDeck(d=>d?{...d,edited:{...d.edited,[index]:edited}}:d)}/>;
  return (
    <main className="workspace picker-workspace">
      <Heading
        tag="03 — PICK & EDIT"
        title={ui("이 장만 다른 표현으로 바꿔보세요.")}
        sub={ui("선택된 장표가 현재 초안입니다. 다른 후보를 확인하고 마음에 드는 결과로 교체하세요.")}
      />
      <div className="pick-grid">
        <aside className="slide-sidebar">
          <div className="sidebar-label">
            {ui("슬라이드")}{" "}
            <span>
              {count}/{deck.outline.length}
            </span>
          </div>
          {deck.outline.map((o, i) => (
            <button
              key={i}
              onClick={() => {setCurrent(i);void ensureAlternatives(i);}}
              className={cx("slide-nav", current === i && "active")}
            >
              <span className="slide-nav-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <small>{o.section}</small>
                <p>{o.message}</p>
              </span>
              {deck.picked[i] !== undefined ? (
                <CheckCircle2 size={14} />
              ) : running && !deck.candidates[i] ? (
                <span className="pending-dot" />
              ) : null}
            </button>
          ))}
          <div className="selection-progress">
            <div>
              <i style={{ width: `${(count / deck.outline.length) * 100}%` }} />
            </div>
            <small>{count}{ui("장 선택 완료")}</small>
          </div>
        </aside>
        <section className="pick-center">
          <div className="color-bar">
            <span>{ui("덱 전체 색상")}</span>
            <div className="color-controls">
              {[
                ["ict-forest", "#244C3C"],
                ["navy", "#1F3A5F"],
                ["coral", "#D9534F"],
                ["lemonade", "#5131B5"],
                ["sand", "#876244"],
                ["charcoal", "#42474F"],
              ].map(([id, hex]) => (
                <button
                  key={id}
                  aria-label={ui("{0} 색상", [id])}
                  className={cx(
                    "color-dot",
                    deck.input.designSystemId === id && "active",
                  )}
                  style={{ background: hex }}
                  onClick={() => setDesign(id)}
                />
              ))}
              <input
                type="color"
                aria-label={ui("덱 사용자 지정 색")}
                value={color}
                onChange={(e) => setDesign("custom", e.target.value)}
              />
              <input
                className="hex-field"
                aria-label={ui("주색 HEX")}
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (/^#[\da-f]{6}$/i.test(e.target.value))
                    setDesign("custom", e.target.value);
                }}
              />
            </div>
          </div>
          <div className="current-heading">
            <button className="text-button draft-back" onClick={()=>{setDeck(d=>d?initializeDraftSelections(d):d);setReviewView("full");}}><ArrowLeft size={14}/> {ui("전체 초안으로 돌아가기")}</button>
            <span className="section-kicker">
              {String(current + 1).padStart(2, "0")} /{" "}
              {deck.outline[current]?.section}
            </span>
            <h2>{deck.outline[current]?.message}</h2>
            <div className="candidate-meta">
              <span>
                {busy === current
                  ? replacing ? ui("해당 자리의 새 후보를 만들고 있습니다. 나머지는 유지됩니다.") : ui("서로 다른 세 가지 구성을 만들고 있습니다.")
                  : ui("내용은 같아도, 전달하는 방식은 다릅니다.")}
              </span>
              <button
                className="text-button"
                disabled={running || busy !== null}
                onClick={() => void regenerate("").catch(() => {})}
              >
                <RefreshCw size={12} /> {ui("전체 다시 생성")}</button>
            </div>
          </div>
          {current === 0 && deck.input.deckType === "consulting" && candidates?.length > 0 && <div className="notice cover-upgrade"><span>{ui("표지를 사진 반반형 · 화이트 보고서형 · 큰 제목형으로 비교해 보세요.")}</span><button className="button small" disabled={running || busy !== null} onClick={() => {
            if (deck.edited[0] && !confirm(ui("직접 수정한 표지를 기준으로 제목·디자인 3안을 만들고 표지 선택을 해제합니다. 계속할까요?"))) return;
            setDeck((d) => {
              if (!d?.candidates[0]?.[0]) return d;
              const base = d.edited[0] ?? d.candidates[0][d.picked[0] ?? 0];
              const picked = { ...d.picked }, edited = { ...d.edited }; delete picked[0]; delete edited[0];
              return { ...d, candidates: { ...d.candidates, 0: coverAlternatives(base, d.input.topic) }, picked, edited };
            });
          }}>{ui("표지 디자인 3안 적용 · API 사용 없음")}</button></div>}
          {failed !== null && (
            <div className="notice warning">
              {failed.index + 1}{ui("번 장표")}{failed.slot !== undefined ? ui("의 후보 {0} 교체", [String.fromCharCode(65 + failed.slot)]) : ui(" 후보 생성")}{ui("에 실패했습니다. 기존 후보는 유지됩니다.")}<button
                onClick={() => {
                  setCurrent(failed.index);
                  if(failed.kind==="alternatives")void ensureAlternatives(failed.index);
                  else void generate(failed.index, "", failed.slot,failed.requestedLayout).catch(() => {});
                }}
              >
                {ui("이 장 다시 시도")}</button>
            </div>
          )}
          {current>0&&<LayoutLibrary deck={deck} index={current} busy={running||busy!==null} onPick={(id,slot)=>{
            if(deck.edited[current]&&selected===slot&&!confirm(ui("직접 수정한 후보를 새 구성으로 교체합니다. 다른 후보는 유지됩니다. 계속할까요?")))return;
            void generate(current,ui("표현 유형을 {0}로 바꾸되 현재 장의 핵심 메시지와 제공된 근거를 유지하세요. 예시 문구와 합성 수치를 실제 근거처럼 복사하지 마세요.", [layoutNames[id]]),slot,id).catch(()=>{});
          }}/>}
          <div className="candidate-grid" style={{"--candidate-columns":Math.max(1,candidates?.length??3)} as CSSProperties}>
            {[0, 1, 2].map((i) => (
              <article
                key={i}
                className={cx("candidate-card", selected === i && "selected")}
              >
                <div className="candidate-top">
                  <span>
                    {ui("후보")}{String.fromCharCode(65 + i)}
                    {candidates?.[i] && (
                      <small>{layoutNames[candidates[i].layoutId]}</small>
                    )}
                  </span>
                  {selected === i && (
                    <span className="picked-tag">
                      <Check size={11} /> {ui("선택됨")}</span>
                  )}
                </div>
                {candidates?.[i] && <p className="candidate-purpose">{candidates[i].layoutId === "c-cover" ? coverStyleNames[String(candidates[i].data.coverStyle ?? "classic")] : layoutPurpose[candidates[i].layoutId]}</p>}
                {!candidates?.[i] || (busy === current && (!replacing || replacing.slot === i)) ? (
                  <div className="slide-skeleton">
                    <Layers size={24} />
                    <span>{replacing?.index === current && replacing.slot === i ? ui("새 후보 준비 중") : ui("레이아웃 준비 중")}</span>
                  </div>
                ) : (
                  <>
                    <button
                      className="preview-select"
                      aria-label={ui("후보 {0} 선택", [String.fromCharCode(65 + i)])}
                      onClick={() =>
                        setDeck((d) => {
                          if (!d) return d;
                          const edited = { ...d.edited };
                          if (d.picked[current] !== i) delete edited[current];
                          return {
                            ...d,
                            picked: { ...d.picked, [current]: i },
                            edited,
                          };
                        })
                      }
                    >
                      <SlidePreview
                        slide={selected === i && slide ? slide : candidates[i]}
                        design={deck.designSystem}
                        page={current + 1}
                        name={deck.input.topic}
                        sections={sections}
                      />
                    </button>
                    <Sources sources={candidates[i].sources} />
                    <div className="candidate-bottom">
                      <button
                        className={cx(
                          "button small",
                          selected === i && "primary",
                        )}
                        onClick={() =>
                          setDeck((d) => {
                            if (!d) return d;
                            const edited = { ...d.edited };
                            if (d.picked[current] !== i) delete edited[current];
                            return {
                              ...d,
                              picked: { ...d.picked, [current]: i },
                              edited,
                            };
                          })
                        }
                      >
                        {selected === i
                          ? ui("선택한 레이아웃")
                          : ui("이 레이아웃 선택")}
                      </button>
                      <IconButton
                        className="replace-candidate"
                        label={ui("후보 {0} 버리고 새 후보 받기", [String.fromCharCode(65 + i)])}
                        disabled={busy !== null || running}
                        onClick={() => {
                          if (
                            deck.edited[current] &&
                            selected === i &&
                            !confirm(
                              ui("직접 수정한 내용이 초기화됩니다. 다시 만들까요?"),
                            )
                          )
                            return;
                          void generate(current, "", i).catch(() => {});
                        }}
                      >
                        <Trash2 size={13} />
                        <span>{ui("새 후보로 교체")}</span>
                      </IconButton>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
          {slide ? (
            <DirectEditor
              key={`${current}-${selected}`}
              slide={slide}
              onChange={(next) =>
                setDeck((d) =>
                  d ? { ...d, edited: { ...d.edited, [current]: next } } : d,
                )
              }
            />
          ) : (
            <div className="edit-empty">
              <FileText size={18} />
              <span>
                {ui("레이아웃을 선택하면 여기에서 문구를 직접 수정할 수 있어요.")}</span>
            </div>
          )}
          <div className="page-actions">
            <Link className="button" href={`/deck/${deck.id}/outline`}>
              <ArrowLeft size={14} /> {ui("아웃라인")}</Link>
            <div className="action-group">
              <button
                className="button"
                disabled={current >= deck.outline.length - 1}
                onClick={() => {setCurrent(current+1);void ensureAlternatives(current+1);}}
              >
                {ui("다음 장")}<ChevronRight size={14} />
              </button>
              <button
                className="button primary"
                disabled={!all}
                onClick={() => router.push(`/deck/${deck.id}/final`)}
              >
                {ui("다운로드 확인")}<ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
        <SlideChatPanel index={current} files={deck.outline[current]?.attachments} messages={deck.chat.slides[current]??[]} disabled={running||busy!==null||!slide} demo={deck.demo} onSend={sendSlideChat}/>
      </div>
    </main>
  );
}
type Leaf = { path: (string | number)[]; value: string; kind?:"number"|"boolean" };
function leaves(value: unknown, path: (string | number)[] = []): Leaf[] {
  if (typeof value === "string") return [{ path, value }];
  if (typeof value === "number" || typeof value === "boolean") return [{path,value:String(value),kind:typeof value as "number"|"boolean"}];
  if (Array.isArray(value))
    return value.flatMap((v, i) => leaves(v, [...path, i]));
  if (typeof value === "object" && value)
    return Object.entries(value).flatMap(([k, v]) => leaves(v, [...path, k]));
  return [];
}
function setAt(
  value: Record<string, unknown>,
  path: (string | number)[],
  text: string,
) {
  const copy = structuredClone(value);
  let target: Record<string | number, unknown> = copy;
  for (const part of path.slice(0, -1))
    target = target[part] as Record<string | number, unknown>;
  const key=path.at(-1)!;
  target[key] = typeof target[key]==="number" && text!=="" ? Number(text) : typeof target[key]==="boolean" ? text==="true" : text;
  return copy;
}
const fieldNames: Record<string, string> = {
  title: "제목",
  subtitle: "부제",
  author: "작성자",
  items: "목차",
  columns: "박스",
  bullets: "본문",
  steps: "단계",
  body: "설명",
  blocks: "블록",
  rows: "지표",
  label: "항목",
  value: "값",
  strong: "핵심 설명",
  sub: "보조 설명",
  options: "대안",
  criteria: "비교 기준",
  cells: "표 내용",
  points: "요약",
  conclusion: "결론",
  product: "제품·주제",
  tagline: "핵심 카피",
  image: "이미지 설명",
  message: "메시지",
  highlight: "강조 문구",
  imageSide: "이미지 방향",
  stats: "성과",
  features: "특징",
  icon: "아이콘 문자",
  desc: "설명",
  quote: "인용",
  person: "인용자",
  cta: "행동 제안",
  contact: "연락처",
  chips: "보조 키워드",
  stages:"여정 단계",action:"고객 행동",touchpoint:"접점",friction:"불편·이탈",focus:"강조 단계(0부터)",takeaway:"핵심 시사점",problem:"핵심 문제",branches:"원인 분류",causes:"원인 가설",status:"근거 상태",situation:"문제 상황",observations:"확인할 항목",tests:"검증 질문",xAxis:"가로축",yAxis:"세로축",x:"가로 위치(0~1)",y:"세로 위치(0~1)",name:"항목 이름",rationale:"축·위치의 근거",inputs:"입력 자료",layer:"연결 레이어",layerBody:"연결 방식",outputs:"결과·판단",principle:"설계 원칙",panels:"비교 구조",output:"결과",note:"설명",owner:"담당 역할",record:"근거 기록",beforeTitle:"현재·이전 제목",afterTitle:"제안·이후 제목",before:"현재·이전",after:"제안·이후",seriesName:"지표 이름",unit:"단위",period:"기간",mode:"수치 구분",
};
function DirectEditor({
  slide,
  onChange,
}: {
  slide: SlideSpec;
  onChange: (s: SlideSpec) => void;
}) {
  const ui = useUiText();

  return (
    <section className="direct-editor">
      <div className="editor-heading">
        <span>
          <FileText size={15} /> {ui("선택한 장표 직접 수정")}</span>
        <small>{ui("수정하면 미리보기와 PPTX에 함께 반영됩니다.")}</small>
      </div>
      <div className="edit-fields">
        <label>
          {ui("섹션")}<input
            value={slide.section}
            maxLength={8}
            onChange={(e) => onChange({ ...slide, section: e.target.value })}
          />
        </label>
        <label className="wide">
          {ui("헤드라인")}<input
            value={slide.headline}
            onChange={(e) =>
              onChange({
                ...slide,
                headline: e.target.value,
                ...(slide.layoutId === "c-cover"
                  ? { data: { ...slide.data, title: e.target.value } }
                  : slide.layoutId === "m-cover"
                    ? { data: { ...slide.data, product: e.target.value } }
                    : {}),
              })
            }
          />
        </label>
        {leaves(slide.data).filter(({ path }) => !["coverStyle", "photoId", "referencePhoto"].includes(String(path[0]))).map(({ path, value,kind }) => (
          <label
            key={path.join(".")}
            className={value.length > 26 ? "wide" : ""}
          >
            {path
              .map((p) =>
                typeof p === "number" ? `${p + 1}` : ui(fieldNames[p] ?? p),
              )
              .join(" / ")}
            {kind==="boolean"?<input type="checkbox" checked={value==="true"} onChange={e=>onChange({...slide,data:setAt(slide.data,path,String(e.target.checked))})}/>:kind==="number"?<input type="number" step={path.at(-1)==="x"||path.at(-1)==="y"?.01:1} value={value} onChange={e=>onChange({...slide,data:setAt(slide.data,path,e.target.value)})}/>:path.at(-1)==="status"||path.at(-1)==="mode"?<select value={value} onChange={e=>onChange({...slide,data:setAt(slide.data,path,e.target.value)})}>{(path.at(-1)==="mode"?[["illustrative",ui("합성 데이터")],["observed",ui("실측 데이터")]]:slide.layoutId.endsWith("before-after")?[["proposal",ui("제안·검증 전")],["measured",ui("제공 측정 결과")]]:[["hypothesis",ui("검증 전 가설")],["evidence",ui("제공 근거 기반")]]).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>:path.at(-1) === "imageSide" ? (
              <select
                value={value}
                onChange={(e) =>
                  onChange({
                    ...slide,
                    data: setAt(slide.data, path, e.target.value),
                  })
                }
              >
                <option value="left">{ui("왼쪽")}</option>
                <option value="right">{ui("오른쪽")}</option>
              </select>
            ) : value.length > 26 || value.includes("\n") ? (
              <textarea
                value={value}
                onChange={(e) =>
                  onChange({
                    ...slide,
                    data: setAt(slide.data, path, e.target.value),
                  })
                }
              />
            ) : (
              <input
                value={value}
                onChange={(e) =>
                  onChange({
                    ...slide,
                    data: setAt(slide.data, path, e.target.value),
                  })
                }
              />
            )}
          </label>
        ))}
      </div>
      {slide.layoutId === "c-cover" && <CoverEditor slide={slide} onChange={onChange} />}
      <p className="hint">
        {ui("**핵심 단어**처럼 입력하면 강조됩니다. 긴 문구는 줄여 주세요.")}</p>
    </section>
  );
}
function Final({ onError }: { onError: (s: string) => void }) {
  const ui = useUiText();

  const { deck } = useStudio();
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(["", "", ""]),
    [copied, setCopied] = useState(false);
  if (!deck) return null;
  const complete = deck.outline.every((_, i) => deck.picked[i] !== undefined);
  return (
    <main className="workspace final-workspace">
      <div className="final-heading">
        <Heading
          tag="04 — YOUR DECK"
          title={ui("이제, 발표를 완성할 차례입니다.")}
          sub={ui("전체 흐름과 출처를 한 번 더 확인하고 PowerPoint에서 이어서 편집하세요.")}
        />
        <button
          className="button primary"
          disabled={busy || !complete}
          onClick={async () => {
            setBusy(true);
            onError("");
            try {
              const { exportDeck } = await import("@/lib/export");
              await exportDeck(deck);
            } catch (e) {
              onError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}{" "}
          {ui("PPTX 다운로드")}</button>
      </div>
      <div className="notice">
        <CheckCircle2 size={15} />
        {complete
          ? ui("{0}장 초안 준비 완료 · 텍스트와 도형을 PowerPoint에서 수정할 수 있습니다.", [deck.outline.length])
          : ui("아직 준비되지 않은 슬라이드가 있습니다.")}
        <Link href={`/deck/${deck.id}/pick`}>{ui("전체 초안·수정으로 돌아가기")}</Link>
      </div>
      <GenerationReportButton deck={deck}/>
      <p className="font-notice">
        {ui("PowerPoint에서 같은 글꼴로 보려면 PC에 Pretendard를 설치해 주세요. 이미지는 설명이 표시된 자리로 내보냅니다.")}</p>
      <div className="final-slides">
        {deck.outline.map((_, i) => {
          const slide = deck.edited[i] ?? deck.candidates[i]?.[deck.picked[i]];
          return (
            <article key={i}>
              <div className="final-slide-label">
                <span>SLIDE {String(i + 1).padStart(2, "0")}</span>
                <small>
                  {slide ? layoutNames[slide.layoutId] : ui("선택 필요")}
                </small>
              </div>
              {slide && (
                <>
                  <SlidePreview
                    slide={slide}
                    design={deck.designSystem}
                    name={deck.input.topic}
                    page={i + 1}
                    sections={deck.outline.map((o) => o.section)}
                  />
                  <Sources sources={slide.sources} />
                </>
              )}
            </article>
          );
        })}
      </div>
      <section className="feedback">
        <span className="eyebrow">A SMALL RETROSPECTIVE</span>
        <h2>{ui("만드는 과정은 어땠나요?")}</h2>
        <p>
          {ui("다음 발표를 위해 짧게 남겨 보세요. 답변은 이 화면에서만 유지됩니다.")}</p>
        {[
          ui("가장 도움이 된 기능은 무엇인가요?"),
          ui("기대와 달랐던 점은 무엇인가요?"),
          ui("다음에 만들고 싶은 발표 자료는 무엇인가요?"),
        ].map((q, i) => (
          <label key={q}>
            {i + 1}. {q}
            <textarea
              value={feedback[i]}
              onChange={(e) =>
                setFeedback((v) =>
                  v.map((s, j) => (i === j ? e.target.value : s)),
                )
              }
            />
          </label>
        ))}
        <button
          className="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                feedback
                  .map((a, i) => `${i + 1}. ${a || ui("답 없음")}`)
                  .join("\n\n"),
              );
              setCopied(true);
            } catch {
              onError(ui("복사하지 못했습니다. 답변을 직접 선택해 복사해 주세요."));
            }
          }}
        >
          <Copy size={14} />
          {copied ? ui("복사했습니다") : ui("답변 복사")}
        </button>
      </section>
    </main>
  );
}
