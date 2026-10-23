// Hyphens and spaces between numerals, abbreviations, Latin words and the
// Mongolian suffixes attached to them (2015-ийн, АНУ-ын, Facebook-ээр).

import { charKind } from '../text.js';
import { ATTACHED_SUFFIXES } from '../suffixes.js';
import { CYRILLIC_TO_LATIN, LATIN_TO_CYRILLIC, LEGACY_LETTERS } from '../alphabet.js';


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

export default [numeralSuffix, abbreviationSuffix, latinBoundary, hyphenatedNames];
