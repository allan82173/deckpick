import {isShowcaseOnly} from "@/lib/runtime-mode";
import {PublicShowcase} from "@/components/public-showcase";
import { Studio } from "@/components/studio";
export default function HomePage() {
  return isShowcaseOnly() ? <PublicShowcase/> : <Studio stage="home" />;
}
