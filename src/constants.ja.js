/**
 * Japanese variant of everything Jev sees (selected with `--lang ja`, see lang.js).
 *
 * Measured on jev-1.13.0: the English rubric already classifies Japanese transcripts correctly
 * (13/13 intents in a probe), so the English `what` / `not_for` texts are KEPT and only
 *  - Japanese example utterances are added to every option,
 *  - the `complete` rubric is rewritten for a verb-FINAL language, and
 *  - sites point at their Japanese homes.
 * Option ids (navigate_url, search_web, ...) are unchanged: policy.js switches on them.
 */

const JA_INTENT_EXAMPLES = {
  navigate_url: ["ウィキペディアを開いて", "ユーチューブに行って", "ヤフーを開く", "example ドット コム に移動して"],
  search_web: ["猫を検索して", "アラン・チューリングについて調べて", "格安航空券をググって", "ウィキペディアで富士山を検索"],
  click_element: ["最初の結果をクリック", "ログインを押して", "2番目のリンクを開いて", "コメントのタブを選んで"],
  type_into_field: ["検索ボックスにこんにちはと入力して", "メールアドレスを入力", "コメント欄におはようと書いて"],
  select_option: ["言語のプルダウンから日本語を選んで", "サイズはLを選択"],
  press_enter: ["エンターを押して", "エンター", "送信して", "確定キー"],
  scroll_down: ["下にスクロール", "少し下へ", "一番下まで行って", "次のページ分下げて"],
  scroll_up: ["上にスクロール", "一番上に戻って", "少し上へ"],
  go_back: ["戻って", "前のページに戻る", "さっきのページ", "元に戻して"],
  go_forward: ["進んで", "次のページに進む"],
  reload: ["再読み込みして", "リロード", "ページを更新して"],
  open_new_tab: ["新しいタブを開いて", "新規タブ"],
  close_tab: ["このタブを閉じて", "タブを閉じる"],
  switch_tab: ["次のタブ", "タブを切り替えて", "隣のタブに移動", "前のタブ"],
  confirm: ["確定", "はい", "実行して", "それでお願い", "オーケー"],
  cancel: ["キャンセル", "やめて", "やっぱりいい", "中止"],
  none: ["えーと", "それでね", "どう思う", "今日はいい天気だね", "お昼どうしようかな"],
};

const JA_SITE_CRITERIA = {
  google: "Google (グーグル, ググる)",
  duckduckgo: "DuckDuckGo (ダックダックゴー)",
  the_web: "A general web search with no site named (ネットで検索, ウェブで調べて)",
  youtube: "YouTube (ユーチューブ, 動画)",
  wikipedia: "Wikipedia (ウィキペディア, ウィキ)",
  github: "GitHub (ギットハブ)",
  amazon: "Amazon (アマゾン)",
  yahoo_japan: "Yahoo! JAPAN (ヤフー)",
  reddit: "Reddit (レディット)",
  twitter_x: "Twitter / X (ツイッター, エックス)",
  hacker_news: "Hacker News (ハッカーニュース)",
  example_com: "example.com / example ドット コム",
  other_named_site: "Some other website named explicitly in `transcript` (a domain or brand not listed above)",
  none: "No website or search engine is mentioned in `transcript`",
};

const JA_SITE_HOME = {
  google: "https://www.google.co.jp/",
  wikipedia: "https://ja.wikipedia.org/wiki/メインページ",
  amazon: "https://www.amazon.co.jp/",
  yahoo_japan: "https://www.yahoo.co.jp/",
};

const JA_SITE_SEARCH = {
  google: "https://www.google.co.jp/search?q=%s",
  wikipedia: "https://ja.wikipedia.org/w/index.php?search=%s",
  amazon: "https://www.amazon.co.jp/s?k=%s",
  yahoo_japan: "https://search.yahoo.co.jp/search?p=%s",
};

const JA_NOTE = "`transcript` is spoken Japanese (speech recognition output, usually without spaces).";

/** Build the Japanese question set from the English base exported by constants.js. */
export function localizeJa(base) {
  const INTENT_CRITERIA = {};
  for (const [id, c] of Object.entries(base.INTENT_CRITERIA)) {
    INTENT_CRITERIA[id] = { ...c, examples: [...(JA_INTENT_EXAMPLES[id] || []), ...c.examples.slice(0, 2)] };
  }

  const Q = base.QUESTIONS;
  const withNote = (instructions) => ({ ...instructions, focus: [instructions.focus, JA_NOTE].filter(Boolean).join(" ") });

  const QUESTIONS = {
    ...Q,
    intent: { instructions: withNote(Q.intent.instructions), criteria: INTENT_CRITERIA },

    target: {
      instructions: {
        ...Q.target.instructions,
        focus:
          "Match by the element's visible text (it may be in a different language than `transcript`: 寄付 = Donate, ログイン = Log in), role and position words like 最初 / 1番目 / 2つ目 / 一番上 / 最後 (lines are in visual order, top of page first). Pick none if the command does not refer to any element on this page, or if the referenced element is not in the list.",
      },
    },

    site: { instructions: withNote(Q.site.instructions), criteria: JA_SITE_CRITERIA },

    complete: {
      instructions: {
        question: Q.complete.instructions.question,
        focus:
          "`transcript` is spoken Japanese arriving piece by piece. Japanese is verb-final: the object comes first and the command verb comes LAST. A command is complete when it ends with a command verb (〜して, 〜て, 〜する, 〜押して, 〜開いて) or with an action noun used as a command (検索, クリック, 入力, スクロール, リロード). It is NOT complete while it ends in a particle (を, に, で, と, の, へ, から) or is only an object with no action.",
      },
      criteria: {
        true: {
          what: "Complete, actionable command",
          examples: ["下にスクロール", "戻って", "ウィキペディアを開いて", "猫を検索して", "最初の結果をクリック", "こんにちはと入力"],
        },
        false: {
          what: "Cut off before the verb / action; more words are clearly coming",
          examples: ["猫を", "ウィキペディアで", "検索ボックスに", "最初の", "アラン・チューリングについて", "こんにちはと"],
        },
      },
    },

    is_command: {
      instructions: withNote(Q.is_command.instructions),
      criteria: {
        true: {
          what: Q.is_command.criteria.true.what,
          examples: ["下にスクロール", "ユーチューブを開いて", "ログインをクリック", "戻って"],
        },
        false: {
          what: Q.is_command.criteria.false.what,
          examples: ["お昼どうしようかな", "えーとそれで", "これがデモです", "今なんて言った", "なるほどね"],
        },
      },
    },

    destructive: {
      instructions: Q.destructive.instructions,
      criteria: {
        true: {
          what: Q.destructive.criteria.true.what,
          examples: ["今すぐ買うをクリック", "注文を確定して", "このリポジトリを削除", "メッセージを送信して", "コメントを投稿", "ログアウトして"],
        },
        false: {
          what: Q.destructive.criteria.false.what,
          examples: ["下にスクロール", "ウィキペディアを開いて", "最初の結果をクリック", "検索ボックスに猫と入力"],
        },
      },
    },

    scroll_amount: {
      instructions: Q.scroll_amount.instructions,
      criteria: [
        { what: "A little: a few lines (少し, ちょっと, ちょっとだけ)" },
        { what: "One screen / one page (1ページ分), or no amount specified" },
        { what: "All the way to the end: the very top or the very bottom (一番上, 一番下, 最後まで, 先頭)" },
      ],
    },

    text_span: {
      instructions: {
        question: Q.text_span.instructions.question,
        focus:
          "Choose the span that contains the payload text only, WITHOUT the command words and particles around it (〜を検索して, 〜について調べて, 〜と入力して, 検索ボックスに〜, ウィキペディアで〜). For 猫を検索して the payload is 猫. Pick none if nothing should be typed.",
      },
    },

    tab_direction: {
      instructions: Q.tab_direction.instructions,
      criteria: {
        next: "The next tab / the other tab / switch tab with no direction (次のタブ, 隣のタブ, タブを切り替えて)",
        previous: "The previous tab / the tab before (前のタブ, 一つ前のタブ)",
        first: "The first tab (最初のタブ, 1番目のタブ)",
        none: "Not about switching tabs",
      },
    },
  };

  return {
    INTENT_CRITERIA,
    SITE_CRITERIA: JA_SITE_CRITERIA,
    QUESTIONS,
    SITE_HOME: { ...base.SITE_HOME, ...JA_SITE_HOME },
    SITE_SEARCH: { ...base.SITE_SEARCH, ...JA_SITE_SEARCH },
  };
}
