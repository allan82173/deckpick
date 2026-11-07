import {isShowcaseOnly} from "@/lib/runtime-mode";
import {redirect} from "next/navigation";
import { notFound } from "next/navigation";
import { Studio } from "@/components/studio";
export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string; stage: string }>;
}) {
  if(isShowcaseOnly())redirect("/");
  const { id, stage } = await params;
  if (stage !== "outline" && stage !== "pick" && stage !== "final") notFound();
  return <Studio stage={stage} id={id} />;
}
