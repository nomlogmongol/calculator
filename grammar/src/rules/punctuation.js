// Punctuation and spacing.

// Lowercase abbreviations that end with a period inside a sentence.
export const ABBREVIATIONS = new Set([
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

export default [spaceBeforePunct, spaceAfterPunct, spaceInsideBrackets, repeatedPunct, unbalanced, doubleSpace, sentenceCapital];
