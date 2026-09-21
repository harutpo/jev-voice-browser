/**
 * Candidate extraction (code, not Jev). Jev never generates text: we over-generate
 * candidate spans from the transcript here, and Jev only *picks* one of them.
 * The chosen option is copied verbatim into the browser.
 *
 * This module only selects the implementation for the spoken language (see lang.js):
 * spans.en.js (verb-first, space-delimited) or spans.ja.js (verb-final, no spaces).
 */

import { LANG } from "./lang.js";
import * as en from "./spans.en.js";
import * as ja from "./spans.ja.js";

const impl = LANG === "ja" ? ja : en;

export const { cleanTranscript, toHttpUrl } = en; // language-neutral

export const {
  extractTextCandidates,
  normalizeSpokenUrl,
  extractUrlCandidates,
  parseCandidatePick,
  hasEnoughNewWords,
} = impl;
