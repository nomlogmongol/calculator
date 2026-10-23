// Particles: question particles уу/үү/юу/юү and вэ/бэ, separately written
// particles (ч, уу, вэ) and the negative suffix -гүй.

import { wordClass } from '../harmony.js';
import { nextToken, prevWordInline, matchCase } from '../text.js';

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

export function veBe(prevLower) {
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

export default [questionParticle, veBeRule, particleSpacing, negationSpacing];
