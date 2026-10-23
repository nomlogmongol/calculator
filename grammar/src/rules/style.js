// Style: repeated words, official names, Roman numerals.

import { prevWordInline, nextWordInline } from '../text.js';

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

export default [repeatedWord, officialName, romanNumeral];
