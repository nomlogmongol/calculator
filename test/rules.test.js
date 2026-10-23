import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, applyFixes, fixAll, listRules } from '../grammar/src/index.js';

// Issues of one rule only.
function hits(text, rule) {
  return check(text).filter((i) => i.rule === rule);
}

// Applies the first suggestion of every issue of `rule`.
function fixWith(text, rule) {
  return applyFixes(text, hits(text, rule)).text;
}

test('every documented example is detected and fixed by its own rule', () => {
  for (const rule of listRules()) {
    for (const [wrong, right] of rule.examples) {
      const found = hits(wrong, rule.id);
      assert.ok(found.length, `${rule.id}: «${wrong}» not detected`);
      if (found.some((i) => i.suggestions.length)) {
        assert.equal(fixWith(wrong, rule.id), right, `${rule.id}: «${wrong}»`);
      }
      assert.equal(hits(right, rule.id).length, 0, `${rule.id}: «${right}» should be clean`);
    }
  }
});

// [text, expected first suggestion applied to the whole text]
const CASES = {
  'mixed-script': [
    ['Mонголын', 'Монголын'],
    ['Улаанбаатaрын', 'Улаанбаатарын'],
    ['хэрэгжїїлдэг', 'хэрэгжүүлдэг'],
    ['мєнгєн', 'мөнгөн'],
    ['хоѐр', 'хоёр'],
    ['Vгvй', 'Үгүй'],
    ['ХI зуун', 'XI зуун'],
    ['Б.СYX', 'Б.СҮХ'],
    ['АBBA, Bee Gees', 'ABBA, Bee Gees'],
    ['Тhe Beatles', 'The Beatles'],
  ],
  'suffix-harmony': [
    ['хотаас', 'хотоос'],
    ['хүнаас', 'хүнээс'],
    ['өвчнээс', 'өвчнөөс'],
    ['томилдаг', 'томилдог'],
    ['гунигтэй', 'гунигтай'],
    ['төлөвлөгөөтай', 'төлөвлөгөөтэй'],
    ['хоёртай', 'хоёртой'],
    ['байхгүйтай', 'байхгүйтэй'],
    ['өнгөрүүлсөн', 'өнгөрүүлсэн'],
    ['шүүмжилсан', 'шүүмжилсэн'],
    ['болохаар', 'болохоор'],
    ['барихээр', 'барихаар'],
    ['хөгжуулэх', 'хөгжүүлэх'],
    ['төслууд', 'төслүүд'],
    ['дөрөвдугаар', 'дөрөвдүгээр'],
    ['гуравдүгээрт', 'гуравдугаарт'],
    ['туухтэй', 'түүхтэй'],
    ['зугээр', 'зүгээр'],
  ],
  'case-ending': [
    ['хэрэглэгчдын', 'хэрэглэгчдийн'],
    ['өсөлтыг', 'өсөлтийг'],
    ['боломжыг', 'боломжийг'],
    ['хөдөлгөөны', 'хөдөлгөөний'],
    ['холбооний', 'холбооны'],
    ['удаагын', 'удаагийн'],
    ['Д.Булгантуяагын', 'Д.Булгантуяагийн'],
    ['хөршийын', 'хөршийн'],
  ],
  'question-particle': [
    ['Тийм юү?', 'Тийм үү?'],
    ['Бий уу?', 'Бий юу?'],
    ['Мэдэхгүй уу?', 'Мэдэхгүй юү?'],
    ['Байхгүй юү?', 'Байхгүй юу?'],
    ['Энэ мөнгө уу?', 'Энэ мөнгө үү?'],
    ['Та хүүхэдтэй юу?', 'Та хүүхэдтэй юү?'],
  ],
  've-be': [
    ['Ямар бэ?', 'Ямар вэ?'],
    ['Хэзээ ирэх бэ?', 'Хэзээ ирэх вэ?'],
    ['Яагаад авсан вэ?', 'Яагаад авсан бэ?'],
    ['Хаана зөв вэ?', 'Хаана зөв бэ?'],
  ],
  'particle-spacing': [
    ['хэзээч', 'хэзээ ч'],
    ['Хэнч', 'Хэн ч'],
    ['хэнбэ', 'хэн бэ'],
    ['Сайнуу?', 'Сайн уу?'],
    ['байгааюу?', 'байгаа юу?'],
  ],
  'numeral-suffix': [
    ['20нд', '20-нд'],
    ['10%иар', '10%-иар'],
    ['1990ээд', '1990-ээд'],
    ['5кг', '5 кг'],
    ['200сая', '200 сая'],
  ],
  'abbreviation-suffix': [['НҮБын', 'НҮБ-ын'], ['МУИСаас', 'МУИС-аас']],
  'latin-suffix': [['iPhoneоор', 'iPhone-оор'], ['нээлтийгiTunes', 'нээлтийг iTunes']],
  'hyphenated-name': [['Дархан Уул', 'Дархан-Уул'], ['Говь-алтай', 'Говь-Алтай']],
  'soft-sign': [['сургуульиас', 'сургуулиас'], ['ярьиж', 'ярьж'], ['Швейцарьийн', 'Швейцарийн']],
  'triple-letter': [['хугацааанд', 'хугацаанд'], ['хэрэгггүй', 'хэрэггүй']],
  'negative-suffix': [['явсангуй', 'явсангүй']],
  'final-i': [['холбоотои', 'холбоотой'], ['уурхаи', 'уурхай']],
  'common-misspelling': [
    ['ажилсан', 'ажилласан'],
    ['ажилах', 'ажиллах'],
    ['байгуулагууд', 'байгууллагууд'],
    ['уланбаатар', 'Улаанбаатар'],
    ['Хөгжилийн', 'Хөгжлийн'],
  ],
  'space-after-punct': [['Тийм үү?Тийм.', 'Тийм үү? Тийм.'], ['Жишээ:энэ', 'Жишээ: энэ']],
  'repeated-word': [['гэж гэж хэлэв', 'гэж хэлэв'], ['сарын сарын', 'сарын']],
  'official-name': [['Улсын их хурал', 'Улсын Их Хурал'], ['Улсын Их хурлын', 'Улсын Их Хурлын']],
  'mojibake': [['РЎР°Р№РЅ', 'Сайн'], ['Ð¡Ð°Ð¹Ð½ Ð±Ð°Ð¹Ð½Ð° ÑƒÑƒ', 'Сайн байна уу']],
};

for (const [rule, cases] of Object.entries(CASES)) {
  test(`${rule}: detects and fixes`, () => {
    for (const [wrong, right] of cases) {
      assert.equal(fixWith(wrong, rule), right, `«${wrong}»`);
    }
  });
}

// Correct usage that a careless rule would flag.
const CLEAN = {
  'mixed-script': ['iPhone', 'COVID-19', 'Burberry', 'МВт', 'Сәкенов', 'кино'],
  'suffix-harmony': [
    'номоос', 'гэрээс', 'өдрөөс', 'орчиндоо', 'хөгжлөөр', 'мориор', 'бөхийсөн', 'өндийсөн', 'зайлсхийсэн',
    'заналхийлсэн', 'ухасхийгээд', 'талийсан', 'мэдэхгүйгээр', 'нөхцөлтэйгөөр', 'нөхцөлтэйгээр', 'холбоотойгоор',
    'болжээ', 'байжээ', 'санхүүжүүлсэн', 'санхүүд', 'ханхүүд', 'хүүхдүүд', 'сургуулиас', 'оюутнаас',
    'институттэй', 'вирусээр', 'автобусаар', 'клубээс', 'секундэд', 'интернэтээр', 'телевизээр', 'рубльтэй',
    'доллараар', 'компаниас', 'Болормаа', 'Энхтуул', 'Ларсон', 'хийсэн', 'бичсэн', 'Барселона',
  ],
  'case-ending': ['даргын', 'тамгын', 'аймгийн', 'засгийн', 'хуулийн', 'хүний', 'хааны', 'машины', 'хорооны', 'Монголын'],
  'question-particle': ['Энэ юу?', 'Чи юу хийж байна?', 'Сайн байна уу?', 'Шоу юу?', 'Ус уу.'],
  've-be': ['Юу вэ?', 'Хэн бэ?', 'Яах юм бэ?', 'Хаана вэ?', 'Ямар вэ?'],
  'particle-spacing': ['залуу?', 'дуу?', 'хүү?', 'ямар ч'],
  'numeral-suffix': ['2024-ийн', '5а анги', '10 кг', '5г', '1-р', '2,5 сая'],
  'abbreviation-suffix': ['АНУ-ын', 'МВт', 'кВт'],
  'final-i': ['Луи', 'дэлхий', 'тухай'],
  'negative-suffix': ['дугуй', 'боловсронгуй'],
  'repeated-word': ['тус тус', 'өөр өөр', 'дахин дахин', 'юм юм', 'олон олон'],
  'space-after-punct': ['Б.Болд', 'ам.доллар', 'т.м.', '3,5', '10:30', 'ажилтанП.Гантөмөр'],
  'sentence-capital': ['ам. доллар', '«Ирэх үү?» гэж асуув.', 'т.м. зүйлс'],
  'unbalanced-brackets': ['(жишээ)', '«Монгол»', '1) нэгдүгээрт', '“Битлз” хамтлаг'],
  'mojibake': ['Сайн байна уу', 'Рё'],
  'triple-letter': ['ҮЦТТТХТ', 'ааа'],
};

for (const [rule, texts] of Object.entries(CLEAN)) {
  test(`${rule}: leaves correct text alone`, () => {
    for (const text of texts) {
      assert.deepEqual(hits(text, rule).map((i) => i.text), [], `«${text}»`);
    }
  });
}

test('a capitalized word starting a sentence is checked, a name after initials is not', () => {
  assert.deepEqual(hits('Тэр ирсэн. Гишүүдын санал.', 'case-ending').map((i) => i.text), ['ын']);
  assert.deepEqual(hits('Номээс уншив.', 'suffix-harmony').map((i) => i.text), ['ээс']);
  assert.deepEqual(hits('Б.Тавинжилээс асуув. Тө.Энххад хэлэв.', 'suffix-harmony'), []);
  assert.deepEqual(hits('Шинэ ном. Энхтуул ирлээ. Жэйсон хэлэв.', 'suffix-harmony'), []);
});

test('fixAll does not lose an error hidden behind a capitalization fix', () => {
  assert.equal(fixAll('Тэр ирсэн. гишүүдын санал.').text, 'Тэр ирсэн. Гишүүдийн санал.');
});

test('offsets point at the right characters', () => {
  const text = 'Өчигдөр би номээс нэг өгүүлбэр уншсан.';
  const [issue] = check(text);
  assert.equal(issue.rule, 'suffix-harmony');
  assert.equal(text.slice(issue.start, issue.end), 'ээс');
  assert.equal(issue.text, 'ээс');
  assert.deepEqual(issue.suggestions, ['оос']);
});

test('messages exist in Mongolian and English', () => {
  const issues = check('Mонгол улсын номээс 2024ийн ямарч Ирэх уу? Юу бэ?');
  assert.ok(issues.length >= 6);
  for (const i of issues) {
    assert.ok(i.message.mn && /[а-яөү]/i.test(i.message.mn), i.rule);
    assert.ok(i.message.en && /[a-z]/i.test(i.message.en), i.rule);
  }
});
