/**
 * Candidate extraction for spoken JAPANESE (code, not Jev) — same contract as spans.en.js:
 * over-generate verbatim candidate spans, Jev only *picks* one.
 *
 * Japanese differs from English in the two ways that matter here:
 *  - verb-final: the payload comes BEFORE the command verb ("猫を検索して" = "search for cats"),
 *  - no spaces between words, so nothing can be split on whitespace.
 * Strategy: particle / verb-ending rules first (fast, precise), then Intl.Segmenter word
 * boundaries as a fallback for phrasings the rules do not know.
 */

import { cleanTranscript, TLDS } from "./spans.en.js";

const SITE =
  "(?:グーグル|google|ウィキペディア|ウィキ|wikipedia|ユーチューブ|youtube|ギットハブ|github|アマゾン|amazon|ヤフー|yahoo|ツイッター|twitter|エックス|レディット|reddit|ダックダックゴー|duckduckgo|ハッカーニュース|インターネット|ネット|ウェブ|web)";

// "ウィキペディアで猫を検索" -> "猫を検索"
const LEADING_SITE_RE = new RegExp(`^${SITE}(?:の中|内|上)?(?:で|から|にて)\\s*`, "i");

const LEADING_FILLER_RE = /^(?:(?:えーと|えっと|えーっと|えー|あのー|あの|じゃあ|では|それじゃあ?|それでは|すみません|ねえ|はい)[、,\s]*)+/;

const SEARCH_VERB = "(?:検索|けんさく|調べ|しらべ|探し|さがし|ググ|ぐぐ|サーチ|見つけ)";
const TYPE_VERB = "(?:入力|にゅうりょく|打っ|打ち|書い|書き|記入|タイプ|入れ)";
// A destination must end in a field word, otherwise "こんにちは" would split at its "に".
const DEST = "(?:[^\\s、,]{0,12}?(?:ボックス|入力欄|欄|フォーム|フィールド|バー|窓|枠|エリア|ところ)|ここ|そこ)";

const SEARCH_RULES = [
  // 猫を検索して / アラン・チューリングについて調べて / 猫の写真 検索
  new RegExp(`^(.+?)\\s*(?:を|について|に関して|のことを?|って|で|の)?\\s*${SEARCH_VERB}`),
  // 検索 猫 (noun-first, recognizer inserted a space)
  new RegExp(`^${SEARCH_VERB}(?:して|する)?\\s+(.+)$`),
];
const TYPE_RULES = [
  // こんにちはと検索ボックスに入力して
  new RegExp(`^(.+?)\\s*(?:と|って|を)\\s*${DEST}(?:の中)?(?:に|へ)\\s*${TYPE_VERB}`),
  // 検索ボックスにこんにちはと入力して / こんにちはと入力
  new RegExp(`^(?:${DEST}(?:の中)?(?:に|へ)\\s*)?(.+?)\\s*(?:と|って|を)\\s*${TYPE_VERB}`),
];
const SEARCH_VERB_G = new RegExp(SEARCH_VERB, "g");
const TYPE_VERB_G = new RegExp(TYPE_VERB, "g");

function lastIndexOfVerb(re, s) {
  let last = -1;
  for (const m of s.matchAll(re)) last = m.index;
  return last;
}

/** Japanese is verb-final: the verb that comes LAST is the main one ("…と検索ボックスに入力して" types). */
function rulesFor(s) {
  return lastIndexOfVerb(TYPE_VERB_G, s) > lastIndexOfVerb(SEARCH_VERB_G, s)
    ? [...TYPE_RULES, ...SEARCH_RULES]
    : [...SEARCH_RULES, ...TYPE_RULES];
}

// Segments after which a payload plausibly ends (fallback strategy).
const BOUNDARY_PARTICLES = new Set(["を", "と", "って", "で", "について", "に", "の"]);

const segmenter = new Intl.Segmenter("ja", { granularity: "word" });

/** NFKC folds full-width digits/latin/space and half-width kana: "１番目" -> "1番目". */
function normalize(text) {
  return cleanTranscript(String(text || "").normalize("NFKC"));
}

function tidy(s) {
  return String(s || "")
    .replace(/^[\s、,。.「」『』"']+/, "")
    .replace(/[\s、,。.!?「」『』"']+$/, "")
    .trim();
}

function pushUnique(list, value) {
  const v = tidy(value);
  if (!v || v.length > 120) return;
  if (list.includes(v)) return;
  list.push(v);
}

/**
 * Candidate text payloads for type/search intents.
 * Returns [] when the transcript is empty. Order: most likely first.
 */
export function extractTextCandidates(transcript) {
  const full = normalize(transcript);
  if (!full) return [];
  const out = [];

  // 1. quoted spans
  for (const m of full.matchAll(/[「『"“]([^」』"”]{1,120})[」』"”]/g)) pushUnique(out, m[1]);

  const t = full.replace(LEADING_FILLER_RE, "");
  const noSite = t.replace(LEADING_SITE_RE, "");

  // 2. particle / verb-ending rules (payload precedes the verb)
  for (const base of noSite === t ? [t] : [noSite, t]) {
    for (const re of rulesFor(base)) {
      const m = re.exec(base);
      if (m && m[1]) pushUnique(out, m[1]);
    }
  }

  // 3. fallback: prefixes that end right before a particle, at Intl.Segmenter word boundaries
  let added = 0;
  for (const seg of segmenter.segment(noSite)) {
    if (added >= 3) break;
    if (seg.index > 0 && BOUNDARY_PARTICLES.has(seg.segment)) {
      const before = out.length;
      pushUnique(out, noSite.slice(0, seg.index));
      if (out.length > before) added++;
    }
  }

  // 4. whole transcript as a last resort
  pushUnique(out, full);

  return out.slice(0, 8);
}

/** "example ドット コム" -> "example.com"; "エグザンプル.シーオー.ジェーピー" keeps its katakana label. */
export function normalizeSpokenUrl(text) {
  return normalize(text)
    .toLowerCase()
    .replace(/\s*(?:ドット|どっと)\s*/g, ".")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*スラッシュ\s*/g, "/")
    .replace(/\.コム/g, ".com")
    .replace(/\.ネット/g, ".net")
    .replace(/\.(?:オルグ|オーグ)/g, ".org")
    .replace(/\.(?:ジェーピー|ジェイピー)/g, ".jp")
    .replace(/\.シーオー/g, ".co")
    .replace(/\.アイオー/g, ".io");
}

/** Domain-looking spans in the transcript (after spoken-url normalisation). */
export function extractUrlCandidates(transcript) {
  const t = normalizeSpokenUrl(transcript);
  if (!t) return [];
  const re = new RegExp(`(?:https?://)?(?:[a-z0-9-]+\\.)+(?:jp|${TLDS})(?![a-z0-9])(?:/[^\\s]*)?`, "gi");
  const out = [];
  for (const m of t.matchAll(re)) {
    const v = m[0].replace(/[.,!?]+$/, "");
    if (!out.includes(v)) out.push(v);
  }
  return out.slice(0, 6);
}

const NUMBER_WORDS = {
  1: ["1", "一", "いち", "ひと", "最初", "さいしょ", "先頭", "上"],
  2: ["2", "二", "に", "ふた"],
  3: ["3", "三", "さん", "みっ"],
  4: ["4", "四", "よん", "よっ", "し"],
  5: ["5", "五", "ご", "いつ"],
};
const NUMBER_LOOKUP = new Map(Object.entries(NUMBER_WORDS).flatMap(([n, words]) => words.map((w) => [w, Number(n)])));

// Words around the number that carry no information: "2番目のリンクをクリックして" -> "2番目"
const PICK_NOISE_RE =
  /をお願いします|でお願いします|お願いします|お願い|ください|下さい|をクリックして|をクリック|クリックして|クリック|を選んで|選んで|を選択して|選択して|選択|を開いて|開いて|にして|のリンク|リンク|の結果|結果|のやつ|やつ|のほう|の方|それ|その|これ|この|番号/g;
const COUNTER_RE = /(?:番目|ばんめ|つ目|つめ|個目|こめ|番|ばん|つ|個)$/;

/**
 * When numbered candidate overlays are on screen, a bare number ("2", "2番目", "二つ目のやつ",
 * "最初") is a deterministic pick — no need to ask Jev.
 * Returns 1-based index or null.
 */
export function parseCandidatePick(transcript, max = 5) {
  let t = normalize(transcript).toLowerCase().replace(/[\s、,。.!?]/g, "");
  if (!t) return null;
  if (/^(?:一番|いちばん)(?!目|め)/.test(t)) return null; // "一番下まで…" is a superlative, not "number one"
  t = t.replace(PICK_NOISE_RE, "").replace(/[でをのは]$/, "").replace(COUNTER_RE, "");
  if (!t || t.length > 4) return null;
  const n = NUMBER_LOOKUP.get(t);
  return n && n <= max ? n : null;
}

/**
 * After one command of an utterance has been executed, do the words that follow look like a new
 * command? A single short word ("お願い") is filler. There are no spaces to count, so use
 * Intl.Segmenter word boundaries.
 */
export function hasEnoughNewWords(text) {
  const t = normalize(text);
  if (!t) return false;
  let words = 0;
  for (const seg of segmenter.segment(t)) if (seg.isWordLike) words++;
  return words >= 2;
}
