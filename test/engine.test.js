import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { check, fixAll, applyFix, applyFixes, listRules, RULES, CATEGORIES } from '../grammar/src/index.js';
import { build } from '../scripts/build.js';

// Correct Mongolian: none of these sentences should produce an issue.
const CORRECT = `Монгол Улсын нийслэл Улаанбаатар хот нь Туул голын хөндийд оршдог.
Өнөөдөр бид сургуульдаа эрт очиж, номын санд хичээлээ давтсан.
Та энэ номыг уншсан уу? Чи хэзээ ирэх вэ? Энэ хэний ном бэ?
Хүүхдүүд гэрээсээ гарч, найзуудтайгаа тоглов.
2024 онд тус компани 15 хувиар өссөн байна.
АНУ-ын Ерөнхийлөгч 5-р сарын 20-нд Монголд айлчилна.
Тэр ямар ч асуудалгүй ажлаа дуусгажээ.
Хөгжлийн бодлогын баримт бичигт өөрчлөлт оруулсан.
Тэд Facebook-ээр дамжуулан мэдээлэл түгээдэг.
Хуулийн дагуу байгууллагын удирдлага шийдвэр гаргана.
Өвөл болохоор малчид отор нүүдэл хийдэг.
Тэр өдрөөс хойш бид хамтдаа ажилласан.
Мөнгөө хэмнэхийн тулд тэр автобусаар явдаг.
Говь-Алтай аймгийн төвд шинэ эмнэлэг баригдана.
Үүнээс гадна усны хангамжийн асуудлыг шийдвэрлэх шаардлагатай.
Тэр хоёр дахин дахин уулзсан.
Ном, дэвтэр, үзэг зэргийг авчирна уу.
XXI зууны эхэн үед технологи хурдацтай хөгжсөн.
Сайн байна уу? Таны нэр хэн бэ? Энэ үнэн үү?
Чи гэртээ байгаа юу? Тэр мэдэхгүй юү?
Хүмүүс хоорондоо зөвлөлдөж, нэгдсэн шийдвэрт хүрсэн.
Хотын захиргаа иргэдтэй уулзалт хийлээ.
Монголчууд Цагаан сараар ах дүү нартаа золгодог.
Түүний бичсэн өгүүлэл сонинд нийтлэгджээ.`;

test('correct text produces no issues', () => {
  const issues = check(CORRECT);
  assert.deepEqual(issues.map((i) => `${i.rule}: ${i.text}`), []);
});

test('fixAll repairs several kinds of errors at once', () => {
  const { text, applied } = fixAll('Mонгол улсын номээс 2024ийн ямарч хүн ирэх уу ? Юу бэ?');
  assert.equal(text, 'Монгол Улсын номоос 2024-ийн ямар ч хүн ирэх үү? Юу вэ?');
  assert.ok(applied >= 7);
});

test('fixAll leaves correct text untouched', () => {
  assert.deepEqual(fixAll(CORRECT), { text: CORRECT, applied: 0 });
});

test('applyFix and applyFixes', () => {
  const text = 'ном , дэвтэр';
  const issues = check(text);
  assert.equal(applyFix(text, issues[0]), 'ном, дэвтэр');
  assert.equal(applyFix(text, issues[0], 5), text, 'missing suggestion leaves text as is');
  // Overlapping issues: only the first one is applied.
  const overlapping = [
    { start: 0, end: 3, suggestions: ['A'] },
    { start: 2, end: 5, suggestions: ['B'] },
  ];
  assert.deepEqual(applyFixes('abcdef', overlapping), { text: 'Adef', applied: 1 });
});

test('options: disabled rules and categories, minimum severity', () => {
  const text = 'Mонгол номээс  ном. Монгол улсын';
  const all = check(text).map((i) => i.rule);
  assert.ok(all.includes('mixed-script') && all.includes('official-name') && all.includes('double-space'));
  assert.ok(!check(text, { disabled: ['mixed-script'] }).some((i) => i.rule === 'mixed-script'));
  assert.ok(!check(text, { disabled: ['harmony'] }).some((i) => i.category === 'harmony'));
  const errorsOnly = check(text, { minSeverity: 'error' });
  assert.ok(errorsOnly.length && errorsOnly.every((i) => i.severity === 'error'));
});

test('issues are sorted and well-formed', () => {
  const text = 'Ирэх уу? ямарч Mонгол номээс 2024ийн (жишээ';
  const issues = check(text);
  for (let k = 1; k < issues.length; k++) assert.ok(issues[k - 1].start <= issues[k].start);
  for (const i of issues) {
    assert.equal(text.slice(i.start, i.end), i.text);
    assert.ok(['error', 'warning', 'suggestion'].includes(i.severity));
    assert.ok(CATEGORIES[i.category]);
    assert.ok(Array.isArray(i.suggestions));
  }
});

test('handles empty and unusual input', () => {
  assert.deepEqual(check(''), []);
  assert.deepEqual(check(null), []);
  assert.deepEqual(check('   \n\n  '), []);
  assert.deepEqual(check('Hello, world! 123'), []);
  assert.doesNotThrow(() => check('😀 👨‍👩‍👧 «» () ?? ... — –'));
});

test('rule metadata is complete', () => {
  const ids = new Set();
  for (const r of listRules()) {
    assert.ok(!ids.has(r.id), `duplicate rule id ${r.id}`);
    ids.add(r.id);
    assert.ok(CATEGORIES[r.category], r.id);
    assert.ok(r.title.mn && r.title.en && r.description.mn && r.description.en, r.id);
  }
  assert.equal(ids.size, RULES.length);
});

test('is fast enough for interactive use', () => {
  const text = CORRECT.repeat(40); // ~ 40 KB
  const t0 = performance.now();
  check(text);
  assert.ok(performance.now() - t0 < 2000);
});

test('browser bundle is up to date and matches the modules', () => {
  const bundle = fs.readFileSync(new URL('../grammar/mongol-grammar.js', import.meta.url), 'utf8');
  assert.equal(bundle, build(), 'run `npm run build`');
  const sandbox = { TextDecoder, Uint8Array };
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox);
  const MG = sandbox.MongolGrammar;
  const sample = `${CORRECT}\nMонгол улсын номээс 2024ийн ямарч Ирэх уу? Юу бэ? Ð¡Ð°Ð¹Ð½ Ð±Ð°Ð¹Ð½Ð°`;
  assert.equal(JSON.stringify(MG.check(sample)), JSON.stringify(check(sample)));
  assert.equal(MG.fixAll(sample).text, fixAll(sample).text);
});
