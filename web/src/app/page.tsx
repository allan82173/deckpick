import {isShowcaseOnly} from "@/lib/runtime-mode";
import {PublicShowcase} from "@/components/public-showcase";
import { Studio } from "@/components/studio";
export default function HomePage() {
  return process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE!=="1" && isShowcaseOnly() ? <PublicShowcase/> : <Studio stage="home" />;
}
