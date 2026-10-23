// Mongolian Cyrillic alphabet, vowel classes and look-alike character maps.

export const MN_LOWER = 'абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя';
export const MN_UPPER = 'АБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЩЪЫЬЭЮЯ';
const MN_SET = new Set(MN_LOWER + MN_UPPER);

export const CONSONANTS = new Set('бвгджзйклмнпрстфхцчшщ');

// Harmony value of each vowel letter:
//   a = back unrounded, o = back rounded, u = back high (resets rounding),
//   e = front unrounded, ö = front rounded, ü = front high (resets rounding),
//   E = е (front, rounding unknown), U = ю (back or front, mostly back).
// и and ы are neutral: they never decide harmony.
export const HARMONY = {
  а: 'a', я: 'a', о: 'o', ё: 'o', у: 'u',
  э: 'e', ө: 'ö', ү: 'ü', е: 'E', ю: 'U',
};

export function isMnLetter(ch) {
  return MN_SET.has(ch);
}

export function isCyrillic(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x0400 && c <= 0x052f) || (c >= 0x1c80 && c <= 0x1c8f) || (c >= 0xa640 && c <= 0xa69f);
}

export function isLatin(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) ||
    (c >= 0xc0 && c <= 0x24f && c !== 0xd7 && c !== 0xf7) || (c >= 0x1e00 && c <= 0x1eff);
}

export function isGreek(ch) {
  const c = ch.codePointAt(0);
  return c >= 0x0370 && c <= 0x03ff;
}

export function isUpper(ch) {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

// Characters from legacy Mongolian fonts and neighbouring Cyrillic
// alphabets that were typed in place of real Mongolian letters.
// "?" marks a letter whose target (ү or у) is decided by vowel harmony.
export const LEGACY_LETTERS = {
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
export const LATIN_TO_CYRILLIC = {
  A: 'А', a: 'а', B: 'В', C: 'С', c: 'с', E: 'Е', e: 'е', H: 'Н', K: 'К', k: 'к',
  M: 'М', O: 'О', o: 'о', P: 'Р', p: 'р', T: 'Т', X: 'Х', x: 'х',
  y: '?у', Y: '?У', v: 'ү', V: 'Ү',
};

// Greek letters seen inside Cyrillic words.
export const GREEK_TO_CYRILLIC = {
  'Α': 'А', 'α': 'а', 'Β': 'В', 'Ε': 'Е', 'ε': 'е', 'Η': 'Н', 'Κ': 'К', 'κ': 'к',
  'Μ': 'М', 'Ο': 'О', 'ο': 'о', 'Ρ': 'Р', 'ρ': 'р', 'Τ': 'Т', 'Χ': 'Х', 'χ': 'х',
  'Υ': 'Ү', 'υ': 'ү', 'ν': 'ү',
};

// Cyrillic letters that look like Latin letters (used inside Latin words).
export const CYRILLIC_TO_LATIN = {
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'І': 'I', 'Ј': 'J', 'К': 'K',
  'М': 'M', 'О': 'O', 'Р': 'P', 'Ѕ': 'S', 'Т': 'T', 'Х': 'X', 'У': 'Y', 'Ү': 'Y',
  'а': 'a', 'е': 'e', 'і': 'i', 'ј': 'j', 'о': 'o', 'р': 'p', 'с': 'c', 'ѕ': 's',
  'у': 'y', 'х': 'x', 'к': 'k', 'ү': 'y',
};

export const INVISIBLE_CHARS = {
  '­': 'SOFT HYPHEN',
  '​': 'ZERO WIDTH SPACE',
  '‌': 'ZERO WIDTH NON-JOINER',
  '‍': 'ZERO WIDTH JOINER',
  '⁠': 'WORD JOINER',
  '﻿': 'ZERO WIDTH NO-BREAK SPACE',
};

// Returns 'back', 'front' or null from the vowels of a (lowercase) string.
// Used to choose between у/ү when restoring look-alike letters.
export function roughHarmony(s) {
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
