#!/usr/bin/env node
// Command-line front end for the Mongolian grammar checker.

import fs from 'node:fs';
import { check, fixAll, listRules, CATEGORIES } from './src/index.js';

const HELP = `Монгол хэлний дүрэм шалгагч / Mongolian grammar checker

Хэрэглээ / Usage:
  node grammar/cli.js [options] [file ...]     (no file: read standard input)

Options:
  --fix                 print the corrected text instead of the issues
  --json                print issues as JSON
  --lang mn|en          language of the messages (default: mn)
  --min-severity LEVEL  error | warning | suggestion (default: suggestion)
  --disable IDS         comma-separated rule ids or categories to skip
  --rules               list the rules and exit
  -h, --help            show this help

Exit status: 1 when an error-level issue is found, otherwise 0.`;

const SEVERITY_LABEL = {
  mn: { error: 'алдаа', warning: 'анхааруулга', suggestion: 'зөвлөмж' },
  en: { error: 'error', warning: 'warning', suggestion: 'suggestion' },
};

function parseArgs(argv) {
  const opts = { files: [], lang: 'mn', disabled: [], minSeverity: 'suggestion' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fix') opts.fix = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--rules') opts.rules = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--lang') opts.lang = argv[++i];
    else if (a === '--min-severity') opts.minSeverity = argv[++i];
    else if (a === '--disable') opts.disabled.push(...String(argv[++i] || '').split(',').filter(Boolean));
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else opts.files.push(a);
  }
  if (!['mn', 'en'].includes(opts.lang)) throw new Error('--lang must be mn or en');
  if (!SEVERITY_LABEL.en[opts.minSeverity]) throw new Error('--min-severity must be error, warning or suggestion');
  return opts;
}

// Makes spaces and invisible characters visible in terminal output.
function visible(s) {
  return s.replace(/ /g, '␣').replace(/\n/g, '⏎').replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '¤');
}

// 1-based line and column of an offset.
function position(text, offset) {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  return { line, column: offset - before.lastIndexOf('\n') };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }
  if (opts.rules) {
    for (const r of listRules()) {
      console.log(`${r.id.padEnd(22)} ${r.severity.padEnd(10)} ${CATEGORIES[r.category][opts.lang].padEnd(20)} ${r.title[opts.lang]}`);
    }
    return;
  }

  const inputs = opts.files.length
    ? opts.files.map((f) => ({ name: f, text: fs.readFileSync(f, 'utf8') }))
    : [{ name: '<stdin>', text: fs.readFileSync(0, 'utf8') }];
  const options = { disabled: opts.disabled, minSeverity: opts.minSeverity };
  let errors = 0;
  const json = [];

  for (const { name, text } of inputs) {
    if (opts.fix) {
      process.stdout.write(fixAll(text, options).text);
      continue;
    }
    const issues = check(text, options);
    errors += issues.filter((i) => i.severity === 'error').length;
    if (opts.json) {
      json.push({ file: name, issues: issues.map((i) => ({ ...i, ...position(text, i.start) })) });
      continue;
    }
    for (const i of issues) {
      const { line, column } = position(text, i.start);
      const fix = i.suggestions.length ? ` → «${visible(i.suggestions[0])}»` : '';
      console.log(`${name}:${line}:${column}  ${SEVERITY_LABEL[opts.lang][i.severity]}  «${visible(i.text)}»${fix}  ${i.message[opts.lang]}  [${i.rule}]`);
    }
    if (!issues.length) console.log(`${name}: ${opts.lang === 'mn' ? 'алдаа олдсонгүй' : 'no issues found'}`);
  }
  if (opts.json) console.log(JSON.stringify(opts.files.length > 1 ? json : json[0], null, 2));
  if (errors && !opts.fix) process.exitCode = 1;
}

main();
