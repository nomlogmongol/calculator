// Spelling: soft sign, tripled letters, и/й at the end of a word and a
// curated list of frequent misspellings (checked against a news corpus).

import { matchCase } from '../text.js';

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

export function knownMisspelling(lower) {
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

export default [softSign, tripleLetter, negativeSuffix, finalI, commonMisspelling];
