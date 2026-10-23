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

import { HARMONY, CONSONANTS } from './alphabet.js';

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
export function isDisharmonicWord(lower) {
  return DISHARMONIC.test(lower);
}
// Stems with only и are usually front, but many such stems are names or
// fragments. These common verb roots are certainly front (хийсэн, бичсэн).
const FRONT_NEUTRAL_ROOTS = /^(?:хий|бич|ид|ир|шийд)/;

export const SLOT_NAMES = {
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
export function stemHarmony(stem) {
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
export function wordClass(lower) {
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

export function isBackSlot(slot) {
  return slot === 'A' || slot === 'O';
}
