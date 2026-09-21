/**
 * Japanese counterpart of jev-decisions.test.js — REAL Jev API, Japanese transcripts.
 * Runs only with the Japanese question set:  VB_LANG=ja npm run test:integration
 *
 * Fixture `wikipedia-ja-main` was captured with:
 *   node scripts/capture-fixture.js https://ja.wikipedia.org/ wikipedia-ja-main
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decide, hasApiKey } from "../../src/jev.js";
import { evaluatePolicy } from "../../src/policy.js";
import { MODEL } from "../../src/constants.js";
import { LANG } from "../../src/lang.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "fixtures", `${name}.json`), "utf8"));
const skip = !hasApiKey() || LANG !== "ja";

const JA = "wikipedia-ja-main"; // e02 searchbox "Wikipedia内を検索", e04 "寄付", e05 "アカウント作成", e06 "ログイン"
const EN = "wikipedia-main"; // English page, Japanese speech (cross-lingual element matching)

const CASES = [
  // navigation
  { name: "open site", transcript: "ユーチューブを開いて", snapshot: JA, intent: "navigate_url", decision: "act", url: "youtube.com" },
  { name: "open site (ja home)", transcript: "ウィキペディアに行って", snapshot: "example", intent: "navigate_url", decision: "act", url: "ja.wikipedia.org" },
  { name: "open yahoo japan", transcript: "ヤフーを開いて", snapshot: JA, intent: "navigate_url", decision: "act", url: "yahoo.co.jp" },
  { name: "spoken domain", transcript: "example ドット コム を開いて", snapshot: JA, intent: "navigate_url", decision: "act", url: "example.com" },
  // search: payload precedes the verb
  { name: "search on page", transcript: "猫を検索して", snapshot: JA, intent: "search_web", decision: "act", text: "猫" },
  { name: "search about", transcript: "アラン・チューリングについて調べて", snapshot: JA, intent: "search_web", decision: "act", text: "アラン・チューリング" },
  { name: "search named site", transcript: "ユーチューブでローファイを検索して", snapshot: JA, intent: "search_web", decision: "act", text: "ローファイ", url: "youtube.com/results" },
  { name: "search the web", transcript: "格安航空券をググって", snapshot: "example", intent: "search_web", decision: "act", text: "格安航空券" },
  // typing
  { name: "type into box", transcript: "検索ボックスにこんにちはと入力して", snapshot: JA, intent: "type_into_field", target: "e02", decision: "act", text: "こんにちは" },
  // clicking
  { name: "click by label", transcript: "ログインをクリックして", snapshot: JA, intent: "click_element", target: "e06", decision: "act" },
  { name: "click by label 2", transcript: "寄付のリンクを押して", snapshot: JA, intent: "click_element", target: "e04", decision: "act" },
  { name: "click cross-lingual", transcript: "寄付をクリック", snapshot: EN, intent: "click_element", decision: "act" },
  // scrolling / history / tabs
  { name: "scroll down", transcript: "下にスクロールして", snapshot: JA, intent: "scroll_down", decision: "act", amount: "page" },
  { name: "scroll a little", transcript: "少しだけ下にスクロール", snapshot: JA, intent: "scroll_down", decision: "act", amount: "little" },
  { name: "scroll to bottom", transcript: "一番下までスクロールして", snapshot: JA, intent: "scroll_down", decision: "act", amount: "end" },
  { name: "scroll up", transcript: "上に戻って", snapshot: JA, intent: "scroll_up", decision: "act" },
  { name: "go back", transcript: "前のページに戻って", snapshot: JA, intent: "go_back", decision: "act" },
  { name: "reload", transcript: "ページを再読み込みして", snapshot: JA, intent: "reload", decision: "act" },
  { name: "new tab", transcript: "新しいタブを開いて", snapshot: JA, intent: "open_new_tab", decision: "act" },
  // gating
  { name: "chit-chat ignored", transcript: "今日のお昼どうしようかな", snapshot: JA, decision: "ignore" },
  { name: "narration ignored", transcript: "これがウィキペディアのページなんですけど", snapshot: JA, decisionIn: ["ignore", "wait"] },
  { name: "partial waits (object only)", transcript: "猫を", snapshot: JA, final: false, decisionIn: ["wait", "ignore"] },
  { name: "partial waits (site only)", transcript: "ウィキペディアで", snapshot: JA, final: false, decisionIn: ["wait", "ignore"] },
  { name: "destructive confirms", transcript: "アカウント作成をクリック", snapshot: JA, intent: "click_element", decisionIn: ["act", "confirm"] },
];

const results = [];

before(() => {
  if (!hasApiKey()) console.log("SKIP: no TYPESAFE_API_KEY / JEV_API_KEY set");
  else if (LANG !== "ja") console.log("SKIP: Japanese cases need VB_LANG=ja");
});

for (const c of CASES) {
  test(`jev(ja): ${c.name} — "${c.transcript}"`, { skip }, async () => {
    const snapshot = fixture(c.snapshot);
    const r = await decide({ transcript: c.transcript, snapshot });
    const policy = evaluatePolicy({ answers: r.answers, candidates: r.candidates, snapshot, isFinal: c.final !== false });
    const a = r.answers;
    const failures = [];
    if (c.intent && a.intent.choice !== c.intent) failures.push(`intent ${a.intent.choice} != ${c.intent} (conf ${a.intent.confidence.toFixed(2)})`);
    if (c.target && a.target.choice !== c.target) failures.push(`target ${a.target.choice} != ${c.target} (conf ${a.target.confidence.toFixed(2)})`);
    if (c.decision && policy.decision !== c.decision) failures.push(`decision ${policy.decision} != ${c.decision} (${policy.summary})`);
    if (c.decisionIn && !c.decisionIn.includes(policy.decision)) failures.push(`decision ${policy.decision} not in ${c.decisionIn} (${policy.summary})`);
    if (c.text && policy.action?.text !== c.text && policy.action?.query !== c.text) failures.push(`text ${JSON.stringify(policy.action?.text ?? policy.action?.query)} != ${JSON.stringify(c.text)}`);
    if (c.url && !decodeURI(policy.action?.url || "").includes(c.url)) failures.push(`url ${policy.action?.url} !~ ${c.url}`);
    if (c.amount && policy.action?.amount !== c.amount) failures.push(`amount ${policy.action?.amount} != ${c.amount}`);

    results.push({ name: c.name, ok: failures.length === 0, latency: r.latencyMs, tokens: r.usage.input_tokens, failures });
    console.log(
      `  ${failures.length ? "✗" : "✓"} ${c.name.padEnd(28)} ${String(r.latencyMs).padStart(4)}ms ${String(r.usage.input_tokens).padStart(5)}tok  intent=${a.intent.choice}(${a.intent.confidence.toFixed(2)}) target=${a.target.choice}(${a.target.confidence.toFixed(2)}) complete=${a.complete.noul.toFixed(2)} cmd=${a.is_command.noul.toFixed(2)} span=${a.text_span?.choice ?? "-"} → ${policy.decision}${failures.length ? "\n      " + failures.join("; ") : ""}`,
    );
    assert.deepEqual(failures, [], failures.join("; "));
  });
}

test("integration pass-rate report (ja)", { skip }, () => {
  const passed = results.filter((r) => r.ok).length;
  const lat = results.map((r) => r.latency).sort((a, b) => a - b);
  const p50 = lat[Math.floor(lat.length / 2)];
  const avg = Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
  const tokens = results.reduce((a, r) => a + r.tokens, 0);
  const rate = passed / results.length;
  console.log(`\n  ${MODEL} (ja): ${passed}/${results.length} cases passed (${(rate * 100).toFixed(1)}%) · latency avg ${avg} ms, p50 ${p50} ms, max ${lat[lat.length - 1]} ms · ${tokens} input tokens ($${((tokens / 1e6) * 0.042).toFixed(5)})\n`);
  assert.ok(rate >= 0.8, `pass rate ${(rate * 100).toFixed(1)}% is below 80%`);
});
