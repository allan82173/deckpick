import { GENERATION_CONFIG } from "./generation-config";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { gunzipSync, brotliDecompressSync } from "node:zlib";
import { extractAttachment } from "./attachments";

export type OriginalPage = { url: string; text: string; opened: boolean; checkedAt: string; error?: string; format?: "html" | "text" | "pdf" };
const MAX_PAGE_BYTES = GENERATION_CONFIG.research.maxPageBytes;
export const MAX_ORIGINAL_PAGES = GENERATION_CONFIG.research.originalsPerDeck;

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)));
}

export function validatePublicUrl(value: string): URL {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    /(^|\.)(localhost|local|internal)$/i.test(url.hostname)) throw Error("공개 원문 주소가 아닙니다.");
  return url;
}

async function download(url: URL, signal: AbortSignal): Promise<{ bytes: Buffer; type: string; location?: string; status: number }> {
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true });
  if (!addresses.length || addresses.some(value => !isPublicAddress(value.address))) throw Error("비공개 네트워크 주소는 열 수 없습니다.");
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = request({
      protocol: url.protocol, hostname: pinned.address, family: pinned.family, signal,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search, servername: url.hostname,
      headers: { Host: url.host, Accept: "text/html,text/plain,application/pdf", "User-Agent": "DeckPick-SourceReview/1.0" },
      timeout: GENERATION_CONFIG.research.pageTimeoutMs,
    }, response => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_PAGE_BYTES) { response.destroy(); req.destroy(Error("원문 크기 제한을 넘었습니다.")); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        try {
          let bytes = Buffer.concat(chunks);
          const encoding = response.headers["content-encoding"];
          if (encoding === "gzip") bytes = gunzipSync(bytes, { maxOutputLength: MAX_PAGE_BYTES });
          if (encoding === "br") bytes = brotliDecompressSync(bytes, { maxOutputLength: MAX_PAGE_BYTES });
          resolve({ bytes, type: response.headers["content-type"] ?? "", location: response.headers.location, status: response.statusCode ?? 0 });
        } catch { reject(Error("원문 압축을 읽지 못했습니다.")); }
      });
    });
    req.on("timeout", () => req.destroy(Error("원문 응답 시간이 초과됐습니다.")));
    req.on("error", reject);
    req.end();
  });
}

export function plainHtml(html: string): string {
  return html.replace(/<(script|style|nav|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Official financial tables are often images with author-provided alt text.
    // Preserve that source text instead of paying for another search or OCR.
    .replace(/<img\b[^>]*\balt\s*=\s*(["'])([\s\S]*?)\1[^>]*>/gi,(_tag,_quote:string,alt:string)=>" "+alt+" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const value = code.startsWith("x") ? parseInt(code.slice(1), 16) : Number(code);
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : " ";
    })
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
export function quoteExists(quote: string, text: string): boolean {
  const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").trim();
  const excerpt = quote.trim().replace(/^[“\"'「『]+|[”\"'」』]+$/g, "");
  return excerpt.length >= 8 && normalize(text).includes(normalize(excerpt));
}
/** PDF 표·줄바꿈에서 구두점·기호 간격이 달라 정확 대조가 실패하는 경우를 위한 대조: 글자·숫자만 남기고 비교한다(조각을 이어 붙이지 않는다). */
export function looseQuoteExists(quote: string, text: string): boolean {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/(\d),(?=\d{3})/g, "$1").replace(/(\d)\.(?=\d)/g, "$1d").replace(/[^\p{L}\p{N}%]+/gu, "");
  const excerpt = normalize(quote);
  return excerpt.length >= 12 && normalize(text).includes(excerpt);
}
const numberTokens = (value: string) => [...new Set((value.normalize("NFKC").match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map(n => n.replace(/,/g, "")).filter(n => n.replace(/\D/g, "").length >= 2 && !/^(19|20)\d{2}$/.test(n)))];
/** 원문 인용이 맞지 않을 때의 보조 확인: 주장 속 연도가 아닌 수치가 2개 이상이고, 모두 원문의 한 구간(약 2,500자) 안에 함께 나오면 원문으로 확인된 것으로 본다. */
export function numbersExist(claim: string, text: string, window = 2500): boolean { return !!numbersSnippet(claim, text, window); }
/** numbersExist가 성립하면 수치들이 함께 나오는 원문 구간(최대 400자)을 그대로 돌려준다. 화면·노트의 '원문'에는 이 실제 원문 구간을 쓴다. */
export function numbersSnippet(claim: string, text: string, window = 2500): string | undefined {
  const numbers = numberTokens(claim);
  if (numbers.length < 2) return undefined;
  const body = text.normalize("NFKC").replace(/(\d),(?=\d{3})/g, "$1");
  const positions = numbers.map(n => { const found: number[] = []; const re = new RegExp(`(?<![\\d.])${n.replace(/\./g, "\\.")}(?![\\d]|\\.\\d)`, "g"); let m: RegExpExecArray | null; while ((m = re.exec(body)) && found.length < 200) found.push(m.index); return found; });
  if (positions.some(p => !p.length)) return undefined;
  for (const start of positions[0]) {
    const near = positions.map(list => list.find(i => Math.abs(i - start) <= window));
    if (near.every(i => i !== undefined)) { const from = Math.min(...(near as number[])), to = Math.max(...(near as number[])); const a = Math.max(0, from - 80), b = Math.min(body.length, Math.max(to + 80, a + 160)); return body.slice(a, Math.min(b, a + 400)).replace(/\s+/g, " ").trim(); }
  }
  return undefined;
}

async function readPage(value: string, signal: AbortSignal): Promise<OriginalPage> {
  const checkedAt = new Date().toISOString();
  try {
    let url = validatePublicUrl(value);
    for (let redirect = 0; redirect <= GENERATION_CONFIG.research.redirectLimit; redirect++) {
      const result = await download(url, signal);
      if (result.status >= 300 && result.status < 400 && result.location) {
        url = validatePublicUrl(new URL(result.location, url).href); continue;
      }
      if (result.status !== 200) throw Error(`원문 HTTP ${result.status}`);
      let text: string;let format: "pdf"|"html"|"text"="html";
      if (result.type.includes("pdf") || result.bytes.subarray(0, 5).toString() === "%PDF-") {
        format="pdf";text = (await extractAttachment("public-source.pdf", result.bytes)).sections.map(section => section.text).join("\n");
      } else if (/text\/html|text\/plain|application\/xhtml/.test(result.type)) {
        format=result.type.includes("text/plain")?"text":"html";
        if(format==="html"&&/<input[^>]+type=["']password/i.test(result.bytes.toString())&&!/<article\b/i.test(result.bytes.toString()))throw Error("원문을 읽으려면 로그인이 필요합니다.");
        const charset = result.type.match(/charset=([^; ]+)/i)?.[1] ?? "utf-8";
        text = plainHtml(new TextDecoder(charset).decode(result.bytes));
      } else throw Error("지원하는 원문 형식이 아닙니다.");
      if (text.length < 80) throw Error("원문 본문을 충분히 읽지 못했습니다.");
      return { url: value, text, opened: true, checkedAt,format };
    }
    throw Error("원문 리다이렉트가 너무 많습니다.");
  } catch (error) {
    return { url: value, text: "", opened: false, checkedAt, error: error instanceof Error ? error.message : "원문 확인 실패" };
  }
}

// Bound the entire operation, including DNS, redirects and PDF extraction.
export async function readOriginalPage(value: string, timeoutMs = GENERATION_CONFIG.research.pageTimeoutMs): Promise<OriginalPage> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<OriginalPage>(resolve => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ url: value, text: "", opened: false, checkedAt: new Date().toISOString(), error: "원문 전체 확인 시간이 초과됐습니다." });
    }, timeoutMs);
  });
  try { return await Promise.race([readPage(value, controller.signal), deadline]); }
  finally { clearTimeout(timer!); }
}

export function publicationDateExists(date: string, text: string): boolean {
  const numbers = date.match(/\d+/g);
  if (!numbers || numbers.length < 3) return false;
  const [year, month, day] = numbers.map(Number);
  return year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31 && new RegExp(`${year}\\D{0,8}0?${month}\\D{0,8}0?${day}(?![0-9])`).test(text);
}
