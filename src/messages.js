/**
 * Strings shown to the USER (toasts on the controlled page, the pending-confirmation banner).
 * Control-room diagnostics (policy gate reasons, logs) stay English in every language.
 */

import { LANG } from "./lang.js";

const MESSAGES = {
  en: {
    "toast.enter": "⏎ enter",
    "toast.back": "← back",
    "toast.forward": "→ forward",
    "toast.reload": "↻ reload",
    "toast.newTab": "new tab",
    "toast.switchedTab": "switched tab",
    "toast.cancelled": "cancelled",
    "toast.whichOne": "Which one? Say the number.",
    "toast.sayConfirm": 'Say "confirm" to {action}',
    "summary.sayConfirm": 'say "confirm" to {action}',
    "describe.open": "open {what}",
    "describe.type": 'type "{text}" into {where}',
    "describe.typeEnter": " + enter",
    "describe.click": "click {what}",
    "describe.select": 'select "{text}" in {where}',
  },
  ja: {
    "toast.enter": "⏎ エンター",
    "toast.back": "← 戻る",
    "toast.forward": "→ 進む",
    "toast.reload": "↻ 再読み込み",
    "toast.newTab": "新しいタブ",
    "toast.switchedTab": "タブを切り替えました",
    "toast.cancelled": "キャンセルしました",
    "toast.whichOne": "どれですか？ 番号で言ってください。",
    "toast.sayConfirm": "「確定」と言うと実行します: {action}",
    "summary.sayConfirm": "「確定」で実行 / 「キャンセル」で中止: {action}",
    "describe.open": "{what} を開く",
    "describe.type": "{where} に「{text}」と入力",
    "describe.typeEnter": " + エンター",
    "describe.click": "{what} をクリック",
    "describe.select": "{where} で「{text}」を選択",
  },
};

/** Look up a user-facing string and fill `{name}` placeholders. */
export function t(key, params = {}) {
  const s = MESSAGES[LANG][key] ?? MESSAGES.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}
