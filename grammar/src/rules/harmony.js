// Vowel harmony of suffixes (эгшиг зохицох ёс) and genitive/accusative endings.

import { stemHarmony, isBackSlot, isDisharmonicWord, SLOT_NAMES } from '../harmony.js';
import { CONSONANTS } from '../alphabet.js';
import { matchCase } from '../text.js';

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
export function suffixHarmonyError(lower) {
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

export function innerHarmonyError(lower) {
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

export function caseEndingError(lower) {
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

export default [suffixHarmony, caseEnding];
