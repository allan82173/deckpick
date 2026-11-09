"use client";
import {useUiText} from "@/lib/ui-language";
import type { Deck } from "@/lib/model";
import { deckCountWarning } from "@/lib/slide-quality";
import { draftSlide } from "@/lib/draft-workflow";

export function EvidenceReview({ deck }: { deck: Deck }) {
  const ui = useUiText();

  const record = deck.researchRecord;
  if (!record) return null;
  return <section className="evidence-review">
    <p className={record.searchStatus === "searched" ? "notice" : "notice warning"} role="status">{record.notice}</p>
    {deckCountWarning(deck.input.slideCount, deck.outline.length).map(warning => <p className="notice warning" key={warning}>{warning}</p>)}
    {record.analysis && <details><summary>{ui("과제 해석·현재 판단·요구사항 확인")}</summary>
      <p>{ui("발표 단계 ·")}{record.analysis.stage} / {record.analysis.slideCount}{ui("장")}</p>
      <p>{ui("공개 검색 맥락 ·")}{record.analysis.publicContext.map(item => `${item.dimension} ${item.value}`).join(" · ")}</p>
      <ol>{record.analysis.questions.map(question => {
        const decision = record.decisions?.find(item => item.questionId === question.id);
        return <li key={question.id}><strong>{question.question}</strong>{decision && <><p>[{decision.strength}] {decision.judgment}</p><p>{ui("선택 기준 ·")}{decision.criteria.join(" / ")}</p><p>{ui("판단을 바꿀 조건 ·")}{decision.reversalConditions.join(" / ")}</p></>}</li>;
      })}</ol>
      <ul>{record.analysis.checklist.map(item => {
        const result = deck.review?.checklist.find(check => check.id === item.id);
        return <li key={item.id}>{result ? result.passed ? ui("충족") : ui("확인 필요") : ui("검토 대기")} · {item.requirement}{result && ` — ${result.reason}`}</li>;
      })}</ul>
    </details>}
    <details><summary>{ui("근거표와 장별 검사 결과 ·")}{record.evidence.length}{ui("개 근거")}</summary>
      <div className="evidence-table-scroll"><table><thead><tr><th>{ui("ID·구분")}</th><th>{ui("주장·원문")}</th><th>{ui("출처·맥락")}</th></tr></thead><tbody>
        {record.evidence.map(row => <tr key={row.id}><td>[{row.id}] {ui(row.kind)}<br />{row.questionIds?.join(" ")}</td><td>{row.claim}{row.originalText && <blockquote>{row.originalText}</blockquote>}{row.relatedFacts?.map((fact,index)=><details key={index}><summary>{ui("같은 출처의 추가 주장 ·")}{fact.originalVerified ? ui("원문 확인") : ui("원문 미확인")}</summary><p>{fact.claim}</p>{fact.originalText && <blockquote>{fact.originalText}</blockquote>}<small>{fact.contextMatch} · {fact.contextReason}</small></details>)}<small>{row.originalVerified ? ui("원문 문구 대조됨") : ui("원문 문구 미확인")}</small></td><td>{row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer">{row.title}</a> : row.title}<br />{ui(row.materialType ?? "")} · {ui(row.contextMatch ?? "")}<br />{row.contextReason}<br />{ui("발행")}{row.publishedAt || ui("미확인")} {ui("· 확인")}{row.checkedAt}</td></tr>)}
      </tbody></table></div>
      <div className="evidence-table-scroll"><table><thead><tr><th>{ui("장")}</th><th>{ui("역할·근거")}</th><th>{ui("검사")}</th></tr></thead><tbody>
        {deck.outline.map((item, index) => {
          const slide = draftSlide(deck, index);
          const semantic = deck.review?.issues.filter(issue => issue.index === index) ?? [];
          return <tr key={index}><td>{index + 1}. {item.message}</td><td>{ui(item.role ?? "미지정")}<br />{item.evidenceRefs?.map(id => `[${id}]`).join("")}</td><td>{slide?.quality ? slide.quality.warnings.length ? slide.quality.warnings.join(" / ") : ui("형식 검사 통과") : ui("검사 대기")}{slide?.quality && <small> {ui("· 수정")}{slide.quality.attempts}{ui("회 · 채움")}{Math.round(slide.quality.fillRatio * 100)}%</small>}{semantic.map((issue, i) => <p key={i}>{issue.category} · {issue.reason}</p>)}</td></tr>;
        })}
      </tbody></table></div>
    </details>
  </section>;
}
