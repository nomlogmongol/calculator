/* Web interface for the checker. Needs mongol-grammar.js (window.MongolGrammar). */
(function () {
  'use strict';

  var MG = window.MongolGrammar;
  var $ = function (id) { return document.getElementById(id); };
  var input = $('input');
  var highlights = $('highlights');
  var list = $('issues');
  var empty = $('empty');
  var status = $('status');

  var I18N = {
    mn: {
      title: 'Дүрэм шалгагч',
      appName: 'Монгол хэлний дүрэм шалгагч',
      home: 'Нүүр',
      intro: 'Текстээ бичих эсвэл буулгахад эгшиг зохицол, нөхцөл залгавар, асуух сул үг, цэг тэмдэг, холилдсон үсгийн алдааг шууд олж, засах санал гаргана.',
      editorLabel: 'Шалгах текст',
      fixAll: 'Бүгдийг засах',
      sample: 'Жишээ',
      copy: 'Хуулах',
      copied: 'Хуулагдлаа.',
      clear: 'Арилгах',
      placeholder: 'Энд текстээ бичнэ үү эсвэл буулгана уу…',
      issuesTitle: 'Илэрсэн зүйлс',
      filterLabel: 'Шүүлтүүр',
      settings: 'Тохиргоо',
      settingsHelp: 'Шалгах ангиллаа сонгоно уу. Сонголт таны хөтөч дээр хадгалагдана.',
      rulesTitle: 'Шалгадаг дүрмүүд',
      colRule: 'Дүрэм',
      colExample: 'Жишээ',
      aboutTitle: 'Тухай',
      footer: 'Текст таны төхөөрөмжөөс гадагш гарахгүй: бүх шалгалт хөтөч дотор хийгдэнэ.',
      noIssues: 'Алдаа олдсонгүй.',
      emptyText: 'Текст оруулахад илэрсэн алдаа энд харагдана.',
      ignore: 'Алгасах',
      remove: '(устгах)',
      words: 'үг',
      fixed: function (n) { return n + ' засвар хийлээ.'; },
      nothingToFix: 'Автоматаар засах зүйл алга.',
      severity: { error: 'Алдаа', warning: 'Анхааруулга', suggestion: 'Зөвлөмж' },
      counted: { error: 'алдаа', warning: 'анхааруулга', suggestion: 'зөвлөмж' },
      about:
        '<p>Энэ хэрэгсэл нь монгол хэлний кирилл бичгийн нийтлэг алдааг дүрэмд суурилсан аргаар илрүүлдэг:</p>' +
        '<ul>' +
        '<li>эгшиг зохицох ёс: нөхцөл, дагаврын эр/эм, о/ө хувилбар (номоос, гэрээс, өдрөөс);</li>' +
        '<li>харьяалахын болон заахын тийн ялгал (-ын/-ийн, -ыг/-ийг, -ны/-ний);</li>' +
        '<li>асуух сул үг (уу/үү/юу/юү, вэ/бэ) болон тусдаа бичих сул үг (ямар ч);</li>' +
        '<li>тоо, товчилсон үг, латин үгэнд нөхцөл залгах зураас (2024-ийн, АНУ-ын, Facebook-ээр);</li>' +
        '<li>латин болон хуучин фонтын үсэг холилдох (ѳдѳр, сэрvvн), эвдэрсэн кодчилол;</li>' +
        '<li>цэг тэмдэг, зай, давхардсан үг, түгээмэл алдаатай үгс.</li>' +
        '</ul>' +
        '<p>Дүрмүүдийг 75 мянган мэдээний нийтлэл дээр туршиж, буруу дохио өгөх тохиолдлыг багасгасан. ' +
        'Харь үг, хүний нэр, нийлмэл үгийг эгшиг зохицлоор шалгахгүй. Бүрэн толь бичигт тулгуурласан үг үсгийн ' +
        'шалгалт хийхгүй тул бүх алдааг олно гэсэн үг биш.</p>' +
        '<p>Хөгжүүлэгчид: <code>grammar/src/index.js</code> модулийг Node.js болон хөтөч дээр ашиглаж болно. ' +
        'Тушаалын мөрөөс: <code>node grammar/cli.js файл.txt</code>.</p>',
    },
    en: {
      title: 'Grammar checker',
      appName: 'Mongolian grammar checker',
      home: 'Home',
      intro: 'Type or paste Mongolian (Cyrillic) text to find vowel harmony, suffix, question particle, punctuation and mixed-alphabet errors, with one-click fixes.',
      editorLabel: 'Text to check',
      fixAll: 'Fix all',
      sample: 'Example',
      copy: 'Copy',
      copied: 'Copied.',
      clear: 'Clear',
      placeholder: 'Type or paste your text here…',
      issuesTitle: 'Issues',
      filterLabel: 'Filter',
      settings: 'Settings',
      settingsHelp: 'Choose which categories to check. Your choice is saved in this browser.',
      rulesTitle: 'Rules',
      colRule: 'Rule',
      colExample: 'Example',
      aboutTitle: 'About',
      footer: 'Your text never leaves your device: all checking happens in the browser.',
      noIssues: 'No issues found.',
      emptyText: 'Issues will appear here once you enter some text.',
      ignore: 'Ignore',
      remove: '(delete)',
      words: 'words',
      fixed: function (n) { return n === 1 ? '1 fix applied.' : n + ' fixes applied.'; },
      nothingToFix: 'Nothing to fix automatically.',
      severity: { error: 'Error', warning: 'Warning', suggestion: 'Suggestion' },
      counted: { error: 'errors', warning: 'warnings', suggestion: 'suggestions' },
      about:
        '<p>This tool finds common errors in Mongolian Cyrillic text with hand-written, rule-based checks:</p>' +
        '<ul>' +
        '<li>vowel harmony of suffixes: back/front and о/ө variants (номоос, гэрээс, өдрөөс);</li>' +
        '<li>genitive and accusative endings (-ын/-ийн, -ыг/-ийг, -ны/-ний);</li>' +
        '<li>question particles (уу/үү/юу/юү, вэ/бэ) and particles written apart (ямар ч);</li>' +
        '<li>hyphens after numbers, abbreviations and Latin words (2024-ийн, АНУ-ын, Facebook-ээр);</li>' +
        '<li>Latin and legacy-font letters inside Mongolian words (ѳдѳр, сэрvvн) and broken encodings;</li>' +
        '<li>punctuation, spacing, repeated words and frequently misspelled words.</li>' +
        '</ul>' +
        '<p>The rules were tested on 75,000 news articles to keep false alarms rare. Loanwords, personal names and ' +
        'compounds are not checked for vowel harmony. There is no full dictionary-based spell check, so not every ' +
        'error is found.</p>' +
        '<p>Developers: use <code>grammar/src/index.js</code> in Node.js or the browser, or run ' +
        '<code>node grammar/cli.js file.txt</code> from the command line.</p>',
    },
  };

  var SAMPLE = 'Сайн байна уу ? Mонгол улсын нийслэл Улаанбаатар хотод 2024онд олон улсын чуулган болно. ' +
    'Тус хурлын тухаи мэдээлэлийг АНУын хэвлэлүүд Facebookээр түгээжээ. гишүүдын санал , хүсэлтийг ' +
    'хороооны дарга хүлээн авсан.\n\nТа ирэх уу? Хурал хэзээ эхлэх бэ? Энэ асуудал ямарч хүндрэлгүй. ' +
    'Бид номээс олон зүйл сурсан. Говь Алтай аймагт ѳвѳл сэрvvн байна.';

  var SEVERITY_RANK = { error: 0, warning: 1, suggestion: 2 };
  var PREFIX = 'mongol-grammar:';

  function load(key, fallback) {
    try {
      var v = window.localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) { /* storage unavailable: settings last for this visit only */ }
  }

  var state = {
    lang: load('lang', 'mn') === 'en' ? 'en' : 'mn',
    severities: load('severities', { error: true, warning: true, suggestion: true }),
    disabled: load('disabled', []),
    ignored: {},
    visible: [],
    active: -1,
  };
  var RULES = {};
  MG.listRules().forEach(function (r) { RULES[r.id] = r; });

  function t(key) { return I18N[state.lang][key]; }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Shows spaces and invisible characters inside the issue list.
  function visible(s) {
    if (s === '') return t('remove');
    return s.replace(/ /g, '␣').replace(/\n/g, '⏎').replace(/[­​-‍⁠﻿]/g, '¤');
  }

  function ignoreKey(issue, text) {
    return issue.rule + '|' + text.slice(Math.max(0, issue.start - 12), issue.end + 12);
  }

  function visibleIssues(text) {
    return MG.check(text, { disabled: state.disabled }).filter(function (i) {
      return state.severities[i.severity] && !state.ignored[ignoreKey(i, text)];
    });
  }

  // Checking -----------------------------------------------------------------

  function runCheck() {
    var text = input.value;
    state.visible = visibleIssues(text);
    if (state.active >= state.visible.length) state.active = -1;
    renderHighlights(text);
    renderList();
    renderStatus(text);
    autoGrow();
    save('draft', text);
  }

  var timer = null;
  function scheduleCheck() {
    clearTimeout(timer);
    timer = setTimeout(runCheck, 150);
  }

  function renderHighlights(text) {
    var issues = state.visible;
    var points = [0, text.length];
    issues.forEach(function (i) { points.push(i.start, i.end); });
    points = points.filter(function (p, k) { return points.indexOf(p) === k; }).sort(function (a, b) { return a - b; });
    var html = '';
    for (var k = 0; k < points.length - 1; k++) {
      var a = points[k];
      var b = points[k + 1];
      var seg = escapeHtml(text.slice(a, b));
      var best = -1;
      for (var n = 0; n < issues.length; n++) {
        var i = issues[n];
        if (i.start <= a && i.end >= b) {
          if (best < 0 || SEVERITY_RANK[i.severity] < SEVERITY_RANK[issues[best].severity] ||
            (i.severity === issues[best].severity && i.end - i.start < issues[best].end - issues[best].start)) best = n;
        }
      }
      if (best >= 0) {
        html += '<mark class="' + issues[best].severity + (best === state.active ? ' active' : '') +
          '" data-idx="' + best + '">' + seg + '</mark>';
      } else {
        html += seg;
      }
    }
    // A trailing line break only takes up a line when something follows it.
    highlights.innerHTML = html + ' ';
  }

  function button(label, className, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className || '';
    b.textContent = label;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  function renderList() {
    var lang = state.lang;
    list.textContent = '';
    var frag = document.createDocumentFragment();
    state.visible.forEach(function (issue, idx) {
      var li = document.createElement('li');
      li.className = 'issue ' + issue.severity + (idx === state.active ? ' active' : '');
      li.tabIndex = 0;
      li.dataset.idx = String(idx);
      var rule = RULES[issue.rule];
      li.innerHTML =
        '<div class="issue-head"><span class="badge">' + escapeHtml(t('severity')[issue.severity]) + '</span>' +
        '<span>' + escapeHtml(rule ? rule.title[lang] : issue.rule) + '</span></div>' +
        '<p class="issue-msg">' + escapeHtml(issue.message[lang]) + '</p>';
      var fixes = document.createElement('div');
      fixes.className = 'fixes';
      var del = document.createElement('del');
      del.textContent = visible(issue.text);
      fixes.appendChild(del);
      if (issue.suggestions.length) {
        fixes.appendChild(document.createTextNode('→'));
        issue.suggestions.forEach(function (s, k) {
          fixes.appendChild(button(visible(s), k ? 'secondary outline' : '', function () { applySuggestion(issue, k); }));
        });
      }
      fixes.appendChild(button(t('ignore'), 'ignore secondary outline', function () {
        state.ignored[ignoreKey(issue, input.value)] = true;
        state.active = -1;
        runCheck();
      }));
      li.appendChild(fixes);
      li.addEventListener('click', function () { focusIssue(idx, true); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') focusIssue(idx, true);
      });
      frag.appendChild(li);
    });
    list.appendChild(frag);
    empty.hidden = state.visible.length > 0;
    empty.textContent = input.value.trim() ? t('noIssues') : t('emptyText');
  }

  function counts() {
    var n = { error: 0, warning: 0, suggestion: 0 };
    state.visible.forEach(function (i) { n[i.severity]++; });
    return n;
  }

  function renderStatus(text, note) {
    var words = (text.match(/\p{L}+/gu) || []).length;
    var n = counts();
    var label = t('counted');
    status.textContent = (note ? note + ' ' : '') + words + ' ' + t('words') + ' · ' +
      n.error + ' ' + label.error + ' · ' + n.warning + ' ' + label.warning + ' · ' +
      n.suggestion + ' ' + label.suggestion;
  }

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 2 + 'px';
  }

  // Editing ------------------------------------------------------------------

  // Replaces part of the text. execCommand keeps the browser's undo history
  // (Ctrl+Z) working; setRangeText is the fallback.
  function replaceRange(start, end, replacement) {
    input.focus({ preventScroll: true });
    input.setSelectionRange(start, end);
    var ok = false;
    try {
      ok = document.execCommand('insertText', false, replacement);
    } catch (e) { ok = false; }
    if (!ok || input.value.slice(start, start + replacement.length) !== replacement) {
      input.setRangeText(replacement, start, end, 'end');
    }
    runCheck();
  }

  function applySuggestion(issue, k) {
    state.active = -1;
    replaceRange(issue.start, issue.end, issue.suggestions[k]);
  }

  function fixAll() {
    var text = input.value;
    var total = 0;
    for (var round = 0; round < 5; round++) {
      var r = MG.applyFixes(text, visibleIssues(text));
      if (!r.applied || r.text === text) break;
      text = r.text;
      total += r.applied;
    }
    if (total) replaceRange(0, input.value.length, text);
    renderStatus(input.value, total ? t('fixed')(total) : t('nothingToFix'));
  }

  function focusIssue(idx, fromList) {
    state.active = idx;
    var issue = state.visible[idx];
    renderHighlights(input.value);
    Array.prototype.forEach.call(list.children, function (li, k) {
      li.classList.toggle('active', k === idx);
      if (k === idx && !fromList) li.scrollIntoView({ block: 'nearest' });
    });
    if (fromList && issue) {
      var mark = highlights.querySelector('mark[data-idx="' + idx + '"]');
      if (mark) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
      input.focus({ preventScroll: true });
      input.setSelectionRange(issue.start, issue.end);
    }
  }

  // Highlights the issue under the caret.
  function syncCaret() {
    var pos = input.selectionStart;
    for (var k = 0; k < state.visible.length; k++) {
      var i = state.visible[k];
      if (pos >= i.start && pos <= i.end) {
        if (k !== state.active) focusIssue(k, false);
        return;
      }
    }
  }

  // Filters and settings -----------------------------------------------------

  function checkbox(labelText, checked, onChange) {
    var label = document.createElement('label');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = checked;
    box.addEventListener('change', function () { onChange(box.checked); });
    label.appendChild(box);
    label.appendChild(document.createTextNode(' ' + labelText));
    return label;
  }

  function renderFilters() {
    var sevBox = $('severity-filters');
    var legend = sevBox.querySelector('legend');
    sevBox.textContent = '';
    sevBox.appendChild(legend);
    ['error', 'warning', 'suggestion'].forEach(function (sev) {
      sevBox.appendChild(checkbox(t('severity')[sev], state.severities[sev] !== false, function (on) {
        state.severities[sev] = on;
        save('severities', state.severities);
        runCheck();
      }));
    });
    var catBox = $('category-filters');
    catBox.textContent = '';
    Object.keys(MG.CATEGORIES).forEach(function (cat) {
      catBox.appendChild(checkbox(MG.CATEGORIES[cat][state.lang], state.disabled.indexOf(cat) < 0, function (on) {
        state.disabled = state.disabled.filter(function (c) { return c !== cat; });
        if (!on) state.disabled.push(cat);
        save('disabled', state.disabled);
        runCheck();
      }));
    });
  }

  function renderRules() {
    var lang = state.lang;
    var body = $('rules');
    body.textContent = '';
    MG.listRules().forEach(function (r) {
      var tr = document.createElement('tr');
      var ex = r.examples[0];
      tr.innerHTML =
        '<td><div class="rule-title">' + escapeHtml(r.title[lang]) + '</div>' +
        '<div class="rule-meta">' + escapeHtml(MG.CATEGORIES[r.category][lang]) + ' · ' +
        escapeHtml(t('severity')[r.severity]) + ' · <code>' + escapeHtml(r.id) + '</code></div>' +
        '<div>' + escapeHtml(r.description[lang]) + '</div></td>' +
        '<td class="example">' + (ex ? '<del>' + escapeHtml(ex[0]) + '</del> → <ins>' + escapeHtml(ex[1]) + '</ins>' : '') + '</td>';
      body.appendChild(tr);
    });
  }

  function applyLanguage() {
    var dict = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.title = dict.title;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = dict[el.getAttribute('data-i18n')];
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-placeholder]'), function (el) {
      el.placeholder = dict[el.getAttribute('data-i18n-placeholder')];
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-html]'), function (el) {
      el.innerHTML = dict[el.getAttribute('data-i18n-html')];
    });
    $('lang').textContent = state.lang === 'mn' ? 'EN' : 'MN';
    renderFilters();
    renderRules();
    runCheck();
  }

  // Wiring -------------------------------------------------------------------

  input.addEventListener('input', function () {
    state.active = -1;
    autoGrow();
    scheduleCheck();
  });
  input.addEventListener('click', syncCaret);
  input.addEventListener('keyup', function (e) {
    if (e.key.indexOf('Arrow') === 0 || e.key === 'Home' || e.key === 'End') syncCaret();
  });
  window.addEventListener('resize', autoGrow);

  $('fix-all').addEventListener('click', fixAll);
  $('sample').addEventListener('click', function () {
    state.ignored = {};
    replaceRange(0, input.value.length, SAMPLE);
  });
  $('clear').addEventListener('click', function () {
    state.ignored = {};
    replaceRange(0, input.value.length, '');
  });
  $('copy').addEventListener('click', function () {
    var done = function () { renderStatus(input.value, t('copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(input.value).then(done, function () {
        input.select();
        if (document.execCommand('copy')) done();
      });
    } else {
      input.select();
      if (document.execCommand('copy')) done();
    }
  });
  $('lang').addEventListener('click', function () {
    state.lang = state.lang === 'mn' ? 'en' : 'mn';
    save('lang', state.lang);
    applyLanguage();
  });

  input.value = load('draft', '') || '';
  applyLanguage();
})();
