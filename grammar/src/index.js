// Mongolian (Cyrillic) grammar and spelling checker.
//
//   import { check, fixAll } from './grammar/src/index.js';
//   check('Тэр номээс уншсан.');
//   // → [{ rule: 'suffix-harmony', start: 7, end: 10, text: 'ээс',
//   //      suggestions: ['оос'], message: { mn: '…', en: '…' }, … }]

import { runRules, applyFix, applyFixes, CATEGORIES, SEVERITIES } from './engine.js';
import characters from './rules/characters.js';
import harmony from './rules/harmony.js';
import particles from './rules/particles.js';
import hyphenation from './rules/hyphenation.js';
import spelling from './rules/spelling.js';
import punctuation from './rules/punctuation.js';
import style from './rules/style.js';

export const VERSION = '1.0.0';

// Order matters only for de-duplication: earlier rules win on identical spans.
export const RULES = [...characters, ...spelling, ...harmony, ...particles, ...hyphenation, ...punctuation, ...style];

// Checks `text` and returns issues sorted by position:
//   { rule, category, severity, start, end, text, message: { mn, en }, suggestions }
// options.disabled:    rule ids or category names to skip
// options.minSeverity: 'error' | 'warning' | 'suggestion' (default: all)
export function check(text, options = {}) {
  return runRules(RULES, String(text ?? ''), options);
}

// Applies the first suggestion of every issue, re-checking until nothing
// more can be fixed. Returns { text, applied }.
export function fixAll(text, options = {}) {
  let current = String(text ?? '');
  let applied = 0;
  for (let round = 0; round < 5; round++) {
    const issues = check(current, options).filter((i) => i.suggestions.length);
    if (!issues.length) break;
    const r = applyFixes(current, issues);
    if (!r.applied || r.text === current) break;
    current = r.text;
    applied += r.applied;
  }
  return { text: current, applied };
}

// Rule metadata for documentation and settings screens.
export function listRules() {
  return RULES.map(({ id, category, severity, title, description, examples }) => ({
    id, category, severity, title, description, examples,
  }));
}

export { applyFix, applyFixes, CATEGORIES, SEVERITIES };
