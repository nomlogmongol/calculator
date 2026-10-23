#!/usr/bin/env node
// Bundles grammar/src (ES modules) into grammar/mongol-grammar.js, a single
// classic script that also works from file:// and exposes `MongolGrammar`.
// No dependencies: each module becomes a function in a tiny module registry.
//
//   node scripts/build.js           write the bundle
//   node scripts/build.js --check   exit 1 if the bundle is out of date

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'grammar', 'src');
const OUT = path.join(ROOT, 'grammar', 'mongol-grammar.js');

const IMPORT_RE = /^import\s+([\s\S]+?)\s+from\s+'([^']+)';\s*$/gm;

function resolveId(fromId, spec) {
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromId), spec));
}

function transform(id, code) {
  const deps = [];
  const exportsList = [];
  let out = code.replace(IMPORT_RE, (_, what, spec) => {
    const dep = resolveId(id, spec);
    deps.push(dep);
    const req = `__require(${JSON.stringify(dep)})`;
    what = what.trim();
    if (what.startsWith('{')) {
      const names = what.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
        .map((s) => s.replace(/\s+as\s+/, ': '));
      return `const { ${names.join(', ')} } = ${req};`;
    }
    return `const ${what} = ${req}.default;`;
  });
  out = out.replace(/^export\s+(function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
    exportsList.push(name);
    return `${kind} ${name}`;
  });
  out = out.replace(/^export\s+default\s+/gm, '__exports.default = ');
  out = out.replace(/^export\s*\{([^}]*)\};?\s*$/gm, (_, names) => {
    for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) exportsList.push(n);
    return '';
  });
  if (/^\s*(import|export)\b/m.test(out)) throw new Error(`${id}: unsupported import/export syntax`);
  const tail = exportsList.map((n) => `  __exports.${n} = ${n};`).join('\n');
  return { deps, code: `${out.trimEnd()}\n${tail}` };
}

export function build() {
  const modules = new Map();
  const visit = (id) => {
    if (modules.has(id)) return;
    const code = fs.readFileSync(path.join(SRC, id), 'utf8');
    const mod = transform(id, code);
    modules.set(id, mod);
    mod.deps.forEach(visit);
  };
  visit('index.js');
  const version = /VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(SRC, 'index.js'), 'utf8'))[1];
  const defs = [...modules].map(([id, mod]) =>
    `__define(${JSON.stringify(id)}, function (__require, __exports) {\n${mod.code.replace(/^(?=.)/gm, '  ')}\n});`).join('\n\n');
  return `/*! mongol-grammar ${version} | Generated from grammar/src by scripts/build.js. Do not edit. */
(function (root) {
'use strict';
const __defs = {};
const __cache = {};
function __define(id, fn) { __defs[id] = fn; }
function __require(id) {
  if (!__cache[id]) { __cache[id] = {}; __defs[id](__require, __cache[id]); }
  return __cache[id];
}

${defs}

const api = __require('index.js');
if (typeof module === 'object' && module && module.exports) module.exports = api;
else root.MongolGrammar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bundle = build();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== bundle) {
      console.error('grammar/mongol-grammar.js is out of date: run `npm run build`.');
      process.exit(1);
    }
    console.log('grammar/mongol-grammar.js is up to date.');
  } else {
    fs.writeFileSync(OUT, bundle);
    console.log(`Wrote ${path.relative(ROOT, OUT)} (${(bundle.length / 1024).toFixed(1)} KB)`);
  }
}
