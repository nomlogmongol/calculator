// Rules about the characters themselves: look-alike letters from other
// alphabets, legacy font substitutes, invisible characters, mis-decoded text.

import {
  LATIN_TO_CYRILLIC, CYRILLIC_TO_LATIN, LEGACY_LETTERS, GREEK_TO_CYRILLIC, INVISIBLE_CHARS,
} from '../alphabet.js';
import { charKind, normalizeCyrillicWord } from '../text.js';
import { ATTACHED_SUFFIXES } from '../suffixes.js';

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
export function mixedScriptFix(tok, neighbors = []) {
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

export default [mixedScript, invisibleChar, mojibake, replacementChar];
