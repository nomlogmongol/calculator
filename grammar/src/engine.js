// Rule runner: turns text into a sorted list of issues and applies fixes.

import { createDocument } from './text.js';

export const SEVERITIES = ['error', 'warning', 'suggestion'];

export const CATEGORIES = {
  characters: { mn: 'Үсэг, тэмдэгт', en: 'Letters & characters' },
  harmony: { mn: 'Эгшиг зохицох ёс', en: 'Vowel harmony' },
  spelling: { mn: 'Зөв бичих дүрэм', en: 'Spelling rules' },
  punctuation: { mn: 'Цэг тэмдэг', en: 'Punctuation' },
  style: { mn: 'Найруулга', en: 'Style' },
};

const SEVERITY_RANK = { error: 0, warning: 1, suggestion: 2 };

// rules: array of rule objects { id, category, severity, title, check(doc, report) }.
// options.disabled: array of rule ids or categories to skip.
// options.minSeverity: drop issues below this severity ('suggestion' keeps all).
export function runRules(rules, text, options = {}) {
  const disabled = new Set(options.disabled || []);
  const minRank = SEVERITY_RANK[options.minSeverity || 'suggestion'];
  const doc = createDocument(text);
  const issues = [];
  for (const rule of rules) {
    if (disabled.has(rule.id) || disabled.has(rule.category)) continue;
    const report = (r) => {
      const severity = r.severity || rule.severity;
      if (SEVERITY_RANK[severity] > minRank) return;
      issues.push({
        rule: rule.id,
        category: rule.category,
        severity,
        start: r.start,
        end: r.end,
        text: text.slice(r.start, r.end),
        message: r.message,
        suggestions: (r.suggestions || []).filter((s, i, all) => s !== text.slice(r.start, r.end) && all.indexOf(s) === i),
      });
    };
    rule.check(doc, report);
  }
  return dedupe(issues).sort(
    (a, b) => a.start - b.start || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.end - b.end,
  );
}

// Two rules may describe the same problem on the same span; keep the first.
function dedupe(issues) {
  const seen = new Set();
  const out = [];
  for (const issue of issues) {
    const key = `${issue.start}:${issue.end}:${issue.suggestions[0] ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

// Replaces the issue span with one of its suggestions.
export function applyFix(text, issue, suggestionIndex = 0) {
  const replacement = issue.suggestions[suggestionIndex];
  if (replacement === undefined) return text;
  return text.slice(0, issue.start) + replacement + text.slice(issue.end);
}

// Applies the first suggestion of every fixable, non-overlapping issue.
// Returns { text, applied } where applied counts the fixes made.
export function applyFixes(text, issues) {
  const fixable = issues.filter((i) => i.suggestions.length).sort((a, b) => a.start - b.start || a.end - b.end);
  const chosen = [];
  let lastEnd = -1;
  for (const issue of fixable) {
    if (issue.start < lastEnd) continue;
    chosen.push(issue);
    lastEnd = issue.end;
  }
  let out = text;
  for (let i = chosen.length - 1; i >= 0; i--) out = applyFix(out, chosen[i]);
  return { text: out, applied: chosen.length };
}
