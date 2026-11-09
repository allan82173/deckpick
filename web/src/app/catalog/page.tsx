"use client";
import {useUiText, LanguageSwitcher} from "@/lib/ui-language";
import Link from "next/link";
import { catalogLayoutIds, catalogCounts } from "@/lib/layout-catalog";
import { layoutNames } from "@/lib/model";
import { expandedKind, expandedRegistry } from "@/lib/expanded-layouts";
import { sampleData } from "@/lib/demo";
import { design } from "@/lib/design";
import { SlidePreview } from "@/components/slide-preview";
export default function CatalogPage(){const ui=useUiText();return <main className="design-catalog-page"><Link href="/new">{ui("← 작업 공간")}</Link><LanguageSwitcher/><p>DeckPick · DESIGN CATALOG</p><h1>{catalogCounts.physical}{ui("개 배치 유형")}</h1><p>덱별 구현 {catalogCounts.implementations}개 · 이번 확장 {catalogCounts.added}개 · 아래 수치·인물·조사·화면은 모두 합성 예시입니다.</p>{[0,1,2,3,4].map(stage=><details key={stage} open={stage===1}><summary>{ui(["기존 유형","1. 판단·근거","2. 차트·데이터","3. 일정·시간","4. 구성 확장"][stage])}</summary><div className="design-catalog-grid">{catalogLayoutIds.filter(id=>(expandedKind(id)?expandedRegistry[expandedKind(id)!].stage:0)===stage).map((id,index)=>{const k=expandedKind(id),meta=k?expandedRegistry[k]:undefined,item={index,section:"구성 예시",message:`${ui(layoutNames[id])} · 합성 예시`,contentHint:""};return <article key={id}><h2>{ui(layoutNames[id])}</h2><SlidePreview slide={{layoutId:id,section:item.section,headline:item.message,data:sampleData(id,item),sources:[]}} design={design("ict-forest")} page={index+1}/><p>{meta?.use??"기존에 지원하던 구성입니다."}</p>{meta&&<dl><dt>{ui("장 역할")}</dt><dd>{meta.roles.join(" / ")}</dd><dt>{ui("쓰지 않을 때")}</dt><dd>{meta.avoid}</dd><dt>{ui("최소 데이터")}</dt><dd>{meta.minimum}</dd></dl>}</article>})}</div></details>)}</main>}
