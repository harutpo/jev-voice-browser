import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractTextCandidates,
  extractUrlCandidates,
  normalizeSpokenUrl,
  parseCandidatePick,
  hasEnoughNewWords,
} from "../../src/spans.ja.js";

test("ja: search payload precedes the verb", () => {
  assert.equal(extractTextCandidates("猫を検索して")[0], "猫");
  assert.equal(extractTextCandidates("アラン・チューリングについて調べて")[0], "アラン・チューリング");
  assert.equal(extractTextCandidates("格安航空券をググって")[0], "格安航空券");
  assert.equal(extractTextCandidates("猫の写真を検索")[0], "猫の写真");
  assert.equal(extractTextCandidates("猫 検索")[0], "猫");
  assert.equal(extractTextCandidates("検索 猫")[0], "猫");
});

test("ja: leading site phrase and fillers are stripped", () => {
  assert.equal(extractTextCandidates("ウィキペディアで富士山を検索して")[0], "富士山");
  assert.equal(extractTextCandidates("ユーチューブでローファイ ビートを検索")[0], "ローファイ ビート");
  assert.equal(extractTextCandidates("えーと、猫を検索してください")[0], "猫");
});

test("ja: typed text, destination before or after", () => {
  assert.equal(extractTextCandidates("検索ボックスにこんにちはと入力して")[0], "こんにちは");
  assert.equal(extractTextCandidates("こんにちはと検索ボックスに入力して")[0], "こんにちは");
  assert.equal(extractTextCandidates("こんにちはと入力")[0], "こんにちは"); // must not split at the に inside こんにちは
  assert.equal(extractTextCandidates("コメント欄におはようございますと書いて")[0], "おはようございます");
});

test("ja: quoted spans win, whole transcript is always the last resort", () => {
  assert.equal(extractTextCandidates("「吾輩は猫である」を検索")[0], "吾輩は猫である");
  const c = extractTextCandidates("下にスクロールして");
  assert.equal(c.at(-1), "下にスクロールして");
  assert.deepEqual(extractTextCandidates(""), []);
});

test("ja: unknown phrasing still yields the payload via word boundaries", () => {
  assert.ok(extractTextCandidates("富士山の情報がほしい").includes("富士山"));
});

test("ja: candidates are unique and capped", () => {
  const c = extractTextCandidates("猫を検索ボックスに入力して検索して");
  assert.equal(new Set(c).size, c.length);
  assert.ok(c.length <= 8);
});

test("ja: spoken URLs", () => {
  assert.equal(normalizeSpokenUrl("example ドット コム"), "example.com");
  assert.deepEqual(extractUrlCandidates("example ドット コム を開いて"), ["example.com"]);
  assert.deepEqual(extractUrlCandidates("example.co.jpを開いて"), ["example.co.jp"]);
  assert.deepEqual(extractUrlCandidates("ウィキペディアを開いて"), []);
});

test("ja: candidate pick parsing", () => {
  assert.equal(parseCandidatePick("2"), 2);
  assert.equal(parseCandidatePick("２番目"), 2);
  assert.equal(parseCandidatePick("二つ目"), 2);
  assert.equal(parseCandidatePick("に"), 2);
  assert.equal(parseCandidatePick("3番でお願いします"), 3);
  assert.equal(parseCandidatePick("最初のやつ"), 1);
  assert.equal(parseCandidatePick("1番目のリンクをクリックして"), 1);
  assert.equal(parseCandidatePick("ひとつめ"), 1);
  assert.equal(parseCandidatePick("4番", 3), null); // out of range
  assert.equal(parseCandidatePick("一番下までスクロール"), null);
  assert.equal(parseCandidatePick("一番"), null);
  assert.equal(parseCandidatePick("下にスクロールして"), null);
});

test("ja: new-command detection without spaces", () => {
  assert.equal(hasEnoughNewWords("お願い"), false);
  assert.equal(hasEnoughNewWords(""), false);
  assert.equal(hasEnoughNewWords("下にスクロールして"), true);
});
