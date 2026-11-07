import {isShowcaseOnly} from "@/lib/runtime-mode";
import {redirect} from "next/navigation";
import { Studio } from "@/components/studio";
export default function NewPage() {
  if(isShowcaseOnly())redirect("/");
  return <Studio stage="new" />;
}
