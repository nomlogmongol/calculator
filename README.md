# Монгол хэлний дүрэм шалгагч

Монгол хэлний (кирилл бичиг) зөв бичих дүрэм, эгшиг зохицол, цэг тэмдгийн алдааг илрүүлж, засах санал гаргадаг хөдөлгүүр.
Хөтөч болон Node.js дээр ажиллана, гадны сан шаардахгүй, текстийг хаашаа ч илгээхгүй.

- **Вэб хуудас:** [`grammar/index.html`](grammar/index.html). Бичсэн текстийн алдааг шууд тодруулж, нэг товшилтоор засна.
- **JavaScript сан:** [`grammar/src/index.js`](grammar/src/index.js) (`check()`, `fixAll()`).
- **Тушаалын мөр:** `node grammar/cli.js файл.txt`

*English below.*

## Юу шалгадаг вэ

| Ангилал | Шалгах зүйл | Жишээ |
|---|---|---|
| Эгшиг зохицох ёс | Нөхцөл, дагаврын эр/эм, о/ө хувилбар | номээс → номоос, гэраас → гэрээс, өдрээс → өдрөөс, хийсан → хийсэн |
| | Харьяалахын, заахын тийн ялгал | гишүүдын → гишүүдийн, хүны → хүний, багшын → багшийн, судалгааний → судалгааны |
| | у/ү, о/ө андуурсан язгуур | туухтэй → түүхтэй, зугээр → зүгээр |
| Асуух сул үг | уу/үү/юу/юү | Ирэх уу? → Ирэх үү?, Байгаа уу? → Байгаа юу? |
| | вэ/бэ | Юу бэ? → Юу вэ?, Хэн вэ? → Хэн бэ? |
| Тусад нь, залгаж бичих | ч, уу, вэ сул үг; -гүй нөхцөл | ямарч → ямар ч, байнауу? → байна уу?, мэдэх гүй → мэдэхгүй |
| Зураас | Тоо, товчилсон үг, латин үг, аймгийн нэр | 2024ийн → 2024-ийн, АНУын → АНУ-ын, Facebookээр → Facebook-ээр, Говь Алтай → Говь-Алтай |
| Үсэг, тэмдэгт | Латин болон хуучин фонтын үсэг холилдох | Mонгол → Монгол, ѳдѳр → өдөр, сэрvvн → сэрүүн, ХI → XI |
| | Эвдэрсэн кодчилол, үл үзэгдэх тэмдэгт | Ð¡Ð°Ð¹Ð½ → Сайн |
| Үг үсэг | Зөөлний тэмдэг, гурвалсан үсэг, -гүй, хос эгшиг, түгээмэл алдаа | хуульийн → хуулийн, хороооны → хорооны, байхгуй → байхгүй, тухаи → тухай, байгуулага → байгууллага |
| Цэг тэмдэг | Зай, давхардсан тэмдэг, хаалт, өгүүлбэрийн том үсэг | уу ? → уу?, ном,дэвтэр → ном, дэвтэр |
| Найруулга | Давхардсан үг, албан ёсны нэр, Ром тоо | нь нь → нь, Монгол улс → Монгол Улс, ХХ зуун → XX зуун |

Нийт 29 дүрэм бий. Бүрэн жагсаалтыг вэб хуудасны «Шалгадаг дүрмүүд» хэсгээс эсвэл `node grammar/cli.js --rules` тушаалаар харна.

Түвшин: **алдаа** (дүрэм зөрчсөн), **анхааруулга** (алдаа байх магадлал өндөр), **зөвлөмж** (хэв маяг).

## Хэрэглэх

### Вэб хуудас

`grammar/index.html` файлыг хөтчөөр шууд нээхэд болно, сервер хэрэггүй.
Энэ репод GitHub Pages идэвхжүүлбэл `https://<хэрэглэгч>.github.io/calculator/grammar/` хаягаар нээгдэнэ.

### JavaScript

```js
import { check, fixAll } from './grammar/src/index.js';

check('Тэр номээс уншсан.');
// [{ rule: 'suffix-harmony', category: 'harmony', severity: 'error',
//    start: 7, end: 10, text: 'ээс', suggestions: ['оос'],
//    message: { mn: 'Эгшиг зохицох ёсоор «ном-» нь «о» эгшигтэй эр үг тул …',
//               en: 'Vowel harmony: «ном-» is a back-vowel word with rounded «о», …' } }]

fixAll('Ирэх уу? Юу бэ? Mонгол улсын 2024ийн').text;
// 'Ирэх үү? Юу вэ? Монгол Улсын 2024-ийн'
```

Хөтөч дээр модульгүйгээр: `<script src="grammar/mongol-grammar.js"></script>`, дараа нь `MongolGrammar.check(text)`.

Сонголт: `check(text, { disabled: ['repeated-word', 'style'], minSeverity: 'warning' })`. `disabled` нь дүрмийн нэр эсвэл ангилал (`characters`, `harmony`, `spelling`, `punctuation`, `style`) авна.

### Тушаалын мөр

```sh
node grammar/cli.js нийтлэл.txt           # алдааг жагсаана
node grammar/cli.js --fix нийтлэл.txt     # засварласан текстийг хэвлэнэ
echo 'Ирэх уу?' | node grammar/cli.js --lang en --json
node grammar/cli.js --rules               # дүрмийн жагсаалт
```

Алдаа (`error`) олдвол 1 кодоор дуусна, тиймээс CI дээр ашиглаж болно.

## Хэрхэн ажилладаг вэ

1. Текстийг үг, тоо, цэг тэмдэг болгон хувааж, үг бүрийн цагаан толгой (кирилл, латин, хуучин фонт), том жижиг үсэг, өгүүлбэрийн эхлэлийг тодорхойлно.
2. Эгшиг зохицлын шинжилгээ үгийн төгсгөлийн нөхцөлийг (-аас, -аар, -тай, -сан, -даг, -лаа, -ууд, -дугаар …) таньж, язгуурын сүүлийн шийдвэрлэх эгшгээр зөв хувилбарыг тооцно. и, ы саармаг; у/ү нь о/ө-гийн тойруулгыг тасална (орчуулагч, өгүүлбэр).
3. Харь үг (к, п, ф үсэгтэй, -ент, -изм …), нийлмэл нэр (Батболд, Энхтуул), эр/эм эгшиг холилдсон язгуурыг эгшиг зохицлоор шалгахгүй. Ингэснээр буруу дохио цөөрнө.
4. Дүрмүүдийг 75 мянган мэдээний нийтлэл (Eduge корпус, ойролцоогоор 24 сая үг) дээр ажиллуулж, илэрсэн тохиолдлуудыг гараар шалгаж тааруулсан. Жишээлбэл «бөхийсөн», «ерөнхийгөөс» гэх мэт -ий-тэй үгэнд о/ө-гийн зохицол хадгалагддаг, харин «зайлсхийсэн» гэх мэт -хий- нь үгийг эм болгодгийг корпусын тооноос тогтоосон.

## Хязгаарлалт

- Толь бичигт суурилсан бүрэн үг үсгийн шалгалт хийхгүй, тиймээс жагсаалтад ороогүй буруу бичсэн үгийг олохгүй.
- Өгүүлбэр зүйн бүтэц (үгийн дараалал, тийн ялгалын удирдлага) шалгахгүй.
- Харь үг, хүний нэр, газрын нэрийн эгшиг зохицлыг шалгахгүй.
- Зөвхөн кирилл бичиг дэмжинэ, монгол бичиг дэмжихгүй.

## Хөгжүүлэлт

```sh
npm test          # тестүүд (node:test, нэмэлт сан хэрэггүй)
npm run build     # grammar/src-г өөрчилсний дараа grammar/mongol-grammar.js-г шинэчилнэ
```

```
grammar/
  index.html, app.js, app.css   вэб хуудас
  mongol-grammar.js             хөтчид зориулсан нэг файл (npm run build)
  cli.js                        тушаалын мөр
  src/
    index.js                    нийтийн API: check, fixAll, applyFix, applyFixes, listRules
    engine.js                   дүрэм ажиллуулах, засвар хийх
    text.js                     текст задлах, үгийн шинжилгээ
    alphabet.js                 цагаан толгой, адил хэлбэртэй үсэг
    harmony.js                  эгшиг зохицлын шинжилгээ
    suffixes.js                 зураасаар залгах нөхцөлүүд
    rules/                      дүрмүүд, ангиллаар
scripts/build.js                багцлагч
test/                           тестүүд
```

Шинэ дүрэм нэмэхдээ `grammar/src/rules/` доторх файлд `{ id, category, severity, title, description, examples, check(doc, report) }` объект нэмнэ. `examples` дахь жишээ бүрийг тест автоматаар шалгана: дүрэм алдааг илрүүлж, зөв хэлбэрт засах ёстой.

---

# Mongolian grammar checker

A rule-based checker for Mongolian text in Cyrillic script: spelling rules, vowel harmony, case endings,
question particles, hyphenation, mixed alphabets and punctuation. It has no dependencies, runs in the
browser and in Node.js, and never sends text anywhere.

- **Web page:** [`grammar/index.html`](grammar/index.html): highlights issues as you type, with one-click fixes. Opens straight from disk.
- **Library:** `import { check, fixAll } from './grammar/src/index.js'`, or `grammar/mongol-grammar.js` as a plain `<script>` (global `MongolGrammar`).
- **CLI:** `node grammar/cli.js [--fix] [--json] [--lang en] file.txt`, exit status 1 when errors are found.

Each issue is `{ rule, category, severity, start, end, text, message: { mn, en }, suggestions }`, with UTF-16
offsets into the input. Options: `disabled` (rule ids or categories) and `minSeverity`
(`error` | `warning` | `suggestion`).

**How it works.** The vowel-harmony analysis finds a known suffix at the end of a word and derives the
correct variant from the last decisive vowel of the stem (и and ы are neutral; у/ү interrupt о/ө rounding).
Loanwords, names and compounds do not follow native harmony, so stems that do not look native are never
flagged. Every rule was run over 75,000 Mongolian news articles (the Eduge corpus, about 24 million words)
and tuned until what remained was overwhelmingly real errors. The corpus is not part of this repository.

**Limitations.** There is no dictionary-based spell check, no syntax analysis, and loanwords and names are
not checked for harmony. Only Cyrillic script is supported, not traditional Mongolian script.

**Development.** `npm test` runs the tests (Node 18+, no dependencies). After editing `grammar/src`, run
`npm run build` to regenerate the browser bundle; a test fails if you forget.
