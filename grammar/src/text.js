// Tokenizer and per-word analysis shared by all rules.

import {
  isMnLetter, isCyrillic, isLatin, isGreek, isUpper,
  LEGACY_LETTERS, LATIN_TO_CYRILLIC, GREEK_TO_CYRILLIC, INVISIBLE_CHARS, roughHarmony,
} from './alphabet.js';

const TOKEN_RE = /(\p{L}[\p{L}\p{M}­​-‍⁠﻿]*)|(\d+(?:[.,]\d+)*)|(\s+)|([\s\S])/gu;
const SENTENCE_END = new Set(['.', '!', '?', '…']);
const TRANSPARENT = new Set(['«', '»', '“', '”', '„', '"', "'", '(', ')', '[', ']', '‘', '’', '‹', '›', '-', '–', '—']);

// Classifies one character of a word.
//   mn: Mongolian Cyrillic letter, legacy: substitute for a Mongolian letter,
//   cyr: other Cyrillic, lat: Latin, grk: Greek, inv: invisible, other.
export function charKind(ch) {
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
export function normalizeCyrillicWord(word) {
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

export function tokenize(text) {
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
export function createDocument(text) {
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

export function prevToken(doc, tok, skipSpace = false) {
  for (let i = tok.index - 1; i >= 0; i--) {
    const t = doc.tokens[i];
    if (!skipSpace || t.type !== 'space') return t;
  }
  return null;
}

export function nextToken(doc, tok, skipSpace = false) {
  for (let i = tok.index + 1; i < doc.tokens.length; i++) {
    const t = doc.tokens[i];
    if (!skipSpace || t.type !== 'space') return t;
  }
  return null;
}

// The previous/next word when only plain spaces (no line break, no
// punctuation) separate it from `tok`.
export function prevWordInline(doc, tok) {
  const sp = doc.tokens[tok.index - 1];
  const w = doc.tokens[tok.index - 2];
  if (!sp || !w || sp.type !== 'space' || sp.text.includes('\n') || w.type !== 'word') return null;
  return w;
}

export function nextWordInline(doc, tok) {
  const sp = doc.tokens[tok.index + 1];
  const w = doc.tokens[tok.index + 2];
  if (!sp || !w || sp.type !== 'space' || sp.text.includes('\n') || w.type !== 'word') return null;
  return w;
}

// Copies the letter case of `model` onto `word` (capitalized or all caps).
export function matchCase(model, word) {
  if (!model || !word) return word;
  if (model.length > 1 && model === model.toUpperCase() && model !== model.toLowerCase()) return word.toUpperCase();
  if (isUpper(model[0])) return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
}
