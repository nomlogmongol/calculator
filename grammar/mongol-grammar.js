/*! mongol-grammar 1.0.0 | Generated from grammar/src by scripts/build.js. Do not edit. */
(function (root) {
'use strict';
const __defs = {};
const __cache = {};
function __define(id, fn) { __defs[id] = fn; }
function __require(id) {
  if (!__cache[id]) { __cache[id] = {}; __defs[id](__require, __cache[id]); }
  return __cache[id];
}

__define("index.js", function (__require, __exports) {
  // Mongolian (Cyrillic) grammar and spelling checker.
  //
  //   import { check, fixAll } from './grammar/src/index.js';
  //   check('Тэр номээс уншсан.');
  //   // → [{ rule: 'suffix-harmony', start: 7, end: 10, text: 'ээс',
  //   //      suggestions: ['оос'], message: { mn: '…', en: '…' }, … }]

  const { runRules, applyFix, applyFixes, CATEGORIES, SEVERITIES } = __require("engine.js");
  const characters = __require("rules/characters.js").default;
  const harmony = __require("rules/harmony.js").default;
  const particles = __require("rules/particles.js").default;
  const hyphenation = __require("rules/hyphenation.js").default;
  const spelling = __require("rules/spelling.js").default;
  const punctuation = __require("rules/punctuation.js").default;
  const style = __require("rules/style.js").default;
  const VERSION = '1.0.0';

  // Order matters only for de-duplication: earlier rules win on identical spans.
  const RULES = [...characters, ...spelling, ...harmony, ...particles, ...hyphenation, ...punctuation, ...style];

  // Checks `text` and returns issues sorted by position:
  //   { rule, category, severity, start, end, text, message: { mn, en }, suggestions }
  // options.disabled:    rule ids or category names to skip
  // options.minSeverity: 'error' | 'warning' | 'suggestion' (default: all)
  function check(text, options = {}) {
    return runRules(RULES, String(text ?? ''), options);
  }

  // Applies the first suggestion of every issue, re-checking until nothing
  // more can be fixed. Returns { text, applied }.
  function fixAll(text, options = {}) {
    let current = String(text ?? '');
    let applied = 0;
    for (let round = 0; round < 5; round++) {
      const issues = check(current, options).filter((i) => i.suggestions.length);
      if (!issues.length) break;
      const r = applyFixes(current, issues);
      if (!r.applied || r.text === current) break;
      current = r.text;
      applied += r.applied;
    }
    return { text: current, applied };
  }

  // Rule metadata for documentation and settings screens.
  function listRules() {
    return RULES.map(({ id, category, severity, title, description, examples }) => ({
      id, category, severity, title, description, examples,
    }));
  }
    __exports.VERSION = VERSION;
    __exports.RULES = RULES;
    __exports.check = check;
    __exports.fixAll = fixAll;
    __exports.listRules = listRules;
    __exports.applyFix = applyFix;
    __exports.applyFixes = applyFixes;
    __exports.CATEGORIES = CATEGORIES;
    __exports.SEVERITIES = SEVERITIES;
});

__define("engine.js", function (__require, __exports) {
  // Rule runner: turns text into a sorted list of issues and applies fixes.

  const { createDocument } = __require("text.js");
  const SEVERITIES = ['error', 'warning', 'suggestion'];

  const CATEGORIES = {
    characters: { mn: 'Үсэг, тэмдэгт', en: 'Letters & characters' },
    harmony: { mn: 'Эгшиг зохицох ёс', en: 'Vowel harmony' },
    spelling: { mn: 'Зөв бичих дүрэм', en: 'Spelling rules' },
    punctuation: { mn: 'Цэг тэмдэг', en: 'Punctuation' },
    style: { mn: 'Найруулга', en: 'Style' },
  };

  const SEVERITY_RANK = { error: 0, warning: 1, suggestion: 2 };

  // rules: array of rule objects { id, category, severity, title, check(doc, report) }.
  // options.disabled: array of rule ids or categories to skip.
  // options.minSeverity: drop issues below this severity ('suggestion' keeps all).
  function runRules(rules, text, options = {}) {
    const disabled = new Set(options.disabled || []);
    const minRank = SEVERITY_RANK[options.minSeverity || 'suggestion'];
    const doc = createDocument(text);
    const issues = [];
    for (const rule of rules) {
      if (disabled.has(rule.id) || disabled.has(rule.category)) continue;
      const report = (r) => {
        const severity = r.severity || rule.severity;
        if (SEVERITY_RANK[severity] > minRank) return;
        issues.push({
          rule: rule.id,
          category: rule.category,
          severity,
          start: r.start,
          end: r.end,
          text: text.slice(r.start, r.end),
          message: r.message,
          suggestions: (r.suggestions || []).filter((s, i, all) => s !== text.slice(r.start, r.end) && all.indexOf(s) === i),
        });
      };
      rule.check(doc, report);
    }
    return dedupe(issues).sort(
      (a, b) => a.start - b.start || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.end - b.end,
    );
  }

  // Two rules may describe the same problem on the same span; keep the first.
  function dedupe(issues) {
    const seen = new Set();
    const out = [];
    for (const issue of issues) {
      const key = `${issue.start}:${issue.end}:${issue.suggestions[0] ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(issue);
    }
    return out;
  }

  // Replaces the issue span with one of its suggestions.
  function applyFix(text, issue, suggestionIndex = 0) {
    const replacement = issue.suggestions[suggestionIndex];
    if (replacement === undefined) return text;
    return text.slice(0, issue.start) + replacement + text.slice(issue.end);
  }

  // Applies the first suggestion of every fixable, non-overlapping issue.
  // Returns { text, applied } where applied counts the fixes made.
  function applyFixes(text, issues) {
    const fixable = issues.filter((i) => i.suggestions.length).sort((a, b) => a.start - b.start || a.end - b.end);
    const chosen = [];
    let lastEnd = -1;
    for (const issue of fixable) {
      if (issue.start < lastEnd) continue;
      chosen.push(issue);
      lastEnd = issue.end;
    }
    let out = text;
    for (let i = chosen.length - 1; i >= 0; i--) out = applyFix(out, chosen[i]);
    return { text: out, applied: chosen.length };
  }
    __exports.SEVERITIES = SEVERITIES;
    __exports.CATEGORIES = CATEGORIES;
    __exports.runRules = runRules;
    __exports.applyFix = applyFix;
    __exports.applyFixes = applyFixes;
});

__define("text.js", function (__require, __exports) {
  // Tokenizer and per-word analysis shared by all rules.

  const { isMnLetter, isCyrillic, isLatin, isGreek, isUpper, LEGACY_LETTERS, LATIN_TO_CYRILLIC, GREEK_TO_CYRILLIC, INVISIBLE_CHARS, roughHarmony } = __require("alphabet.js");
  const TOKEN_RE = /(\p{L}[\p{L}\p{M}­​-‍⁠﻿]*)|(\d+(?:[.,]\d+)*)|(\s+)|([\s\S])/gu;
  const SENTENCE_END = new Set(['.', '!', '?', '…']);
  const TRANSPARENT = new Set(['«', '»', '“', '”', '„', '"', "'", '(', ')', '[', ']', '‘', '’', '‹', '›', '-', '–', '—']);

  // Classifies one character of a word.
  //   mn: Mongolian Cyrillic letter, legacy: substitute for a Mongolian letter,
  //   cyr: other Cyrillic, lat: Latin, grk: Greek, inv: invisible, other.
  function charKind(ch) {
    if (isMnLetter(ch)) return 'mn';
    if (LEGACY_LETTERS[ch]) return 'legacy';
    if (INVISIBLE_CHARS[ch]) return 'inv';
    if (isCyrillic(ch)) return 'cyr';
    if (isLatin(ch)) return 'lat';
    if (isGreek(ch)) return 'grk';
    return 'other';
  }

  // Rewrites look-alike and legacy letters of a Cyrillic word into proper
  // Mongolian letters, keeping a 1:1 character mapping so offsets stay valid.
  // Ambiguous у/ү substitutes are resolved with the harmony of the word.
  function normalizeCyrillicWord(word) {
    const out = [];
    const pending = [];
    for (const ch of word) {
      let rep = LEGACY_LETTERS[ch] || LATIN_TO_CYRILLIC[ch] || GREEK_TO_CYRILLIC[ch];
      if (!rep) {
        out.push(ch);
        continue;
      }
      if (rep[0] === '?') {
        pending.push(out.length);
        rep = rep.slice(1);
      }
      out.push(rep);
    }
    if (pending.length) {
      const h = roughHarmony(out.filter((_, i) => !pending.includes(i)).join('').toLowerCase());
      for (const i of pending) {
        const upper = isUpper(out[i]);
        const ch = h === 'front' || (h === null && upper) ? 'ү' : 'у';
        out[i] = upper ? ch.toUpperCase() : ch;
      }
    }
    return out.join('');
  }

  function tokenize(text) {
    const tokens = [];
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(text))) {
      const type = m[1] ? 'word' : m[2] ? 'num' : m[3] ? 'space' : 'punct';
      tokens.push({ type, text: m[0], start: m.index, end: m.index + m[0].length, index: tokens.length });
    }
    return tokens;
  }

  function analyzeWord(tok) {
    const kinds = { mn: 0, legacy: 0, cyr: 0, lat: 0, grk: 0, inv: 0, other: 0 };
    for (const ch of tok.text) kinds[charKind(ch)]++;
    tok.kinds = kinds;
    // A word is treated as Mongolian when Mongolian letters dominate.
    tok.isMongolian = kinds.mn > 0 && kinds.mn + kinds.legacy + kinds.cyr >= kinds.lat + kinds.grk;
    tok.norm = tok.isMongolian ? normalizeCyrillicWord(tok.text) : tok.text;
    tok.lower = tok.norm.toLowerCase();
    // Only Mongolian letters: safe for morphology rules.
    tok.clean = kinds.mn === tok.text.length;
    const first = tok.text[0];
    tok.isCap = isUpper(first);
    tok.isAllCaps = tok.text.length > 1 && tok.text === tok.text.toUpperCase() && tok.text !== tok.text.toLowerCase();
  }

  // Builds the analysis context handed to every rule.
  function createDocument(text) {
    const tokens = tokenize(text);
    const words = [];
    let sentenceStart = true;
    for (const tok of tokens) {
      if (tok.type === 'word') {
        analyzeWord(tok);
        tok.sentenceStart = sentenceStart;
        tok.wordIndex = words.length;
        words.push(tok);
        sentenceStart = false;
      } else if (tok.type === 'num') {
        sentenceStart = false;
      } else if (tok.type === 'space') {
        if (tok.text.includes('\n')) sentenceStart = true;
      } else if (SENTENCE_END.has(tok.text)) {
        // Initials and abbreviations do not end a sentence: Б.Энхтуул, Тө.Энх, т.м.
        const prev = tokens[tok.index - 1];
        const next = tokens[tok.index + 1];
        const initial = tok.text === '.' && prev && prev.type === 'word' && prev.text.length <= 2;
        const glued = tok.text === '.' && next && next.type === 'word';
        sentenceStart = !initial && !glued;
      } else if (!TRANSPARENT.has(tok.text)) {
        sentenceStart = false;
      }
    }
    return { text, tokens, words };
  }

  // Token helpers -----------------------------------------------------------

  function prevToken(doc, tok, skipSpace = false) {
    for (let i = tok.index - 1; i >= 0; i--) {
      const t = doc.tokens[i];
      if (!skipSpace || t.type !== 'space') return t;
    }
    return null;
  }

  function nextToken(doc, tok, skipSpace = false) {
    for (let i = tok.index + 1; i < doc.tokens.length; i++) {
      const t = doc.tokens[i];
      if (!skipSpace || t.type !== 'space') return t;
    }
    return null;
  }

  // The previous/next word when only plain spaces (no line break, no
  // punctuation) separate it from `tok`.
  function prevWordInline(doc, tok) {
    const sp = doc.tokens[tok.index - 1];
    const w = doc.tokens[tok.index - 2];
    if (!sp || !w || sp.type !== 'space' || sp.text.includes('\n') || w.type !== 'word') return null;
    return w;
  }

  function nextWordInline(doc, tok) {
    const sp = doc.tokens[tok.index + 1];
    const w = doc.tokens[tok.index + 2];
    if (!sp || !w || sp.type !== 'space' || sp.text.includes('\n') || w.type !== 'word') return null;
    return w;
  }

  // Copies the letter case of `model` onto `word` (capitalized or all caps).
  function matchCase(model, word) {
    if (!model || !word) return word;
    if (model.length > 1 && model === model.toUpperCase() && model !== model.toLowerCase()) return word.toUpperCase();
    if (isUpper(model[0])) return word.charAt(0).toUpperCase() + word.slice(1);
    return word;
  }
    __exports.charKind = charKind;
    __exports.normalizeCyrillicWord = normalizeCyrillicWord;
    __exports.tokenize = tokenize;
    __exports.createDocument = createDocument;
    __exports.prevToken = prevToken;
    __exports.nextToken = nextToken;
    __exports.prevWordInline = prevWordInline;
    __exports.nextWordInline = nextWordInline;
    __exports.matchCase = matchCase;
});

__define("alphabet.js", function (__require, __exports) {
  // Mongolian Cyrillic alphabet, vowel classes and look-alike character maps.

  const MN_LOWER = 'абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя';
  const MN_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЩЪЫЬЭЮЯ';
  const MN_SET = new Set(MN_LOWER + MN_UPPER);

  const CONSONANTS = new Set('бвгджзйклмнпрстфхцчшщ');

  // Harmony value of each vowel letter:
  //   a = back unrounded, o = back rounded, u = back high (resets rounding),
  //   e = front unrounded, ö = front rounded, ü = front high (resets rounding),
  //   E = е (front, rounding unknown), U = ю (back or front, mostly back).
  // и and ы are neutral: they never decide harmony.
  const HARMONY = {
    а: 'a', я: 'a', о: 'o', ё: 'o', у: 'u',
    э: 'e', ө: 'ö', ү: 'ü', е: 'E', ю: 'U',
  };

  function isMnLetter(ch) {
    return MN_SET.has(ch);
  }

  function isCyrillic(ch) {
    const c = ch.codePointAt(0);
    return (c >= 0x0400 && c <= 0x052f) || (c >= 0x1c80 && c <= 0x1c8f) || (c >= 0xa640 && c <= 0xa69f);
  }

  function isLatin(ch) {
    const c = ch.codePointAt(0);
    return (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) ||
      (c >= 0xc0 && c <= 0x24f && c !== 0xd7 && c !== 0xf7) || (c >= 0x1e00 && c <= 0x1eff);
  }

  function isGreek(ch) {
    const c = ch.codePointAt(0);
    return c >= 0x0370 && c <= 0x03ff;
  }

  function isUpper(ch) {
    return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
  }

  // Characters from legacy Mongolian fonts and neighbouring Cyrillic
  // alphabets that were typed in place of real Mongolian letters.
  // "?" marks a letter whose target (ү or у) is decided by vowel harmony.
  const LEGACY_LETTERS = {
    'Ѳ': 'Ө', 'ѳ': 'ө', 'Є': 'Ө', 'є': 'ө', 'Ɵ': 'Ө', 'ɵ': 'ө',
    'Θ': 'Ө', 'θ': 'ө', 'Ӫ': 'Ө', 'ӫ': 'ө', 'Ӧ': 'Ө', 'ӧ': 'ө',
    'Ö': 'Ө', 'ö': 'ө', 'Ü': 'Ү', 'ü': 'ү',
    'Ї': 'Ү', 'ї': 'ү', 'Ұ': 'Ү', 'ұ': 'ү', 'Ѵ': 'Ү', 'ѵ': 'ү', 'Ӱ': 'Ү', 'ӱ': 'ү',
    'Ѐ': 'Ё', 'ѐ': 'ё', 'Ë': 'Ё', 'ë': 'ё',
    'Ә': 'Э', 'ә': 'э', 'Җ': 'Ж', 'җ': 'ж', 'Ң': 'Н', 'ң': 'н',
    'І': 'И', 'і': 'и', 'Ғ': 'Г', 'ғ': 'г', 'Қ': 'К', 'қ': 'к', 'Һ': 'Х', 'һ': 'х',
    'Ў': 'У', 'ў': 'у',
  };

  // Latin letters that look like (or were typed for) Mongolian Cyrillic letters.
  // v/V were mapped to ү/Ү by legacy fonts; y/Y is decided by vowel harmony.
  const LATIN_TO_CYRILLIC = {
    A: 'А', a: 'а', B: 'В', C: 'С', c: 'с', E: 'Е', e: 'е', H: 'Н', K: 'К', k: 'к',
    M: 'М', O: 'О', o: 'о', P: 'Р', p: 'р', T: 'Т', X: 'Х', x: 'х',
    y: '?у', Y: '?У', v: 'ү', V: 'Ү',
  };

  // Greek letters seen inside Cyrillic words.
  const GREEK_TO_CYRILLIC = {
    'Α': 'А', 'α': 'а', 'Β': 'В', 'Ε': 'Е', 'ε': 'е', 'Η': 'Н', 'Κ': 'К', 'κ': 'к',
    'Μ': 'М', 'Ο': 'О', 'ο': 'о', 'Ρ': 'Р', 'ρ': 'р', 'Τ': 'Т', 'Χ': 'Х', 'χ': 'х',
    'Υ': 'Ү', 'υ': 'ү', 'ν': 'ү',
  };

  // Cyrillic letters that look like Latin letters (used inside Latin words).
  const CYRILLIC_TO_LATIN = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'І': 'I', 'Ј': 'J', 'К': 'K',
    'М': 'M', 'О': 'O', 'Р': 'P', 'Ѕ': 'S', 'Т': 'T', 'Х': 'X', 'У': 'Y', 'Ү': 'Y',
    'а': 'a', 'е': 'e', 'і': 'i', 'ј': 'j', 'о': 'o', 'р': 'p', 'с': 'c', 'ѕ': 's',
    'у': 'y', 'х': 'x', 'к': 'k', 'ү': 'y',
  };

  const INVISIBLE_CHARS = {
    '­': 'SOFT HYPHEN',
    '​': 'ZERO WIDTH SPACE',
    '‌': 'ZERO WIDTH NON-JOINER',
    '‍': 'ZERO WIDTH JOINER',
    '⁠': 'WORD JOINER',
    '﻿': 'ZERO WIDTH NO-BREAK SPACE',
  };

  // Returns 'back', 'front' or null from the vowels of a (lowercase) string.
  // Used to choose between у/ү when restoring look-alike letters.
  function roughHarmony(s) {
    let back = 0;
    let front = 0;
    for (const ch of s) {
      const h = HARMONY[ch];
      if (h === 'a' || h === 'o' || h === 'u') back++;
      else if (h === 'e' || h === 'ö' || h === 'ü') front++;
    }
    if (back && !front) return 'back';
    if (front && !back) return 'front';
    return null;
  }
    __exports.MN_LOWER = MN_LOWER;
    __exports.MN_UPPER = MN_UPPER;
    __exports.CONSONANTS = CONSONANTS;
    __exports.HARMONY = HARMONY;
    __exports.isMnLetter = isMnLetter;
    __exports.isCyrillic = isCyrillic;
    __exports.isLatin = isLatin;
    __exports.isGreek = isGreek;
    __exports.isUpper = isUpper;
    __exports.LEGACY_LETTERS = LEGACY_LETTERS;
    __exports.LATIN_TO_CYRILLIC = LATIN_TO_CYRILLIC;
    __exports.GREEK_TO_CYRILLIC = GREEK_TO_CYRILLIC;
    __exports.CYRILLIC_TO_LATIN = CYRILLIC_TO_LATIN;
    __exports.INVISIBLE_CHARS = INVISIBLE_CHARS;
    __exports.roughHarmony = roughHarmony;
});

__define("rules/characters.js", function (__require, __exports) {
  // Rules about the characters themselves: look-alike letters from other
  // alphabets, legacy font substitutes, invisible characters, mis-decoded text.

  const { LATIN_TO_CYRILLIC, CYRILLIC_TO_LATIN, LEGACY_LETTERS, GREEK_TO_CYRILLIC, INVISIBLE_CHARS } = __require("alphabet.js");
  const { charKind, normalizeCyrillicWord } = __require("text.js");
  const { ATTACHED_SUFFIXES } = __require("suffixes.js");
  // Font substitutes that are certainly wrong in Mongolian text. The remaining
  // legacy letters (ә, ғ, қ, ң, ұ, һ, і) are Kazakh letters and might belong to
  // a Kazakh name, so they are only a warning.
  const SURE_LEGACY = new Set('ѲѳЄєƟɵΘθӪӫӦӧÖöÜüЇїѴѵӰӱЀѐËë');

  function quote(chars) {
    return chars.map((c) => `«${c}»`).join(', ');
  }

  // Decides how a word that mixes alphabets should be written.
  // `neighbors` are nearby words, used when every letter could belong to
  // either alphabet (АBBA next to Latin words, СYX next to Mongolian ones).
  // Returns { fix, toLatin, latin: [...], legacy: [...], cyrillic: [...] } or null.
  function mixedScriptFix(tok, neighbors = []) {
    if (tok.kinds.mn + tok.kinds.legacy + tok.kinds.cyr === 0) return null;
    if (tok.kinds.lat + tok.kinds.legacy + tok.kinds.grk === 0) return null;
    let latinOnly = 0; // Latin letters with no Cyrillic look-alike
    let mnOnly = 0; // Mongolian letters with no Latin look-alike
    for (const ch of tok.text) {
      const kind = charKind(ch);
      if (kind === 'lat' && !LATIN_TO_CYRILLIC[ch] && !LEGACY_LETTERS[ch]) latinOnly++;
      else if (kind === 'mn' && !CYRILLIC_TO_LATIN[ch]) mnOnly++;
      else if (kind === 'cyr' && !CYRILLIC_TO_LATIN[ch]) mnOnly++;
      else if (kind === 'legacy' || kind === 'grk') mnOnly++;
    }
    // Two real words glued together (Stargateхүч, Facebookээр): another rule.
    if (latinOnly && mnOnly) return null;
    // A Latin word with a Mongolian suffix made of look-alike letters
    // (iPhoneоор) is also the latin-suffix rule's business.
    const tail = /^[A-Za-z]{2,}([а-яөүё]+)$/.exec(tok.text);
    if (tail && ATTACHED_SUFFIXES.has(tail[1])) return null;
    if (!latinOnly && !mnOnly) {
      let latinWords = 0;
      let mnWords = 0;
      for (const w of neighbors) {
        if (w.kinds.lat > w.kinds.mn) latinWords++;
        else if (w.kinds.mn) mnWords++;
      }
      if (latinWords > mnWords) latinOnly = 1;
    }

    if (latinOnly) {
      // A Latin word with Cyrillic look-alikes: Вurberry, ХI.
      let fix = '';
      const cyrillic = [];
      for (const ch of tok.text) {
        const kind = charKind(ch);
        if (kind === 'mn' || kind === 'cyr') {
          const rep = CYRILLIC_TO_LATIN[ch];
          if (!rep) return null;
          cyrillic.push(ch);
          fix += rep;
        } else if (kind === 'legacy') {
          return null;
        } else fix += ch;
      }
      return { fix, toLatin: true, cyrillic, latin: [], legacy: [] };
    }

    const fix = normalizeCyrillicWord(tok.text);
    if (fix === tok.text) return null;
    const latin = [];
    const legacy = [];
    for (const ch of tok.text) {
      if (LEGACY_LETTERS[ch]) legacy.push(ch);
      else if (LATIN_TO_CYRILLIC[ch] || GREEK_TO_CYRILLIC[ch]) latin.push(ch);
    }
    return { fix, toLatin: false, cyrillic: [], latin: [...new Set(latin)], legacy: [...new Set(legacy)] };
  }

  const mixedScript = {
    id: 'mixed-script',
    category: 'characters',
    severity: 'error',
    title: { mn: 'Холилдсон үсэг', en: 'Mixed alphabets' },
    description: {
      mn: 'Кирилл үгэнд латин эсвэл хуучин фонтын үсэг (o, a, v, ѳ, є, ї…) холилдохоор хайлт, үг шалгагч ажиллахгүй.',
      en: 'Latin look-alikes or legacy font letters (o, a, v, ѳ, є, ї…) inside Cyrillic words break search and spell-checking.',
    },
    examples: [['Mонгол', 'Монгол'], ['ѳдѳр', 'өдөр'], ['сэрvvн', 'сэрүүн'], ['Вurberry', 'Burberry']],
    check(doc, report) {
      const { words } = doc;
      for (const tok of words) {
        const i = tok.wordIndex;
        const r = mixedScriptFix(tok, words.slice(Math.max(0, i - 2), i).concat(words.slice(i + 1, i + 3)));
        if (!r) continue;
        let mn;
        let en;
        let severity = 'error';
        if (r.toLatin) {
          mn = `Латин үгэнд кирилл үсэг (${quote(r.cyrillic)}) холилдсон байна.`;
          en = `Cyrillic letters (${quote(r.cyrillic)}) mixed into a Latin word.`;
        } else {
          const parts = { mn: [], en: [] };
          if (r.latin.length) {
            parts.mn.push(`Кирилл үгэнд латин үсэг (${quote(r.latin)}) холилдсон байна.`);
            parts.en.push(`Latin letters (${quote(r.latin)}) mixed into a Cyrillic word.`);
          }
          if (r.legacy.length) {
            const kazakhOnly = !r.latin.length && r.legacy.every((ch) => !SURE_LEGACY.has(ch));
            // A capitalized word with Kazakh letters is most likely a Kazakh name.
            if (kazakhOnly && tok.isCap) continue;
            if (kazakhOnly) severity = 'warning';
            parts.mn.push(`${quote(r.legacy)} нь монгол цагаан толгойн үсэг биш (хуучин фонт эсвэл өөр хэлний гарнаас орсон).`);
            parts.en.push(`${quote(r.legacy)} ${r.legacy.length > 1 ? 'are' : 'is'} not in the Mongolian alphabet (legacy font or another keyboard layout).`);
          }
          mn = parts.mn.join(' ');
          en = parts.en.join(' ');
        }
        report({ start: tok.start, end: tok.end, message: { mn, en }, suggestions: [r.fix], severity });
      }
    },
  };

  const invisibleChar = {
    id: 'invisible-char',
    category: 'characters',
    severity: 'warning',
    title: { mn: 'Үл үзэгдэх тэмдэгт', en: 'Invisible character' },
    description: {
      mn: 'Үгийн дотор нуугдсан тэмдэгт (зөөлөн зураас, тэг өргөнтэй зай) хайлт болон үг шалгалтыг эвддэг.',
      en: 'Hidden characters inside words (soft hyphen, zero-width space) break search and spell-checking.',
    },
    examples: [['сур­гууль', 'сургууль']],
    check(doc, report) {
      const { text } = doc;
      for (let i = 0; i < text.length; i++) {
        const name = INVISIBLE_CHARS[text[i]];
        if (!name) continue;
        if (text[i] === '﻿' ? i === 0 : !(/\p{L}/u.test(text[i - 1] || '') && /\p{L}/u.test(text[i + 1] || ''))) continue;
        report({
          start: i,
          end: i + 1,
          message: {
            mn: `Үгийн дотор үл үзэгдэх тэмдэгт (${name}) байна.`,
            en: `Invisible character (${name}) inside a word.`,
          },
          suggestions: [''],
        });
      }
    },
  };

  // UTF-8 bytes of Cyrillic text decoded with a Windows code page ("Ð¡Ð°Ð¹Ð½",
  // "РЎР°Р№РЅ"). Each table lists the characters for bytes 0x80-0xFF.
  const CP1252 = '€￿‚ƒ„…†‡ˆ‰Š‹Œ￿Ž￿￿‘’“”•–—˜™š›œ￿žŸ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';
  const CP1251 = 'ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—￿™љ›њќћџ ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї°±Ііґµ¶·ё№є»јЅѕїАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя';

  function escapeClass(s) {
    return s.replace(/[\\\]^-]/g, '\\$&');
  }

  function buildDecoder(table, allowC1) {
    const toByte = new Map();
    for (let i = 0; i < 128; i++) if (table[i] !== '￿') toByte.set(table[i], 0x80 + i);
    if (allowC1) for (let b = 0x80; b < 0xa0; b++) if (!toByte.has(String.fromCharCode(b))) toByte.set(String.fromCharCode(b), b);
    const cont = [...toByte.entries()].filter(([, b]) => b < 0xc0).map(([c]) => c).join('');
    const lead = [0xd0, 0xd1, 0xd2, 0xd3].map((b) => table[b - 0x80]).join('');
    const pair = `[${escapeClass(lead)}][${escapeClass(cont)}]`;
    const re = new RegExp(`${pair}(?:[ \\t,.!?:;()-]*${pair})+`, 'g');
    const decode = (s) => {
      const bytes = [];
      for (const ch of s) {
        const c = ch.charCodeAt(0);
        if (c < 0x80) bytes.push(c);
        else if (toByte.has(ch)) bytes.push(toByte.get(ch));
        else return null;
      }
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      } catch {
        return null;
      }
    };
    return { re, decode };
  }

  const DECODERS = [buildDecoder(CP1252, true), buildDecoder(CP1251, false)];

  const mojibake = {
    id: 'mojibake',
    category: 'characters',
    severity: 'error',
    title: { mn: 'Эвдэрсэн кодчилол', en: 'Broken encoding' },
    description: {
      mn: 'UTF-8 текстийг буруу кодчилолоор уншсан үед «Ð¡Ð°Ð¹Ð½», «РЎР°Р№РЅ» мэт болдог. Эх текстийг сэргээнэ.',
      en: 'UTF-8 text read with the wrong code page turns into «Ð¡Ð°Ð¹Ð½» or «РЎР°Р№РЅ». The original text is restored.',
    },
    examples: [['Ð¡Ð°Ð¹Ð½', 'Сайн']],
    check(doc, report) {
      for (const { re, decode } of DECODERS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(doc.text))) {
          const decoded = decode(m[0]);
          if (!decoded || !/[Ѐ-ӿ]/.test(decoded)) continue;
          report({
            start: m.index,
            end: m.index + m[0].length,
            message: {
              mn: `Кодчилол эвдэрсэн текст: «${decoded}» гэсэн үг байх магадлалтай.`,
              en: `Mis-decoded text; it most likely reads «${decoded}».`,
            },
            suggestions: [decoded],
          });
        }
      }
    },
  };

  const replacementChar = {
    id: 'replacement-char',
    category: 'characters',
    severity: 'warning',
    title: { mn: 'Танигдаагүй тэмдэгт', en: 'Unknown character' },
    description: {
      mn: '«�» тэмдэгт нь хуулах үед үсэг алдагдсаныг илтгэнэ.',
      en: 'The «�» character means a letter was lost while copying or converting the text.',
    },
    examples: [],
    check(doc, report) {
      for (let i = doc.text.indexOf('�'); i >= 0; i = doc.text.indexOf('�', i + 1)) {
        report({
          start: i,
          end: i + 1,
          message: {
            mn: 'Танигдаагүй тэмдэгт (�): хуулах эсвэл хөрвүүлэх үед үсэг алдагдсан байна.',
            en: 'Unknown character (�): a letter was lost while copying or converting.',
          },
        });
      }
    },
  };

  __exports.default = [mixedScript, invisibleChar, mojibake, replacementChar];
    __exports.mixedScriptFix = mixedScriptFix;
});

__define("suffixes.js", function (__require, __exports) {
  // Case and derivational endings that attach with a hyphen to numerals,
  // abbreviations and Latin-script words (2024-ийн, АНУ-ын, Facebook-ээр).

  const BASE_SUFFIXES = [
    'ын', 'ийн', 'ы', 'ий', 'н', 'ны', 'ний', 'гийн',
    'ыг', 'ийг', 'г', 'ныг', 'нийг',
    'д', 'т', 'ад', 'эд', 'од', 'өд', 'нд', 'ид',
    'аас', 'ээс', 'оос', 'өөс', 'гаас', 'гээс', 'гоос', 'гөөс', 'наас', 'нээс', 'ноос', 'нөөс', 'иас', 'иос',
    'аар', 'ээр', 'оор', 'өөр', 'гаар', 'гээр', 'гоор', 'гөөр', 'иар', 'иор',
    'тай', 'тэй', 'той', 'руу', 'рүү', 'луу', 'лүү',
    'ууд', 'үүд', 'иуд', 'чууд', 'чүүд',
    'ынх', 'ийнх', 'ынхан', 'ийнхэн', 'ынхны', 'ийнхний', 'ынхон', 'ийнхон',
    'р', 'рт', 'аад', 'ээд', 'оод', 'өөд', 'хан', 'хэн', 'хон', 'хөн', 'дахь', 'дэх', 'дох', 'дөх',
    'уулаа', 'үүлээ',
  ];
  const REFLEXIVE = { 'аас': 'аа', 'оос': 'оо', 'ээс': 'ээ', 'өөс': 'өө', 'аар': 'аа', 'оор': 'оо', 'ээр': 'ээ', 'өөр': 'өө' };

  const ATTACHED_SUFFIXES = new Set(BASE_SUFFIXES);
  for (const s of BASE_SUFFIXES) {
    const tail = s.slice(-3);
    if (REFLEXIVE[tail]) ATTACHED_SUFFIXES.add(s + REFLEXIVE[tail]);
  }
  for (const s of ['д', 'нд', 'ад', 'эд', 'од', 'өд', 'т']) {
    ATTACHED_SUFFIXES.add(`${s}аа`).add(`${s}ээ`).add(`${s}оо`).add(`${s}өө`);
  }
  for (const s of ['ын', 'ийн', 'ний', 'ны', 'ууд', 'үүд']) {
    ATTACHED_SUFFIXES.add(`${s}хаа`).add(`${s}хээ`);
  }
  for (const s of ['уудын', 'үүдийн', 'уудад', 'үүдэд', 'ынхаа', 'ийнхээ']) ATTACHED_SUFFIXES.add(s);
    __exports.ATTACHED_SUFFIXES = ATTACHED_SUFFIXES;
});

__define("rules/harmony.js", function (__require, __exports) {
  // Vowel harmony of suffixes (эгшиг зохицох ёс) and genitive/accusative endings.

  const { stemHarmony, isBackSlot, isDisharmonicWord, SLOT_NAMES } = __require("harmony.js");
  const { CONSONANTS } = __require("alphabet.js");
  const { matchCase } = __require("text.js");
  // Suffix families. `forms` are ordered A, O, E, OE (4-way), A, O, E (3-way:
  // ө-stems take the э-form) or back, front (2-way).
  //   verbal:  the stem must end in a consonant, a long vowel or a diphthong
  //            (verb stems never end in a short written vowel).
  //   minStem: shortest stem to consider.
  const FAMILIES = [
    { id: 'abl', forms: ['аас', 'оос', 'ээс', 'өөс'], name: { mn: 'гарахын тийн ялгал', en: 'ablative' } },
    { id: 'ins', forms: ['аар', 'оор', 'ээр', 'өөр'], name: { mn: 'үйлдэхийн тийн ялгал', en: 'instrumental' } },
    { id: 'abl-refl', forms: ['аасаа', 'оосоо', 'ээсээ', 'өөсөө'], name: { mn: 'гарахын тийн ялгал', en: 'ablative' } },
    { id: 'ins-refl', forms: ['аараа', 'оороо', 'ээрээ', 'өөрөө'], name: { mn: 'үйлдэхийн тийн ялгал', en: 'instrumental' } },
    { id: 'imp', forms: ['аарай', 'оорой', 'ээрэй', 'өөрэй'], verbal: true, name: { mn: 'захирах хэв', en: 'polite imperative' } },
    { id: 'cvb', forms: ['аад', 'оод', 'ээд', 'өөд'], name: { mn: 'нөхцөл үйл үг -аад', en: 'converb -аад' } },
    { id: 'pur', forms: ['хаар', 'хоор', 'хээр', 'хөөр'], name: { mn: 'нөхцөл -хаар', en: 'suffix -хаар' } },
    { id: 'pst', forms: ['лаа', 'лоо', 'лээ', 'лөө'], verbal: true, consonant: true, minStem: 2, name: { mn: 'өнгөрсөн цаг -лаа', en: 'past tense -лаа' } },
    { id: 'ptcp', forms: ['сан', 'сон', 'сэн', 'сөн'], verbal: true, minStem: 2, name: { mn: 'өнгөрсөн цагийн үйлт нэр -сан', en: 'past participle -сан' } },
    { id: 'hab', forms: ['даг', 'дог', 'дэг', 'дөг'], verbal: true, minStem: 2, name: { mn: 'байнгын үйлт нэр -даг', en: 'habitual -даг' } },
    { id: 'when', forms: ['хад', 'ход', 'хэд', 'хөд'], minStem: 3, name: { mn: 'нөхцөл -хад', en: 'suffix -хад' } },
    { id: 'until', forms: ['тал', 'тол', 'тэл', 'төл'], verbal: true, consonant: true, minStem: 2, name: { mn: 'нөхцөл -тал', en: 'suffix -тал' } },
    { id: 'cond', forms: ['вал', 'вол', 'вэл', 'вөл'], verbal: true, minStem: 2, name: { mn: 'нөхцөл -вал', en: 'conditional -вал' } },
    { id: 'com', forms: ['тай', 'той', 'тэй'], name: { mn: 'хамтрахын тийн ялгал', en: 'comitative' } },
    { id: 'pl', forms: ['ууд', 'үүд'], consonant: true, minStem: 2, name: { mn: 'олон тооны -ууд', en: 'plural -ууд' } },
    { id: 'caus', forms: ['уул', 'үүл'], consonant: true, minStem: 2, name: { mn: 'үйлдүүлэх хэв -уул', en: 'causative -уул' } },
    { id: 'ord', forms: ['дугаар', 'дүгээр'], minStem: 2, name: { mn: 'дэс тоо -дугаар', en: 'ordinal -дугаар' } },
  ];

  const SUFFIX_INDEX = [];
  for (const fam of FAMILIES) {
    fam.forms.forEach((form, i) => SUFFIX_INDEX.push({ fam, form, i }));
  }
  SUFFIX_INDEX.sort((a, b) => b.form.length - a.form.length);

  // Ordinals may carry a case ending: гуравдугаарт, хоёрдугаарын.
  const ORD_TAIL = /(дугаар|дүгээр)(т|ын|ийн|ыг|ийг|аас|ээс|аар|ээр|тай|тэй)?$/;

  function slotIndex(fam, slot) {
    const n = fam.forms.length;
    if (n === 4) return { A: 0, O: 1, E: 2, OE: 3 }[slot];
    if (n === 3) return { A: 0, O: 1, E: 2, OE: 2 }[slot];
    return isBackSlot(slot) ? 0 : 1;
  }

  function endsLong(stem) {
    return /(аа|оо|уу|ээ|өө|үү|яа|ёо|иа|ио|ай|ой|уй|эй|үй|ий|ый)$/.test(stem);
  }

  // Finds the suffix of a lowercase word and the variant harmony requires.
  // Returns { form, expected, stem, fam } when the suffix is the wrong variant.
  function suffixHarmonyError(lower) {
    const ord = ORD_TAIL.exec(lower);
    let candidates = SUFFIX_INDEX;
    let tail = '';
    let word = lower;
    if (ord && ord.index >= 2) {
      tail = ord[2] || '';
      word = lower.slice(0, lower.length - tail.length);
      candidates = SUFFIX_INDEX.filter((c) => c.fam.id === 'ord');
    }
    for (const c of candidates) {
      const { fam, form } = c;
      if (!word.endsWith(form)) continue;
      const stem = word.slice(0, word.length - form.length);
      // A suffix that cannot attach here: try a shorter one (болохаар = болох + аар).
      if (stem.length < (fam.minStem || 2)) continue;
      // ...хүүд is хүү "boy" + dative -д (ханхүүд, жаалхүүд), not a plural.
      if (fam.id === 'pl' && stem.endsWith('х')) continue;
      if (fam.verbal || fam.consonant) {
        const last = stem[stem.length - 1];
        const okEnd = CONSONANTS.has(last) || last === 'ь' || (!fam.consonant && endsLong(stem));
        if (!okEnd) continue;
      }
      const h = stemHarmony(stem);
      if (!h) return null;
      const accepted = h.accept.map((s) => fam.forms[slotIndex(fam, s)]);
      if (accepted.includes(form)) return null;
      return { form, expected: fam.forms[slotIndex(fam, h.slot)], stem, fam, slot: h.slot, tail };
    }
    return null;
  }

  // Plural and causative suffixes inside a longer word (хөгжуулэх, өдруудийн).
  const INNER_RE = /(?:уу|үү)(?=[лд])/g;

  function innerHarmonyError(lower) {
    INNER_RE.lastIndex = 0;
    let m;
    while ((m = INNER_RE.exec(lower))) {
      const i = m.index;
      // Only a suffix inside the word (a final one is checked as a suffix family),
      // attached to a consonant after a stem of at least two letters; хүү "boy"
      // inside compounds (ханхүүдийн) is not a suffix.
      if (i < 2 || i + 3 >= lower.length || !CONSONANTS.has(lower[i - 1]) || lower[i - 1] === 'х') continue;
      const stem = lower.slice(0, i);
      const h = stemHarmony(stem);
      if (!h) continue;
      const want = isBackSlot(h.slot) ? 'уу' : 'үү';
      if (m[0] !== want) return { index: i, form: m[0], expected: want, stem, slot: h.slot };
    }
    return null;
  }

  // Front stems that are often typed with у/о instead of ү/ө (keyboards
  // without Mongolian letters). Their у/о spelling is not a word of its own,
  // so "туухтэй" is far more likely «түүхтэй» than «туухтай».
  const FLIP_TARGETS = [
    'түүх', 'үүн', 'түүн', 'хүч', 'зүг', 'дүгээр', 'зүйл', 'үйл', 'үнэ', 'үндэс', 'үндс', 'хүмүүс', 'хүүхэд',
    'хүртэл', 'үзүүл', 'үлд', 'үүрэг', 'бүтэц', 'бүтээ', 'бүрэн', 'бүрд', 'бүх', 'түвш', 'түрүү', 'сүүл',
    'нүүр', 'шүүх', 'шүүгч', 'шүүмж', 'жүжиг', 'эрүүл', 'өгүүл', 'илүү', 'гүтгэ', 'түшээ', 'хүлээ', 'хүсэл',
    'хүсэх', 'хүсч', 'үнэн', 'үе', 'өөр', 'өдөр', 'өдр', 'өнөөдөр', 'өмнө', 'өндөр', 'өсөлт', 'өргөн', 'өвөл',
    'өнгө', 'өнгөр', 'өртөг', 'төсөл', 'төсл', 'төсөв', 'төсв', 'төлбөр', 'төлөв', 'төгрөг', 'хөгж', 'хөрөнгө',
    'хөдөлмөр', 'хөдөө', 'хөтөлбөр', 'мөнгө', 'бөгөөд', 'нөхцөл', 'нөлөө', 'нөөц', 'өөрчл', 'өрсөлд', 'төрөл',
    'өвчин', 'өвчн', 'өмч', 'өглөө', 'хөшөө', 'дөрөв', 'үйлдвэр', 'үйлчил', 'үзэсгэлэн', 'хүрээ', 'дүүрэг',
  ];

  // The same word with у→ү and о→ө in the stem, when that gives a known front
  // stem that agrees with the suffix as written.
  function flippedStem(stem, form, fam) {
    if (!/[уо]/.test(stem) || /[эөүе]/.test(stem)) return null;
    const flipped = stem.replace(/у/g, 'ү').replace(/о/g, 'ө');
    if (!FLIP_TARGETS.some((t) => flipped.startsWith(t))) return null;
    const h = stemHarmony(flipped);
    if (!h || !h.accept.some((s) => fam.forms[slotIndex(fam, s)] === form)) return null;
    return flipped;
  }

  // Lowercase words, and capitalized words at the start of a sentence (names
  // in the middle of a sentence are skipped, as are abbreviations like ҮДБЭЧуулын).
  function checkable(tok) {
    if (!tok.isCap) return true;
    return tok.sentenceStart && tok.text.slice(1) === tok.text.slice(1).toLowerCase();
  }

  function harmonyMessage(stem, slot, form, expected, fam) {
    const name = SLOT_NAMES[slot];
    const famMn = fam ? ` (${fam.name.mn})` : '';
    const famEn = fam ? ` (${fam.name.en})` : '';
    return {
      mn: `Эгшиг зохицох ёсоор «${stem}-» нь ${name.mn} тул «-${form}» биш «-${expected}»${famMn} залгана.`,
      en: `Vowel harmony: «${stem}-» is a ${name.en}, so the suffix is «-${expected}», not «-${form}»${famEn}.`,
    };
  }

  const suffixHarmony = {
    id: 'suffix-harmony',
    category: 'harmony',
    severity: 'error',
    title: { mn: 'Залгаварын эгшиг зохицол', en: 'Suffix vowel harmony' },
    description: {
      mn: 'Нөхцөл, дагавар нь үгийн язгуурын эгшигтэй зохицно: эр үгэнд -аас/-оос, эм үгэнд -ээс/-өөс гэх мэт.',
      en: 'Suffixes agree with the vowels of the stem: back words take -аас/-оос, front words -ээс/-өөс, and so on.',
    },
    examples: [['номээс', 'номоос'], ['гэраас', 'гэрээс'], ['өдрээс', 'өдрөөс'], ['хийсан', 'хийсэн']],
    check(doc, report) {
      for (const tok of doc.words) {
        // Proper names and loanwords follow their own patterns: only lowercase
        // words, or capitalized ones that merely start a sentence.
        if (!tok.clean || !checkable(tok) || tok.text.length < 4) continue;
        const lower = tok.lower;
        if (isDisharmonicWord(lower)) continue;
        const inner = innerHarmonyError(lower);
        if (inner) {
          const start = tok.start + inner.index;
          report({
            start,
            end: start + 2,
            message: harmonyMessage(inner.stem, inner.slot, `${inner.form}${lower[inner.index + 2]}`, `${inner.expected}${lower[inner.index + 2]}`, null),
            suggestions: [inner.expected],
          });
          continue;
        }
        const err = suffixHarmonyError(lower);
        if (!err) continue;
        // Capitalized -сон is usually a foreign surname (Жэйсон, Ларсон).
        if (tok.isCap && err.form === 'сон' && lower.endsWith('сон')) continue;
        const end = tok.end - err.tail.length;
        const start = end - err.form.length;
        const flipped = flippedStem(err.stem, err.form, err.fam);
        if (flipped) {
          // Probably у/о typed for ү/ө: offer the corrected stem first.
          const stemLen = err.stem.length;
          const asTyped = (s) => matchCase(tok.text, s);
          const stemFix = asTyped(flipped + tok.lower.slice(stemLen));
          const suffixFix = tok.text.slice(0, stemLen) + err.expected + tok.text.slice(stemLen + err.form.length);
          report({
            start: tok.start,
            end: tok.end,
            message: {
              mn: `Эгшиг зохицохгүй байна: «у/ү», «о/ө» үсгийг андуурсан бол «${stemFix}», нөхцөл нь буруу бол «${suffixFix}».`,
              en: `Vowel harmony mismatch: if у/ү or о/ө were mixed up, write «${stemFix}»; if the suffix is wrong, «${suffixFix}».`,
            },
            suggestions: [stemFix, suffixFix],
          });
          continue;
        }
        report({
          start,
          end,
          message: harmonyMessage(err.stem, err.slot, err.form, err.expected, err.fam),
          suggestions: [err.expected],
        });
      }
    },
  };

  // Genitive -ын/-ийн, -ны/-ний and accusative -ыг/-ийг.
  // (г is not included: дарга → даргын, but аймаг → аймгийн.)
  const PALATAL = new Set(['ж', 'ч', 'ш']);

  function caseEndingError(lower) {
    // After a long vowel the genitive is always -гийн: удаагийн, цагдаагийн.
    let m = /^(.+(?:аа|оо|уу|яа|ёо|иа|ио))г(ын)$/.exec(lower);
    if (m) return { stem: `${m[1]}г`, form: 'ын', expected: 'ийн', why: 'long' };
    m = /^(.+?)(ын|ыг)$/.exec(lower);
    if (m) {
      const [, stem, ending] = m;
      // хөршийын: the ending is already there, only ы is extra.
      if (stem.endsWith('ий')) return { stem, form: ending, expected: ending.slice(1), why: 'front' };
      const want = ending === 'ын' ? 'ийн' : 'ийг';
      const h = stemHarmony(stem);
      if (!h) return null;
      if (!isBackSlot(h.slot)) return { stem, form: ending, expected: want, why: 'front' };
      if (PALATAL.has(stem[stem.length - 1])) return { stem, form: ending, expected: want, why: 'palatal' };
      return null;
    }
    m = /^(.+н)(ы|ий)$/.exec(lower);
    if (m) {
      const [, stemN, ending] = m;
      const h = stemHarmony(stemN);
      if (!h) return null;
      if (ending === 'ы' && !isBackSlot(h.slot)) return { stem: stemN, form: 'ы', expected: 'ий', why: 'front' };
      // -ний after a back stem ending in a long vowel: судалгааний → судалгааны.
      if (ending === 'ий' && isBackSlot(h.slot) && endsLong(stemN.slice(0, -1)) && !/[иы]н$/.test(stemN)) {
        return { stem: stemN, form: 'ий', expected: 'ы', why: 'back' };
      }
    }
    return null;
  }

  const CASE_NAMES = {
    'ын': 'gen', 'ийн': 'gen', 'ы': 'gen', 'ий': 'gen', 'ыг': 'acc', 'ийг': 'acc',
  };

  const caseEnding = {
    id: 'case-ending',
    category: 'harmony',
    severity: 'error',
    title: { mn: 'Харьяалахын болон заахын тийн ялгал', en: 'Genitive and accusative endings' },
    description: {
      mn: 'Эм үгэнд -ийн, -ийг, -ний; эр үгэнд -ын, -ыг, -ны залгана. г, ж, ч, ш-ээр төгссөн эр үг ч -ийн, -ийг авна.',
      en: 'Front words take -ийн, -ийг, -ний; back words take -ын, -ыг, -ны. Back words ending in г, ж, ч, ш also take -ийн, -ийг.',
    },
    examples: [['гишүүдын', 'гишүүдийн'], ['хүны', 'хүний'], ['багшын', 'багшийн'], ['судалгааний', 'судалгааны']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean || tok.text.length < 4) continue;
        const err = caseEndingError(tok.lower);
        // Names are skipped, except for the -гийн rule that holds for them too.
        if (!err || (!checkable(tok) && err.why !== 'long')) continue;
        const start = tok.end - err.form.length;
        const isAcc = CASE_NAMES[err.form] === 'acc';
        const caseMn = isAcc ? 'заахын тийн ялгалын' : 'харьяалахын тийн ялгалын';
        const caseEn = isAcc ? 'accusative' : 'genitive';
        let mn;
        let en;
        if (err.why === 'long') {
          mn = `Урт эгшгээр төгссөн үгэнд ${caseMn} «-гийн» нөхцөл залгана («-гын» биш).`;
          en = `After a long vowel the ${caseEn} ending is «-гийн», not «-гын».`;
        } else if (err.why === 'palatal') {
          const last = err.stem[err.stem.length - 1];
          mn = `«${last}» гийгүүлэгчээр төгссөн үгэнд ${caseMn} «-${err.expected}» нөхцөл залгана («-${err.form}» биш).`;
          en = `Words ending in «${last}» take the ${caseEn} ending «-${err.expected}», not «-${err.form}».`;
        } else if (err.why === 'front') {
          mn = `«${err.stem}-» нь эм үг тул ${caseMn} «-${err.expected}» нөхцөл залгана («-${err.form}» биш).`;
          en = `«${err.stem}-» is a front-vowel word, so the ${caseEn} ending is «-${err.expected}», not «-${err.form}».`;
        } else {
          mn = `«${err.stem}-» нь урт эгшгээр төгссөн эр үг тул «-н${err.expected}» гэж бичнэ («-н${err.form}» биш).`;
          en = `«${err.stem}-» is a back-vowel word ending in a long vowel, so write «-н${err.expected}», not «-н${err.form}».`;
        }
        report({ start, end: tok.end, message: { mn, en }, suggestions: [err.expected] });
      }
    },
  };

  __exports.default = [suffixHarmony, caseEnding];
    __exports.suffixHarmonyError = suffixHarmonyError;
    __exports.innerHarmonyError = innerHarmonyError;
    __exports.caseEndingError = caseEndingError;
});

__define("harmony.js", function (__require, __exports) {
  // Vowel harmony analysis.
  //
  // Mongolian suffixes come in harmonic variants. The variant is chosen by the
  // vowels of the stem:
  //   A  - back (эр) stem whose last decisive vowel is а or у:  -аас, -тай, -сан
  //   O  - back stem with rounding (о, ё):                       -оос, -той, -сон
  //   E  - front (эм) stem whose last decisive vowel is э or ү:  -ээс, -тэй, -сэн
  //   OE - front stem with rounding (ө):                         -өөс, -тэй, -сөн
  // и and ы are neutral: they are transparent and never decide the variant.
  //
  // The analysis is deliberately conservative. Loanwords, compounds and names
  // do not follow native harmony, so any stem that does not look like a native
  // Mongolian stem yields null and is never flagged.

  const { HARMONY, CONSONANTS } = __require("alphabet.js");
  // Letters that (almost) never occur in native Mongolian stems.
  const LOAN_LETTERS = /[кпфщ]/;
  // е and ю right after a consonant only occur in loanwords (компьютер, менежер).
  const LOAN_IOTATED = /[бвгджзйклмнпрстфхцчшщ][ею]/;
  // Russian endings whose suffixes vary in practice (вирусээр/вирусаар,
  // институттэй/институттай). Short native words (ус, цус, тус) are kept.
  const LOAN_ENDINGS = /(?:[бвгдзлмнрстх][уо]с|[бвгдзлмнрстх]ут|изм|ист|ент|ант|[иу]ц|[бвгдзкмнпрстфх]ль)$/;
  // Words that break native harmony: санхүү "finance", the city Арвайхээр,
  // Холливүүд, and personal names ending in -туул or -маа (Энхтуул, Болормаа).
  const DISHARMONIC = /санхүү|арвайхээр|холливүүд|туул|[эөүи][^аоуяё]*маа/;

  // True for whole words (lowercase) that must not be checked for harmony.
  function isDisharmonicWord(lower) {
    return DISHARMONIC.test(lower);
  }
  // Stems with only и are usually front, but many such stems are names or
  // fragments. These common verb roots are certainly front (хийсэн, бичсэн).
  const FRONT_NEUTRAL_ROOTS = /^(?:хий|бич|ид|ир|шийд)/;

  const SLOT_NAMES = {
    A: { mn: 'эр үг', en: 'back-vowel (masculine) word' },
    O: { mn: '«о» эгшигтэй эр үг', en: 'back-vowel word with rounded «о»' },
    E: { mn: 'эм үг', en: 'front-vowel (feminine) word' },
    OE: { mn: '«ө» эгшигтэй эм үг', en: 'front-vowel word with rounded «ө»' },
  };

  function decisiveVowels(s) {
    const out = [];
    for (const ch of s) {
      const h = HARMONY[ch];
      if (h) out.push(h);
    }
    return out;
  }

  // Checks that a sequence of harmony values can belong to one native word.
  function consistent(vs) {
    // A word-initial е can be either йэ or йө (ерэн, ерөнхий).
    if (vs[0] === 'E') vs = vs.slice(1);
    if (!vs.length) return true;
    if (vs.includes('E')) return false;
    let back = false;
    let front = false;
    for (const v of vs) {
      if (v === 'a' || v === 'o' || v === 'u' || v === 'U') back = true;
      else front = true;
    }
    if (back && front) return false;
    const first = vs[0];
    if (back) {
      // о spreads to later syllables until у interrupts it; а/у words never get о.
      if (first === 'a' || first === 'u' || first === 'U') return !vs.includes('o');
      let interrupted = false;
      for (const v of vs.slice(1)) {
        if (v === 'u' || v === 'U') interrupted = true;
        else if (v === 'a' && !interrupted) return false;
      }
      return true;
    }
    if (first === 'e' || first === 'ü') return !vs.includes('ö');
    let interrupted = false;
    for (const v of vs.slice(1)) {
      if (v === 'ü') interrupted = true;
      else if (v === 'e' && !interrupted) return false;
    }
    return true;
  }

  function slotOf(vs) {
    for (let i = vs.length - 1; i >= 0; i--) {
      const v = vs[i];
      if (v === 'a' || v === 'u' || v === 'U') return 'A';
      if (v === 'o') return 'O';
      if (v === 'e' || v === 'ü') return 'E';
      if (v === 'ö') return 'OE';
      // е alone does not tell whether the word is rounded: look further back.
    }
    return null;
  }

  // Returns { slot, accept } for a lowercase stem, or null when the stem is not
  // a reliable native stem (loanword, name, compound, too short, no vowels).
  // `accept` lists every slot whose suffix variant is correct after this stem.
  function stemHarmony(stem) {
    if (stem.length < 2) return null;
    if (LOAN_LETTERS.test(stem) || LOAN_IOTATED.test(stem)) return null;
    if (CONSONANTS.has(stem[0]) && CONSONANTS.has(stem[1])) return null;
    if (stem.length >= 5 && LOAN_ENDINGS.test(stem)) return null;
    if (DISHARMONIC.test(stem)) return null;

    // The negative -гүй starts a new front segment (мэдэхгүйгээр), and so does
    // the verbal -хий- after a consonant of a back stem (зайлсхийсэн,
    // заналхийлсэн) or as -схий- (өнгөрсхийгээд). Elsewhere -ий- is transparent
    // like и (бөхийсөн, өндийсөн, талийсан, ерөнхийгөөс).
    let segment = stem;
    let reset = false;
    const gui = stem.lastIndexOf('гүй');
    const khii = stem.lastIndexOf('хий');
    if (gui > 0 && stem.length - gui <= 8) {
      segment = stem.slice(gui);
      reset = true;
    }
    if (khii > 0 && khii > gui && stem.length - khii <= 8 && CONSONANTS.has(stem[khii - 1])) {
      const before = decisiveVowels(stem.slice(0, khii));
      const backBefore = before.length && before.every((v) => v === 'a' || v === 'o' || v === 'u' || v === 'U');
      if (backBefore || stem[khii - 1] === 'с') {
        segment = stem.slice(khii);
        reset = true;
      }
    }

    const vs = decisiveVowels(segment);
    if (!vs.length) return reset || FRONT_NEUTRAL_ROOTS.test(stem) ? { slot: 'E', accept: ['E'] } : null;
    if (!consistent(vs)) return null;
    if (!reset && !consistent(decisiveVowels(stem))) return null;
    const slot = slotOf(vs);
    if (!slot) return null;

    // After the comitative -тэй of an ө-stem both -гээр and -гөөр are in use
    // (нөхцөлтэйгээр / нөхцөлтэйгөөр).
    if (/тэй[гн]?$/.test(segment)) {
      const before = decisiveVowels(segment.replace(/тэй[гн]?$/, ''));
      if (before.length && slotOf(before) === 'OE') return { slot: 'E', accept: ['E', 'OE'] };
    }
    return { slot, accept: [slot] };
  }

  // Back/front class of a whole word for question particles: the last decisive
  // vowel wins, a final -гүй is ignored (мэдэхгүй юү, байхгүй юу).
  // Returns 'back', 'front' or null.
  function wordClass(lower) {
    const w = lower.replace(/гүй$/, '') || lower;
    for (let i = w.length - 1; i >= 0; i--) {
      const v = HARMONY[w[i]];
      if (!v) continue;
      if (v === 'a' || v === 'o' || v === 'u') return 'back';
      if (v === 'e' || v === 'ö' || v === 'ü') return 'front';
      return null; // е / ю: undecidable
    }
    return null;
  }

  function isBackSlot(slot) {
    return slot === 'A' || slot === 'O';
  }
    __exports.isDisharmonicWord = isDisharmonicWord;
    __exports.SLOT_NAMES = SLOT_NAMES;
    __exports.stemHarmony = stemHarmony;
    __exports.wordClass = wordClass;
    __exports.isBackSlot = isBackSlot;
});

__define("rules/particles.js", function (__require, __exports) {
  // Particles: question particles уу/үү/юу/юү and вэ/бэ, separately written
  // particles (ч, уу, вэ) and the negative suffix -гүй.

  const { wordClass } = __require("harmony.js");
  const { nextToken, prevWordInline, matchCase } = __require("text.js");
  const LONG_END = /(аа|оо|уу|ээ|өө|үү|яа|ёо|юу|юү|иа|ио|еэ|ай|ой|уй|эй|үй|ий|ый|яй|ёй|юй|ей)$/;
  // Loanword endings whose length is unclear (шоу, радио).
  const UNCLEAR_END = /(оу|эу|иу|ау|ео|ио|иа)$/;

  function isQuestionMark(tok) {
    return tok && tok.type === 'punct' && tok.text === '?';
  }

  const questionParticle = {
    id: 'question-particle',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Асуух сул үг уу/үү/юу/юү', en: 'Question particle уу/үү/юу/юү' },
    description: {
      mn: 'Эр үгийн дараа уу/юу, эм үгийн дараа үү/юү; урт эгшиг, хос эгшгээр төгссөн үгийн дараа юу/юү бичнэ.',
      en: 'Back words take уу/юу and front words үү/юү; after a long vowel or diphthong the particle is юу/юү.',
    },
    examples: [['Ирэх уу?', 'Ирэх үү?'], ['Байгаа уу?', 'Байгаа юу?'], ['Сайн үү?', 'Сайн уу?']],
    check(doc, report) {
      for (const tok of doc.words) {
        const cur = tok.lower;
        if (cur !== 'уу' && cur !== 'үү' && cur !== 'юу' && cur !== 'юү') continue;
        if (!isQuestionMark(nextToken(doc, tok, true))) continue;
        const prev = prevWordInline(doc, tok);
        if (!prev || !prev.clean || prev.isAllCaps) continue;
        const p = prev.lower;
        if (UNCLEAR_END.test(p) && !LONG_END.test(p)) continue;
        const long = LONG_END.test(p);
        const cls = wordClass(p);
        const curLong = cur[0] === 'ю';
        const curVowel = cur[1];
        const vowel = cls === 'back' ? 'у' : cls === 'front' ? 'ү' : curVowel;

        // юу after a short ending may be the pronoun «юу» (what): Энэ юу?
        if (!long && cur === 'юу') continue;

        const expected = long ? `ю${vowel}` : `${vowel}${vowel}`;
        if (expected === cur) continue;

        const reasons = { mn: [], en: [] };
        if (long !== curLong) {
          if (long) {
            reasons.mn.push(`«${prev.text}» урт эгшиг буюу хос эгшгээр төгссөн`);
            reasons.en.push(`«${prev.text}» ends in a long vowel or diphthong`);
          } else {
            reasons.mn.push(`«${prev.text}» урт эгшиг, хос эгшгээр төгсөөгүй`);
            reasons.en.push(`«${prev.text}» does not end in a long vowel or diphthong`);
          }
        }
        if (vowel !== curVowel) {
          reasons.mn.push(`«${prev.text}» ${cls === 'back' ? 'эр' : 'эм'} үг`);
          reasons.en.push(`«${prev.text}» is a ${cls === 'back' ? 'back' : 'front'}-vowel word`);
        }
        // «юу» after front words is widespread in practice: warn, do not insist.
        const severity = cur === 'юу' && expected === 'юү' ? 'warning' : 'error';
        report({
          start: tok.start,
          end: tok.end,
          severity,
          message: {
            mn: `${reasons.mn.join(', ')} тул асуух сул үгийг «${expected}» гэж бичнэ.`,
            en: `${reasons.en.join(' and ')}, so the question particle is «${expected}».`,
          },
          suggestions: [matchCase(tok.text, expected)],
        });
      }
    },
  };

  function veBe(prevLower) {
    return /[мнв]$/.test(prevLower) ? 'бэ' : 'вэ';
  }

  const veBeRule = {
    id: 've-be',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Асуух сул үг вэ/бэ', en: 'Question particle вэ/бэ' },
    description: {
      mn: 'м, н, в үсгээр төгссөн үгийн дараа «бэ», бусад үгийн дараа «вэ» бичнэ.',
      en: 'Write «бэ» after words ending in м, н, в and «вэ» after all other words.',
    },
    examples: [['Юу бэ?', 'Юу вэ?'], ['Хэн вэ?', 'Хэн бэ?'], ['Яах юм вэ?', 'Яах юм бэ?']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (tok.lower !== 'вэ' && tok.lower !== 'бэ') continue;
        const prev = prevWordInline(doc, tok);
        if (!prev || !prev.clean || prev.isAllCaps) continue;
        const expected = veBe(prev.lower);
        if (expected === tok.lower) continue;
        report({
          start: tok.start,
          end: tok.end,
          message: {
            mn: `«${prev.text}» ${expected === 'бэ' ? 'м, н, в үсгийн аль нэгээр төгссөн' : 'м, н, в үсгээр төгсөөгүй'} тул «${expected}» гэж бичнэ.`,
            en: `«${prev.text}» ${expected === 'бэ' ? 'ends' : 'does not end'} in м, н or в, so write «${expected}».`,
          },
          suggestions: [matchCase(tok.text, expected)],
        });
      }
    },
  };

  // Particles that must be written apart from the preceding word.
  const INTERROGATIVES = 'хэн|юу|хаана|хэзээ|ямар|яагаад|хэд|хэдэн|хэдий|аль|хаа|яаж|яах|хэчнээн|юунд|хэнд|хаашаа|хаанаас|хэнийг|юуг|хэний|юуны|хэрхэн|хэнтэй|юугаар';
  const GLUED_CH = new RegExp(`^(${INTERROGATIVES})(ч)$`);
  const GLUED_VE = new RegExp(`^(${INTERROGATIVES})(вэ|бэ)$`);
  const GLUED_Q_SHORT = /^(.{2,}[аэоө])(уу|үү)$/;
  const GLUED_Q_LONG = /^(.{2,}(?:аа|оо|ээ|өө|ай|ой|уй|эй|үй|ий))(юу|юү)$/;
  const GREETINGS = { 'сайнуу': 'сайн уу', 'сайнбайнауу': 'сайн байна уу', 'сайнбайнуу': 'сайн байна уу' };

  const particleSpacing = {
    id: 'particle-spacing',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Сул үгийг тусад нь бичих', en: 'Particles written separately' },
    description: {
      mn: 'ч, уу/үү/юу/юү, вэ/бэ зэрэг сул үгийг өмнөх үгээс нь тусад нь бичнэ: ямар ч, байна уу, юу вэ.',
      en: 'Particles such as ч, уу/үү/юу/юү and вэ/бэ are separate words: ямар ч, байна уу, юу вэ.',
    },
    examples: [['ямарч', 'ямар ч'], ['байнауу?', 'байна уу?'], ['юувэ?', 'юу вэ?']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean) continue;
        const w = tok.lower;
        let split = null;
        let m;
        if (GREETINGS[w]) split = GREETINGS[w];
        else if ((m = GLUED_CH.exec(w))) split = `${m[1]} ч`;
        else if ((m = GLUED_VE.exec(w))) split = `${m[1]} ${/[мнв]$/.test(m[1]) ? 'бэ' : 'вэ'}`;
        else if (isQuestionMark(nextToken(doc, tok, true))) {
          if ((m = GLUED_Q_SHORT.exec(w)) || (m = GLUED_Q_LONG.exec(w))) split = `${m[1]} ${m[2]}`;
        }
        if (!split) continue;
        const particle = split.slice(split.lastIndexOf(' ') + 1);
        report({
          start: tok.start,
          end: tok.end,
          message: {
            mn: `«${particle}» сул үгийг өмнөх үгээс нь тусад нь бичнэ.`,
            en: `The particle «${particle}» is written as a separate word.`,
          },
          suggestions: [matchCase(tok.text, split)],
        });
      }
    },
  };

  const negationSpacing = {
    id: 'negation-spacing',
    category: 'spelling',
    severity: 'error',
    title: { mn: '-гүй нөхцлийг залгаж бичих', en: 'Attaching -гүй' },
    description: {
      mn: 'Үгүйсгэх «-гүй» нь нөхцөл тул үгтэйгээ залгаж бичнэ: мэдэхгүй, байхгүй.',
      en: 'The negative «-гүй» is a suffix and is attached to the word: мэдэхгүй, байхгүй.',
    },
    examples: [['мэдэх гүй', 'мэдэхгүй']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (tok.lower !== 'гүй') continue;
        const prev = prevWordInline(doc, tok);
        if (!prev || !prev.clean || prev.lower.length < 3 || !prev.lower.endsWith('х')) continue;
        report({
          start: prev.end,
          end: tok.end,
          message: {
            mn: `Үгүйсгэх «-гүй» нөхцлийг үгтэй нь залгаж бичнэ: «${prev.text}${tok.text}».`,
            en: `Attach the negative suffix «-гүй» to the word: «${prev.text}${tok.text}».`,
          },
          suggestions: [tok.text],
        });
      }
    },
  };

  __exports.default = [questionParticle, veBeRule, particleSpacing, negationSpacing];
    __exports.veBe = veBe;
});

__define("rules/hyphenation.js", function (__require, __exports) {
  // Hyphens and spaces between numerals, abbreviations, Latin words and the
  // Mongolian suffixes attached to them (2015-ийн, АНУ-ын, Facebook-ээр).

  const { charKind } = __require("text.js");
  const { ATTACHED_SUFFIXES } = __require("suffixes.js");
  const { CYRILLIC_TO_LATIN, LATIN_TO_CYRILLIC, LEGACY_LETTERS } = __require("alphabet.js");
  // Single letters that are also units or class letters after a number
  // (5г = 5 grams, 10т = 10 tons): too ambiguous to ask for a hyphen.
  const AMBIGUOUS_AFTER_NUMBER = new Set(['г', 'т', 'н', 'ы']);

  // Units of measure: a space before them is a typographic convention.
  const UNITS = new Set([
    'кг', 'гр', 'мг', 'тн', 'км', 'см', 'мм', 'мкм', 'нм', 'га', 'мл', 'кв', 'квт', 'мвт', 'вт', 'кал', 'ккал',
    'мин', 'сек', 'мкв', 'мбит', 'гб', 'мб',
  ]);
  // Mixed-case units that look like an abbreviation with a suffix.
  const MIXED_UNITS = new Set(['МВт', 'ГВт', 'ТВт', 'кВт', 'КВт', 'мВт', 'МВА', 'кВА', 'МГц', 'ГГц', 'кГц', 'МДж', 'ГДж', 'кДж', 'МБ', 'ГБ', 'ТБ', 'КБ']);

  const numeralSuffix = {
    id: 'numeral-suffix',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Тоо ба нөхцөлийн зураас', en: 'Hyphen after numerals' },
    description: {
      mn: 'Цифрээр бичсэн тоонд нөхцөл зураасаар залгана (2024-ийн, 5-аас, 1-р), харин үгийг тооноос зайгаар тусгаарлана.',
      en: 'Suffixes attach to digits with a hyphen (2024-ийн, 5-аас, 1-р); separate words are written after a space.',
    },
    examples: [['2024ийн', '2024-ийн'], ['5аас', '5-аас'], ['1р', '1-р'], ['2015онд', '2015 онд']],
    check(doc, report) {
      const { tokens } = doc;
      for (let i = 0; i < tokens.length - 1; i++) {
        const num = tokens[i];
        if (num.type !== 'num') continue;
        let next = tokens[i + 1];
        let percent = null;
        if (next.type === 'punct' && next.text === '%') {
          percent = next;
          next = tokens[i + 2];
        }
        if (!next || next.type !== 'word' || !next.clean || next.start !== (percent || num).end) continue;
        const w = next.text;
        const lower = next.lower;
        const head = doc.text.slice(num.start, next.start);
        if (ATTACHED_SUFFIXES.has(lower) && w === lower && !AMBIGUOUS_AFTER_NUMBER.has(lower)) {
          report({
            start: num.start,
            end: next.end,
            message: {
              mn: `Тоонд нөхцөл залгахдаа зураас тавина: «${head}-${w}».`,
              en: `Use a hyphen between the number and the suffix: «${head}-${w}».`,
            },
            suggestions: [`${head}-${w}`],
          });
        } else if (lower.length >= 2 && !percent && !next.isAllCaps) {
          // (All-caps words after digits are model codes: 2ТЭ116УМ.)
          const unit = UNITS.has(lower);
          report({
            start: num.start,
            end: next.end,
            severity: unit ? 'suggestion' : 'warning',
            message: unit
              ? { mn: 'Тоо болон хэмжих нэгж, тооны нэрийн хооронд зай авна.', en: 'Put a space between a number and its unit.' }
              : { mn: 'Тоо болон үгийн хооронд зай дутуу байна.', en: 'Missing space between the number and the word.' },
            suggestions: [`${head} ${w}`],
          });
        }
      }
    },
  };

  const abbreviationSuffix = {
    id: 'abbreviation-suffix',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Товчилсон үгийн зураас', en: 'Hyphen after abbreviations' },
    description: {
      mn: 'Том үсгээр товчилсон үгэнд нөхцөл зураасаар залгана: АНУ-ын, УИХ-д, НҮБ-аас.',
      en: 'Suffixes attach to capital-letter abbreviations with a hyphen: АНУ-ын, УИХ-д, НҮБ-аас.',
    },
    examples: [['АНУын', 'АНУ-ын'], ['УИХд', 'УИХ-д']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean || MIXED_UNITS.has(tok.text)) continue;
        const m = /^([А-ЯЁӨҮ]{2,})([а-яёөү]+)$/.exec(tok.text);
        if (!m || !ATTACHED_SUFFIXES.has(m[2])) continue;
        const fix = `${m[1]}-${m[2]}`;
        report({
          start: tok.start,
          end: tok.end,
          message: {
            mn: `Товчилсон үгэнд нөхцөл залгахдаа зураас тавина: «${fix}».`,
            en: `Use a hyphen between the abbreviation and the suffix: «${fix}».`,
          },
          suggestions: [fix],
        });
      }
    },
  };

  // Splits a word into runs of Latin and Cyrillic letters.
  function scriptRuns(text) {
    const runs = [];
    for (const ch of text) {
      const kind = charKind(ch);
      const script = kind === 'lat' && !LEGACY_LETTERS[ch] ? 'lat' : kind === 'mn' ? 'mn' : 'other';
      const last = runs[runs.length - 1];
      if (last && last.script === script) last.text += ch;
      else runs.push({ script, text: ch });
    }
    return runs;
  }

  const latinBoundary = {
    id: 'latin-suffix',
    category: 'spelling',
    severity: 'warning',
    title: { mn: 'Латин үг ба нөхцөл', en: 'Latin words with Mongolian suffixes' },
    description: {
      mn: 'Латин үсгээр бичсэн үгэнд монгол нөхцөлийг зураасаар залгана (Facebook-ээр), үгсийг зайгаар тусгаарлана.',
      en: 'Mongolian suffixes attach to Latin-script words with a hyphen (Facebook-ээр); separate words need a space.',
    },
    examples: [['Facebookээр', 'Facebook-ээр'], ['Googleийн', 'Google-ийн'], ['Stargateхүч', 'Stargate хүч']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.kinds.lat || !tok.kinds.mn || tok.kinds.legacy || tok.kinds.other) continue;
        const runs = scriptRuns(tok.text);
        if (runs.length !== 2) continue;
        const [a, b] = runs;
        // Look-alike letters are the mixed-script rule's business.
        const pure = (run, map) => [...run.text].every((ch) => map[ch]);
        if (a.script === 'lat' && b.script === 'mn') {
          const suffix = ATTACHED_SUFFIXES.has(b.text.toLowerCase()) && b.text === b.text.toLowerCase();
          if (pure(a, LATIN_TO_CYRILLIC) || (!suffix && pure(b, CYRILLIC_TO_LATIN)) || a.text.length < 2) continue;
          const fix = suffix ? `${a.text}-${b.text}` : `${a.text} ${b.text}`;
          report({
            start: tok.start,
            end: tok.end,
            severity: suffix ? 'error' : 'warning',
            message: suffix
              ? { mn: `Латин үгэнд монгол нөхцөлийг зураасаар залгана: «${fix}».`, en: `Attach the Mongolian suffix to the Latin word with a hyphen: «${fix}».` }
              : { mn: 'Латин болон кирилл үгийн хооронд зай дутуу байна.', en: 'Missing space between the Latin and the Cyrillic word.' },
            suggestions: [fix],
          });
        } else if (a.script === 'mn' && b.script === 'lat') {
          if (pure(b, LATIN_TO_CYRILLIC) || pure(a, CYRILLIC_TO_LATIN) || a.text.length < 2 || b.text.length < 2) continue;
          report({
            start: tok.start,
            end: tok.end,
            message: { mn: 'Кирилл болон латин үгийн хооронд зай дутуу байна.', en: 'Missing space between the Cyrillic and the Latin word.' },
            suggestions: [`${a.text} ${b.text}`],
          });
        }
      }
    },
  };

  // Official names written with a hyphen.
  const HYPHENATED_NAMES = [
    ['Говь', 'Алтай'], ['Баян', 'Өлгий'], ['Дархан', 'Уул'],
  ];
  // «Говь Алтай» (space, capital), «Говьалтай» (glued) or «Говь-алтай»;
  // never the correct «Говь-Алтай».
  const NAME_RE = HYPHENATED_NAMES.map(([a, b]) => ({
    re: new RegExp(`(?<![\\p{L}-])${a}(?:[ \\t]+${b}|-?${b.toLowerCase()}|${b})`, 'gu'),
    fix: `${a}-${b}`,
  }));

  const hyphenatedNames = {
    id: 'hyphenated-name',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Зураастай нэр', en: 'Hyphenated names' },
    description: {
      mn: 'Говь-Алтай, Баян-Өлгий, Дархан-Уул аймгийн нэрийг зураасаар холбож бичнэ.',
      en: 'The province names Говь-Алтай, Баян-Өлгий and Дархан-Уул are written with a hyphen.',
    },
    examples: [['Говь Алтай', 'Говь-Алтай'], ['Баянөлгий', 'Баян-Өлгий']],
    check(doc, report) {
      for (const { re, fix } of NAME_RE) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(doc.text))) {
          const end = m.index + m[0].length;
          report({
            start: m.index,
            end,
            message: { mn: `Аймгийн нэрийг зураасаар холбож бичнэ: «${fix}».`, en: `The province name is written with a hyphen: «${fix}».` },
            suggestions: [fix],
          });
        }
      }
    },
  };

  __exports.default = [numeralSuffix, abbreviationSuffix, latinBoundary, hyphenatedNames];

});

__define("rules/spelling.js", function (__require, __exports) {
  // Spelling: soft sign, tripled letters, и/й at the end of a word and a
  // curated list of frequent misspellings (checked against a news corpus).

  const { matchCase } = __require("text.js");
  const softSign = {
    id: 'soft-sign',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Зөөлний тэмдэг', en: 'Soft sign' },
    description: {
      mn: 'Зөөлний тэмдэг (ь)-ээр төгссөн үгэнд «и»-ээр эхэлсэн нөхцөл залгахад «ь» гээгдэнэ: хууль → хуулийн.',
      en: 'When a suffix starting with «и» follows a soft sign, the soft sign is dropped: хууль → хуулийн.',
    },
    examples: [['хуульийн', 'хуулийн'], ['хувьиар', 'хувиар'], ['тавьиж', 'тавьж']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean) continue;
        const re = /ь(и)(й)?/g;
        let m;
        while ((m = re.exec(tok.lower))) {
          // Russian names keep «ьи» (Ильич); only the -ийн/-ийг type is certain there.
          if (!m[2] && tok.isCap) continue;
          const next = tok.lower[m.index + 2];
          const start = tok.start + m.index;
          // -ж/-ч converbs keep the soft sign: тавьиж → тавьж.
          const dropI = !m[2] && (next === 'ж' || next === 'ч');
          const fix = dropI ? tok.text[m.index] : tok.text[m.index + 1];
          const word = tok.text.slice(0, m.index) + fix + tok.text.slice(m.index + 2);
          report({
            start,
            end: start + 2,
            message: dropI
              ? { mn: `«-ж» нөхцлийн өмнө «и» бичихгүй: «${word}».`, en: `No «и» before the suffix «-ж»: «${word}».` }
              : { mn: `«и»-ийн өмнө зөөлний тэмдэг (ь) гээгдэнэ: «${word}».`, en: `The soft sign is dropped before «и»: «${word}».` },
            suggestions: [fix],
          });
        }
      }
    },
  };

  const tripleLetter = {
    id: 'triple-letter',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Гурвалсан үсэг', en: 'Tripled letter' },
    description: {
      mn: 'Монгол үгэнд нэг үсэг дараалан гурав бичигддэггүй: хороооны → хорооны.',
      en: 'No Mongolian word has the same letter three times in a row: хороооны → хорооны.',
    },
    examples: [['хороооны', 'хорооны'], ['ажилллаж', 'ажиллаж']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.isMongolian || tok.isAllCaps) continue;
        const re = /(\p{L})\1\1+/gu;
        let m;
        while ((m = re.exec(tok.text))) {
          // Interjections (ааа, ммм) and capitals (ХХХ = Roman 30) are fine.
          if (m[0].length === tok.text.length || m[1] !== m[1].toLowerCase()) continue;
          const start = tok.start + m.index;
          report({
            start,
            end: start + m[0].length,
            message: { mn: `«${m[1]}» үсэг илүү бичигдсэн байна.`, en: `The letter «${m[1]}» is typed too many times.` },
            suggestions: [m[1] + m[1]],
          });
        }
      }
    },
  };

  // The negative suffix is always -гүй, also in back words (байхгүй, явсангүй).
  const negativeSuffix = {
    id: 'negative-suffix',
    category: 'spelling',
    severity: 'error',
    title: { mn: '-гүй нөхцлийн үсэг', en: 'Spelling of -гүй' },
    description: {
      mn: 'Үгүйсгэх нөхцөл эр, эм аль ч үгэнд «-гүй» хэвээр бичигдэнэ: байхгүй, ирээгүй.',
      en: 'The negative suffix is always «-гүй», in back and front words alike: байхгүй, ирээгүй.',
    },
    examples: [['байхгуй', 'байхгүй'], ['ирээгуй', 'ирээгүй']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean) continue;
        const re = /(?:х|аа|ээ|оо|өө|сан|сэн|сон|сөн)(гуй)/g;
        let m;
        while ((m = re.exec(tok.lower))) {
          const start = tok.start + m.index + m[0].length - 3;
          const fix = tok.text.slice(start - tok.start, start - tok.start + 3).replace(/у/, 'ү').replace(/У/, 'Ү');
          report({
            start,
            end: start + 3,
            message: { mn: 'Үгүйсгэх нөхцөлийг үргэлж «-гүй» гэж бичнэ.', en: 'The negative suffix is always written «-гүй».' },
            suggestions: [fix],
          });
        }
      }
    },
  };

  const finalI = {
    id: 'final-i',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Хос эгшгийн й', en: 'Diphthong й' },
    description: {
      mn: 'Хос эгшгийг «й»-гээр бичнэ: тухаи → тухай, холбоотои → холбоотой.',
      en: 'Diphthongs end in «й», not «и»: тухаи → тухай, холбоотои → холбоотой.',
    },
    examples: [['тухаи', 'тухай'], ['хэрэгтэи', 'хэрэгтэй']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean || tok.isCap || tok.text.length < 4) continue;
        if (!/[аоуэөүё]и$/.test(tok.text)) continue;
        const word = `${tok.text.slice(0, -1)}й`;
        report({
          start: tok.end - 1,
          end: tok.end,
          message: { mn: `Хос эгшгийг «й»-гээр бичнэ: «${word}».`, en: `Write the diphthong with «й»: «${word}».` },
          suggestions: ['й'],
        });
      }
    },
  };

  // Frequent misspellings: exact word forms (lowercase) and their corrections.
  const WORDS = {
    'хуль': 'хууль', 'үггүй': 'үгүй', 'өнөдөр': 'өнөөдөр', 'аюулгуй': 'аюулгүй', 'дургуй': 'дургүй',
    'буруулах': 'бууруулах', 'мэдээллэв': 'мэдээлэв', 'яллагдсан': 'ялагдсан', 'яллагдаж': 'ялагдаж',
    'байгууллагдсан': 'байгуулагдсан', 'байгууллагдах': 'байгуулагдах', 'байгууллагдаж': 'байгуулагдаж',
    'байгууллалт': 'байгуулалт', 'байгууллалтын': 'байгуулалтын', 'хичээлэх': 'хичээллэх', 'хороолын': 'хорооллын',
    'хиллийн': 'хилийн', 'тээгээд': 'тэгээд', 'болгооно': 'болгоно', 'хэдхээн': 'хэдхэн', 'олоон': 'олон',
    'сайхаан': 'сайхан', 'ооны': 'оны', 'цааг': 'цаг', 'цаагаар': 'цагаар', 'мээдээ': 'мэдээ', 'мэддэгүй': 'мэддэггүй',
    'боловсронгүй': 'боловсронгуй', 'хуний': 'хүний', 'хучний': 'хүчний', 'угийг': 'үгийг', 'зуйн': 'зүйн',
    'хусч': 'хүсч', 'байсаан': 'байсан', 'болсоон': 'болсон', 'явсаан': 'явсан', 'хийссэн': 'хийсэн', 'өгссөн': 'өгсөн',
    'гаарч': 'гарч', 'гаарсан': 'гарсан', 'гаарах': 'гарах', 'эхэлээ': 'эхэллээ', 'тодруулаа': 'тодрууллаа',
    'амжилтай': 'амжилттай', 'хангалтай': 'хангалттай', 'нээлтэй': 'нээлттэй', 'хөнгөлөлтэй': 'хөнгөлөлттэй',
    'зориулалтай': 'зориулалттай', 'оруулалтай': 'оруулалттай', 'байнгийн': 'байнгын', 'байгалын': 'байгалийн',
    'валютийн': 'валютын', 'туршилтийн': 'туршилтын', 'хайгуулийн': 'хайгуулын', 'торгуулын': 'торгуулийн',
    'менежментын': 'менежментийн', 'менежмэнт': 'менежмент', 'менежмэнтийн': 'менежментийн', 'системын': 'системийн',
    'системыг': 'системийг', 'медалын': 'медалийн', 'медалыг': 'медалийг', 'бизнэс': 'бизнес', 'бизнесс': 'бизнес',
    'бизнессийн': 'бизнесийн', 'професор': 'профессор', 'клүб': 'клуб', 'сүпер': 'супер',
    'арванэгдүгээр': 'арваннэгдүгээр', 'яриж': 'ярьж', 'яридаг': 'ярьдаг', 'ярисан': 'ярьсан', 'бариж': 'барьж',
    'барисан': 'барьсан', 'баридаг': 'барьдаг', 'тавиж': 'тавьж', 'тавидаг': 'тавьдаг', 'тависан': 'тавьсан',
    'хөгжилийн': 'хөгжлийн', 'хөгжилийг': 'хөгжлийг', 'ажилын': 'ажлын', 'ажилаас': 'ажлаас', 'нийгэмийн': 'нийгмийн',
    'засагийн': 'засгийн', 'үндэсийн': 'үндэсний', 'мэдээлэлийн': 'мэдээллийн', 'мэдээлэлийг': 'мэдээллийг',
    'баярлала': 'баярлалаа', 'баярлаллаа': 'баярлалаа', 'уучилаарай': 'уучлаарай', 'сургуль': 'сургууль',
    'сургулийн': 'сургуулийн', 'хүүхед': 'хүүхэд', 'мэдээлел': 'мэдээлэл', 'ерөнхийлогч': 'ерөнхийлөгч',
    'улаанбатаар': 'Улаанбаатар', 'уланбаатар': 'Улаанбаатар', 'улаанбатар': 'Улаанбаатар', 'туух': 'түүх',
  };
  // Misspelled beginnings of whole word families.
  const PREFIXES = [
    // байгууллага (organization) has a double л; байгуулагч, байгуулагдах do not.
    [/^байгуулаг(?=а|ы|у|ий)/, 'байгууллаг'],
    // ажиллах (to work) has a double л; the noun ажил (work) does not.
    [/^ажила(?=ж|х|ад|гаа|на|лаа|рай|я|ч|сан|даг)/, 'ажилла'],
    [/^ажил(?=сан$|даг|на$)/, 'ажилла'],
    [/^ажилуул/, 'ажиллуул'],
    [/^мэдээлий/, 'мэдээллий'],
  ];

  function knownMisspelling(lower) {
    if (Object.prototype.hasOwnProperty.call(WORDS, lower)) return WORDS[lower];
    for (const [re, rep] of PREFIXES) {
      if (re.test(lower)) return lower.replace(re, rep);
    }
    return null;
  }

  const commonMisspelling = {
    id: 'common-misspelling',
    category: 'spelling',
    severity: 'error',
    title: { mn: 'Түгээмэл алдаа', en: 'Common misspelling' },
    description: {
      mn: 'Олон хүний байнга андуурдаг үгсийн жагсаалт: байгуулага → байгууллага, ажилсан → ажилласан.',
      en: 'A list of frequently misspelled words: байгуулага → байгууллага, ажилсан → ажилласан.',
    },
    examples: [['байгуулагын', 'байгууллагын'], ['амжилтай', 'амжилттай'], ['өнөдөр', 'өнөөдөр']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!tok.clean) continue;
        const fixed = knownMisspelling(tok.lower);
        if (!fixed) continue;
        const word = fixed[0] !== fixed[0].toLowerCase() ? fixed : matchCase(tok.text, fixed);
        report({
          start: tok.start,
          end: tok.end,
          message: { mn: `Зөв бичих дүрмээр «${word}» гэж бичнэ.`, en: `The correct spelling is «${word}».` },
          suggestions: [word],
        });
      }
    },
  };

  __exports.default = [softSign, tripleLetter, negativeSuffix, finalI, commonMisspelling];
    __exports.knownMisspelling = knownMisspelling;
});

__define("rules/punctuation.js", function (__require, __exports) {
  // Punctuation and spacing.

  // Lowercase abbreviations that end with a period inside a sentence.
  const ABBREVIATIONS = new Set([
    'ам', 'тн', 'кг', 'км', 'см', 'мм', 'мл', 'мг', 'гр', 'га', 'кв', 'проф', 'доц', 'акад', 'др', 'ген', 'хош',
    'маг', 'бак', 'док', 'гав', 'зурж', 'хуу', 'тэрб', 'жнь', 'нь', 'тм', 'гм', 'хэв', 'боть', 'зүйл', 'дэд', 'хх',
    'мянг', 'тэр', 'дүүр', 'хор', 'хот', 'аймг', 'сум', 'баг', 'хэс', 'зам', 'гудамж', 'бай', 'тоот', 'утас', 'факс',
    'ж', 'т', 'м', 'г', 'д', 'х', 'н', 'с', 'а', 'б', 'в', 'э', 'ш', 'ц',
  ]);
  // Words that follow quoted speech and stay lowercase after ?, ! or a period.
  const AFTER_QUOTE = new Set([
    'гэж', 'гэсэн', 'гэх', 'гээд', 'гэдэг', 'гэдгийг', 'гэвэл', 'хэмээн', 'хэмээх', 'гэлээ', 'гэв', 'гэжээ', 'гэнэ',
    'гэлцэв', 'гэлцэж', 'гэхэд', 'гэдгээ', 'гэлцэнэ', 'гэсээр', 'гэснийг', 'гэдгээр', 'гэх мэт', 'гэхчлэн', 'гэлгүй',
  ]);

  const SPACE_BEFORE = new Set([',', '.', ';', ':', '!', '?']);
  const DOMAINS = new Set(['ком', 'мн', 'нет', 'орг', 'инфо', 'гов']);

  const spaceBeforePunct = {
    id: 'space-before-punct',
    category: 'punctuation',
    severity: 'error',
    title: { mn: 'Цэг тэмдгийн өмнөх зай', en: 'Space before punctuation' },
    description: {
      mn: 'Цэг, таслал, асуултын тэмдэг зэргийн өмнө зай авахгүй.',
      en: 'No space goes before a period, comma, question mark and similar marks.',
    },
    examples: [['Сайн байна уу ?', 'Сайн байна уу?'], ['ном , дэвтэр', 'ном, дэвтэр']],
    check(doc, report) {
      const { tokens } = doc;
      for (let i = 1; i < tokens.length - 1; i++) {
        const sp = tokens[i];
        const prev = tokens[i - 1];
        const p = tokens[i + 1];
        if (sp.type !== 'space' || sp.text.includes('\n') || p.type !== 'punct' || !SPACE_BEFORE.has(p.text)) continue;
        if (prev.type !== 'word' && prev.type !== 'num') continue;
        // Ellipsis, also spaced: «тэгээд ...», «би . . .».
        if (p.text === '.' && /^\.|^ \./.test(doc.text.slice(p.end, p.end + 2))) continue;
        report({
          start: sp.start,
          end: sp.end,
          message: {
            mn: `«${p.text}» тэмдгийн өмнө зай авахгүй.`,
            en: `No space before «${p.text}».`,
          },
          suggestions: [''],
        });
      }
    },
  };

  const OPEN_SPACE = new Set(['(', '[', '«']);
  const CLOSE_SPACE = new Set([')', ']', '»']);

  const spaceInsideBrackets = {
    id: 'space-inside-brackets',
    category: 'punctuation',
    severity: 'suggestion',
    title: { mn: 'Хаалт, хашилтын доторх зай', en: 'Space inside brackets' },
    description: {
      mn: 'Хаалт, хашилтын дотор талд зай авахгүй: (жишээ), «жишээ».',
      en: 'No spaces just inside brackets and guillemets: (example), «example».',
    },
    examples: [['( жишээ )', '(жишээ)']],
    check(doc, report) {
      const { tokens } = doc;
      const isText = (t) => t && (t.type === 'word' || t.type === 'num');
      for (let i = 1; i < tokens.length - 1; i++) {
        const sp = tokens[i];
        if (sp.type !== 'space' || sp.text.includes('\n')) continue;
        const a = tokens[i - 1];
        const b = tokens[i + 1];
        let mark = null;
        if (a.type === 'punct' && OPEN_SPACE.has(a.text) && isText(b)) mark = { mn: `«${a.text}» тэмдгийн дараа`, en: `after «${a.text}»` };
        else if (b.type === 'punct' && CLOSE_SPACE.has(b.text) && isText(a)) mark = { mn: `«${b.text}» тэмдгийн өмнө`, en: `before «${b.text}»` };
        if (!mark) continue;
        report({
          start: sp.start,
          end: sp.end,
          message: { mn: `${mark.mn} зай авахгүй.`, en: `No space ${mark.en}.` },
          suggestions: [''],
        });
      }
    },
  };

  const spaceAfterPunct = {
    id: 'space-after-punct',
    category: 'punctuation',
    severity: 'error',
    title: { mn: 'Цэг тэмдгийн дараах зай', en: 'Space after punctuation' },
    description: {
      mn: 'Таслал, цэг, асуулт, анхаарлын тэмдгийн дараа зай авна.',
      en: 'A space follows commas, periods, question and exclamation marks.',
    },
    examples: [['ном,дэвтэр', 'ном, дэвтэр'], ['байна.Тэр', 'байна. Тэр']],
    check(doc, report) {
      const { tokens } = doc;
      for (let i = 1; i < tokens.length - 1; i++) {
        const p = tokens[i];
        const prev = tokens[i - 1];
        const next = tokens[i + 1];
        if (p.type !== 'punct' || prev.type !== 'word' || next.type !== 'word') continue;
        if (!prev.isMongolian && !next.isMongolian) continue; // web addresses, Latin text
        let ok = false;
        if (p.text === ',' || p.text === ';') ok = true;
        else if (p.text === '?' || p.text === '!') ok = true;
        else if (p.text === ':') ok = prev.isMongolian;
        else if (p.text === '.') {
          // Only a clear sentence boundary: «...байна.Тэр». Initials (Б.Болд,
          // ажилтанП.Гантөмөр), abbreviations (ам.доллар) and web addresses
          // (ЛинкэдИн.ком) keep the dot attached.
          ok = prev.isMongolian && next.isMongolian && !ABBREVIATIONS.has(prev.lower) && !prev.isAllCaps &&
            !/\p{Lu}$/u.test(prev.text) && !DOMAINS.has(next.lower) &&
            ((next.isCap && prev.text.length >= 2 && !prev.isCap) || (!next.isCap && prev.text.length >= 3));
        }
        if (!ok) continue;
        report({
          start: p.start,
          end: p.end,
          message: { mn: `«${p.text}» тэмдгийн дараа зай авна.`, en: `Add a space after «${p.text}».` },
          suggestions: [`${p.text} `],
        });
      }
    },
  };

  const repeatedPunct = {
    id: 'repeated-punct',
    category: 'punctuation',
    severity: 'error',
    title: { mn: 'Давхардсан цэг тэмдэг', en: 'Repeated punctuation' },
    description: {
      mn: 'Таслал, цэгтэй таслал, хоёр цэгийг давхарлахгүй; хоёр цэг (..) бол алдаа.',
      en: 'Commas, semicolons and colons are not doubled; two periods (..) are a typo.',
    },
    examples: [['ном,, дэвтэр', 'ном, дэвтэр'], ['Тийм..', 'Тийм.']],
    check(doc, report) {
      // «..» is often a deliberate short ellipsis, so it is only a suggestion.
      const re = /,(?:\s*,)+|;;+|::+|(?<![.\s])\.\.(?![.?!])/g;
      let m;
      while ((m = re.exec(doc.text))) {
        const first = m[0][0];
        report({
          start: m.index,
          end: m.index + m[0].length,
          severity: first === '.' ? 'suggestion' : 'error',
          message: { mn: 'Цэг тэмдэг давхардсан байна.', en: 'Repeated punctuation mark.' },
          suggestions: first === '.' ? ['.', '…'] : [first],
        });
      }
    },
  };

  const PAIRS = { '(': ')', '[': ']', '{': '}', '«': '»' };
  const CLOSERS = { ')': '(', ']': '[', '}': '{', '»': '«' };
  const DOUBLE_QUOTES = new Set(['"', '“', '”', '„', '‟', '″']);

  const unbalanced = {
    id: 'unbalanced-brackets',
    category: 'punctuation',
    severity: 'warning',
    title: { mn: 'Хаагдаагүй хаалт, хашилт', en: 'Unbalanced brackets and quotes' },
    description: {
      mn: 'Нээсэн хаалт, хашилт бүрийг хаана.',
      en: 'Every opening bracket or quotation mark needs a closing one.',
    },
    examples: [['(жишээ', '(жишээ)'], ['«Монгол', '«Монгол»']],
    check(doc, report) {
      const { text } = doc;
      let offset = 0;
      for (const line of text.split('\n')) {
        const stack = [];
        const closersWithoutOpen = [];
        // Double quotes come in many shapes (“ ” „ "); they simply alternate.
        let quoteOpen = -1;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (PAIRS[ch]) {
            stack.push({ ch, i });
          } else if (CLOSERS[ch]) {
            let j = stack.length - 1;
            while (j >= 0 && stack[j].ch !== CLOSERS[ch]) j--;
            if (j >= 0) stack.splice(j, 1);
            else if (!(ch === ')' && isListMarker(line, i))) closersWithoutOpen.push({ ch, i });
          } else if (DOUBLE_QUOTES.has(ch)) {
            quoteOpen = quoteOpen < 0 ? i : -1;
          }
        }
        const isQuote = (ch) => ch === '«' || ch === '»' || DOUBLE_QUOTES.has(ch);
        if (quoteOpen >= 0) {
          // An odd quote that looks like a closing one has lost its opening pair.
          if (line[quoteOpen] === '”') closersWithoutOpen.push({ ch: '”', i: quoteOpen });
          else stack.push({ ch: line[quoteOpen], i: quoteOpen });
        }
        for (const { ch, i } of stack) {
          report({
            start: offset + i,
            end: offset + i + 1,
            message: isQuote(ch)
              ? { mn: 'Хашилт хаагдаагүй байна.', en: 'Quotation mark is never closed.' }
              : { mn: 'Хаалт хаагдаагүй байна.', en: 'Bracket is never closed.' },
          });
        }
        for (const { ch, i } of closersWithoutOpen) {
          report({
            start: offset + i,
            end: offset + i + 1,
            message: isQuote(ch)
              ? { mn: 'Хаах хашилтад тохирох нээх хашилт алга.', en: 'Closing quotation mark without an opening one.' }
              : { mn: 'Хаах хаалтад тохирох нээх хаалт алга.', en: 'Closing bracket without an opening one.' },
          });
        }
        offset += line.length + 1;
      }
    },
  };

  // «1)», «а)» at the start of a line or after a space: list markers.
  function isListMarker(line, i) {
    const before = line.slice(0, i);
    return /(^|\s)(\d{1,3}|\p{L})$/u.test(before) || /[:;]$/.test(before);
  }

  const doubleSpace = {
    id: 'double-space',
    category: 'punctuation',
    severity: 'suggestion',
    title: { mn: 'Илүү зай', en: 'Extra spaces' },
    description: { mn: 'Үгсийн хооронд нэг зай авна.', en: 'Use a single space between words.' },
    examples: [['сайн  байна', 'сайн байна']],
    check(doc, report) {
      const { tokens } = doc;
      for (let i = 1; i < tokens.length - 1; i++) {
        const t = tokens[i];
        if (t.type !== 'space' || !/^ {2,}$/.test(t.text)) continue;
        if (tokens[i + 1].type === 'punct' && tokens[i + 1].text !== '(' && tokens[i + 1].text !== '«') continue;
        report({
          start: t.start,
          end: t.end,
          message: { mn: 'Үгсийн хооронд илүү зай байна.', en: 'Extra spaces between words.' },
          suggestions: [' '],
        });
      }
    },
  };

  const sentenceCapital = {
    id: 'sentence-capital',
    category: 'punctuation',
    severity: 'warning',
    title: { mn: 'Өгүүлбэрийн эхний том үсэг', en: 'Capital letter after a period' },
    description: {
      mn: 'Цэгээр төгссөн өгүүлбэрийн дараах өгүүлбэрийг том үсгээр эхэлнэ.',
      en: 'A sentence that follows a period starts with a capital letter.',
    },
    examples: [['Сайн байна. тэр ирнэ.', 'Сайн байна. Тэр ирнэ.']],
    check(doc, report) {
      const { tokens } = doc;
      for (let i = 2; i < tokens.length - 2; i++) {
        const dot = tokens[i];
        if (dot.type !== 'punct' || dot.text !== '.') continue;
        const before = tokens[i - 1];
        const sp = tokens[i + 1];
        const word = tokens[i + 2];
        if (before.type !== 'word' || !before.isMongolian || before.text.length < 3 || before.isAllCaps) continue;
        if (ABBREVIATIONS.has(before.lower) || tokens[i - 2].text === '.') continue;
        if (sp.type !== 'space' || sp.text.includes('\n') || word.type !== 'word' || !word.isMongolian || word.isCap) continue;
        if (AFTER_QUOTE.has(word.lower)) continue;
        report({
          start: word.start,
          end: word.start + 1,
          message: { mn: 'Өгүүлбэрийг том үсгээр эхлүүлнэ.', en: 'Start the sentence with a capital letter.' },
          suggestions: [word.text[0].toUpperCase()],
        });
      }
    },
  };

  __exports.default = [spaceBeforePunct, spaceAfterPunct, spaceInsideBrackets, repeatedPunct, unbalanced, doubleSpace, sentenceCapital];
    __exports.ABBREVIATIONS = ABBREVIATIONS;
});

__define("rules/style.js", function (__require, __exports) {
  // Style: repeated words, official names, Roman numerals.

  const { prevWordInline, nextWordInline } = __require("text.js");
  // Words that are legitimately repeated (тус тус, өөр өөр, дахин дахин…).
  const REDUPLICATED = new Set([
    'тус', 'аль', 'өөр', 'дахин', 'том', 'олон', 'ямар', 'үе', 'хэн', 'сая', 'хэд', 'байн', 'нэг', 'гол', 'шинэ', 'юу',
    'ийм', 'тийм', 'бие', 'тал', 'давхар', 'хоёр', 'гурав', 'хэдэн', 'тас', 'сайхан', 'тэрбум', 'мянга', 'мянган', 'зуу',
    'жижиг', 'бага', 'их', 'хурдан', 'удаан', 'ойр', 'зарим', 'янз', 'хааяа', 'бөөн', 'тэр', 'энэ', 'хаа', 'хаана',
    'хэзээ', 'хаашаа', 'за', 'маш', 'тун', 'нэн', 'тэс', 'мөн', 'улам', 'өдөр', 'жил', 'сар', 'цаг', 'хоног', 'ширхэг',
    'тав', 'зургаа', 'долоо', 'найм', 'ес', 'арав', 'хорь', 'гуч', 'дөч', 'тавь', 'жар', 'дал', 'ная', 'ер', 'зуун',
    'ахин', 'дахиад', 'бас', 'тусдаа', 'хамт', 'хоёулаа', 'хойно', 'урд', 'дээр', 'доор', 'хажуу', 'цөөн', 'чимээгүй',
    'аажим', 'ааж', 'хэсэг', 'дэс', 'ялгаатай', 'янз', 'болж', 'алгуур', 'гэнэт', 'хүн',
  ]);
  // Function words that are never doubled on purpose. (юм юм "all sorts of
  // things", бий бий, болно болно are idiomatic in speech and not listed.)
  const NEVER_DOUBLED = new Set([
    'нь', 'бол', 'гэж', 'гэх', 'гэсэн', 'болон', 'ба', 'бөгөөд', 'буюу', 'эсвэл', 'ч', 'л', 'байна',
    'байсан', 'байх', 'байдаг', 'болох', 'тухай', 'зэрэг', 'хамгийн', 'нар', 'нарын', 'дээр', 'биш',
    'уу', 'үү', 'вэ', 'бэ', 'гэв', 'гэжээ', 'байв', 'байжээ', 'шүү', 'биз',
  ]);
  // Inflected forms are almost never repeated on purpose (оны оны, сарын сарын).
  const INFLECTED = /(ын|ийн|ы|ий|ыг|ийг|аас|ээс|оос|өөс|аар|ээр|оор|өөр|тай|тэй|той|сан|сэн|сон|сөн|лаа|лээ|лоо|лөө|жээ|чээ|на|нэ|но|нө)$/;

  const repeatedWord = {
    id: 'repeated-word',
    category: 'style',
    severity: 'warning',
    title: { mn: 'Давхардсан үг', en: 'Repeated word' },
    description: {
      mn: 'Нэг үг дараалан хоёр удаа бичигдсэн байна. Тус тус, өөр өөр зэрэг хэлц давталтыг алгасна.',
      en: 'The same word appears twice in a row. Idiomatic repetition such as тус тус and өөр өөр is ignored.',
    },
    examples: [['нь нь', 'нь'], ['оны оны', 'оны']],
    check(doc, report) {
      for (const tok of doc.words) {
        const prev = prevWordInline(doc, tok);
        if (!prev || !tok.isMongolian || tok.isCap || prev.lower !== tok.lower) continue;
        const w = tok.lower;
        if (REDUPLICATED.has(w)) continue;
        if (!NEVER_DOUBLED.has(w) && !(w.length >= 3 && INFLECTED.test(w))) continue;
        report({
          start: prev.end,
          end: tok.end,
          message: { mn: `«${tok.text}» үг давхардсан байна.`, en: `The word «${tok.text}» is repeated.` },
          suggestions: [''],
        });
      }
    },
  };

  // Official names whose every word is capitalized. The capture group is the
  // part that gets capitalized (inflected forms such as Хурлын included).
  const OFFICIAL = [
    { re: /(?<!\p{L})Монгол (улс)/gu, name: 'Монгол Улс' },
    { re: /(?<!\p{L})Улсын ([Ии]х [Хх]ур(?:ал|л))/gu, name: 'Улсын Их Хурал' },
  ];

  function capitalizeWords(s) {
    return s.replace(/(^|\s)(\p{L})/gu, (m, sp, ch) => sp + ch.toUpperCase());
  }

  const officialName = {
    id: 'official-name',
    category: 'style',
    severity: 'suggestion',
    title: { mn: 'Албан ёсны нэр', en: 'Official names' },
    description: {
      mn: '«Монгол Улс», «Улсын Их Хурал» зэрэг албан ёсны нэрийн үг бүрийг том үсгээр эхэлнэ.',
      en: 'Every word of official names such as «Монгол Улс» and «Улсын Их Хурал» is capitalized.',
    },
    examples: [['Монгол улсын', 'Монгол Улсын']],
    check(doc, report) {
      for (const { re, name } of OFFICIAL) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(doc.text))) {
          const fixed = capitalizeWords(m[1]);
          if (fixed === m[1]) continue;
          const start = m.index + m[0].length - m[1].length;
          report({
            start,
            end: start + m[1].length,
            message: {
              mn: `Албан ёсны нэрийн үг бүрийг том үсгээр эхэлнэ: «${name}».`,
              en: `Each word of the official name is capitalized: «${name}».`,
            },
            suggestions: [fixed],
          });
        }
      }
    },
  };

  const CYR_ROMAN = { Х: 'X', І: 'I', С: 'C', М: 'M', У: 'V' };

  const romanNumeral = {
    id: 'roman-numeral',
    category: 'style',
    severity: 'suggestion',
    title: { mn: 'Ром тоо', en: 'Roman numerals' },
    description: {
      mn: 'Ром тоог латин үсгээр (X, V, I) бичнэ: XX зуун.',
      en: 'Roman numerals are written with Latin letters (X, V, I): XX зуун.',
    },
    examples: [['ХХ зуун', 'XX зуун']],
    check(doc, report) {
      for (const tok of doc.words) {
        if (!/^[ХІ]+$/.test(tok.text)) continue;
        const next = nextWordInline(doc, tok);
        if (!next || !/^зуу/.test(next.lower)) continue;
        const fix = [...tok.text].map((ch) => CYR_ROMAN[ch]).join('');
        report({
          start: tok.start,
          end: tok.end,
          message: {
            mn: `Ром тоог латин үсгээр бичнэ: «${fix}».`,
            en: `Write the Roman numeral with Latin letters: «${fix}».`,
          },
          suggestions: [fix],
        });
      }
    },
  };

  __exports.default = [repeatedWord, officialName, romanNumeral];

});

const api = __require('index.js');
if (typeof module === 'object' && module && module.exports) module.exports = api;
else root.MongolGrammar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
