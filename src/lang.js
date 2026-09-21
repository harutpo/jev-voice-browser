/**
 * Spoken language of the user: "en" (default) or "ja".
 *
 * Resolved ONCE at module load — `--lang ja` on the command line, else the VB_LANG environment
 * variable — so that constants.js / spans.js / messages.js can keep their static named exports
 * and every importer stays unchanged.
 */

export const SUPPORTED_LANGS = ["en", "ja"];

function resolveLang() {
  const argv = process.argv;
  const i = argv.indexOf("--lang");
  const fromArg = i >= 0 ? argv[i + 1] : (argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
  const raw = String(fromArg || process.env.VB_LANG || "en").toLowerCase();
  const lang = raw.split(/[-_]/)[0]; // "ja-JP" -> "ja"
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(`Unsupported language "${raw}". Use one of: ${SUPPORTED_LANGS.join(", ")}`);
  }
  return lang;
}

export const LANG = resolveLang();

/** BCP-47 tag for the Web Speech API recognizer on the control page. */
export const SPEECH_LANG = { en: "en-US", ja: "ja-JP" }[LANG];
