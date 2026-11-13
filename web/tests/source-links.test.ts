import test from "node:test";
import assert from "node:assert/strict";
import {originalDocumentLinks} from "../src/lib/source-pages";
test("original report URLs are observed anchors, not fabricated from a landing page",()=>{
 const links=originalDocumentLinks(`<nav><a href="/old.pdf">Old annual report</a></nav><a href="/reports/latest.html">Annual Report 10-K HTML Format Download</a><a href="//cdn.example.org/full.pdf?x=1&amp;y=2">PDF Format Download</a><a href="/about">About</a><a href="javascript:alert(1)">Annual report</a><a href="http://localhost/report.pdf">Annual report</a><a href="#report">Annual report</a>`,"https://example.org/filings/details");
 assert.deepEqual(links.map(l=>l.url),["https://example.org/reports/latest.html","https://cdn.example.org/full.pdf?x=1&y=2"]);
});
test("document links are unique, bounded and require a useful observed title",()=>{
 const html=Array.from({length:10},(_,i)=>`<a href="/${i}.pdf">사업보고서 ${i}</a>`).join("")+`<a href="/0.pdf">duplicate annual report</a><a href="/empty.pdf"></a>`;
 assert.equal(originalDocumentLinks(html,"https://example.org").length,6);
 assert.equal(originalDocumentLinks(html,"https://example.org",2).length,2);
});
