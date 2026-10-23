// Case and derivational endings that attach with a hyphen to numerals,
// abbreviations and Latin-script words (2024-ийн, АНУ-ын, Facebook-ээр).

const BASE_SUFFIXES = [
  'ын', 'ийн', 'ы', 'ий', 'н', 'ны', 'ний', 'гийн',
  'ыг', 'ийг', 'г', 'ныг', 'нийг',
  'д', 'т', 'ад', 'эд', 'од', 'өд', 'нд', 'ид',
  'аас', 'ээс', 'оос', 'өөс', 'гаас', 'гээс', 'гоос', 'гөөс', 'наас', 'нээс', 'ноос', 'нөөс', 'иас', 'иос',
  'аар', 'ээр', 'оор', 'өөр', 'гаар', 'гээр', 'гоор', 'гөөр', 'иар', 'иор',
  'тай', 'тэй', 'той', 'руу', 'рүү', 'луу', 'лүү',
  'ууд', 'үүд', 'иуд', 'чууд', 'чүүд',
  'ынх', 'ийнх', 'ынхан', 'ийнхэн', 'ынхны', 'ийнхний', 'ынхон', 'ийнхон',
  'р', 'рт', 'аад', 'ээд', 'оод', 'өөд', 'хан', 'хэн', 'хон', 'хөн', 'дахь', 'дэх', 'дох', 'дөх',
  'уулаа', 'үүлээ',
];
const REFLEXIVE = { 'аас': 'аа', 'оос': 'оо', 'ээс': 'ээ', 'өөс': 'өө', 'аар': 'аа', 'оор': 'оо', 'ээр': 'ээ', 'өөр': 'өө' };

export const ATTACHED_SUFFIXES = new Set(BASE_SUFFIXES);
for (const s of BASE_SUFFIXES) {
  const tail = s.slice(-3);
  if (REFLEXIVE[tail]) ATTACHED_SUFFIXES.add(s + REFLEXIVE[tail]);
}
for (const s of ['д', 'нд', 'ад', 'эд', 'од', 'өд', 'т']) {
  ATTACHED_SUFFIXES.add(`${s}аа`).add(`${s}ээ`).add(`${s}оо`).add(`${s}өө`);
}
for (const s of ['ын', 'ийн', 'ний', 'ны', 'ууд', 'үүд']) {
  ATTACHED_SUFFIXES.add(`${s}хаа`).add(`${s}хээ`);
}
for (const s of ['уудын', 'үүдийн', 'уудад', 'үүдэд', 'ынхаа', 'ийнхээ']) ATTACHED_SUFFIXES.add(s);
