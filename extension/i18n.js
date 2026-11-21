/* Copyit language switch. Replaces the English texts of Copyit's own pages with the chosen language.
   Works from a built-in word list (i18n-data.js). Nothing is sent anywhere. */
(() => {
  const LANGS = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['it', 'Italiano'], ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['ja', '日本語'], ['ko', '한국어'], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文']];
  const DATA = window.COPYIT_I18N || {}, RE = window.COPYIT_I18N_RE || {}, KEY = 'copyitLang';
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const orig = new WeakMap();                       // node or "node|attr" holder -> { en, out }
  let lang = 'en', dict = null, busy = false, queued = false;
  try { const s = localStorage.getItem(KEY); if (s && (s === 'en' || DATA[s])) lang = s; } catch { }
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const tr = en => {
    if (!dict) return null; const k = norm(en); if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(dict, k)) return dict[k];
    for (const [re, rep] of (RE[lang] || [])) { const r = new RegExp(re); if (r.test(k)) return k.replace(r, rep); }
    return null;
  };
  function doText(n) {
    const v = n.nodeValue, rec = orig.get(n);
    if (rec && v === rec.out) return;               // already our output
    if (!v || !/\S/.test(v)) return;
    const t = tr(v);
    if (t == null) { if (rec) orig.delete(n); return; }
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0], out = lead + t + trail;
    orig.set(n, { en: v, out }); n.nodeValue = out;
  }
  const attrStore = new WeakMap();
  function doAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a); let m = attrStore.get(el); if (!m) { m = {}; attrStore.set(el, m); }
      if (m[a] && v === m[a].out) continue;
      const t = tr(v); if (t == null) { delete m[a]; continue; }
      m[a] = { en: v, out: t }; el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(root.tagName) || root.closest?.('[data-no-i18n]')) return; doAttrs(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      if (n.nodeType === 3) { const p = n.parentElement; if (p && (/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(p.tagName) || p.closest('[data-no-i18n]'))) continue; doText(n); }
      else { if (/^(SCRIPT|STYLE)$/.test(n.tagName)) continue; doAttrs(n); }
    }
  }
  function revert(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { const r = orig.get(n); if (r && n.nodeValue === r.out) n.nodeValue = r.en; orig.delete(n); }
      else { const m = attrStore.get(n); if (m) { for (const a in m) if (n.getAttribute(a) === m[a].out) n.setAttribute(a, m[a].en); attrStore.delete(n); } }
    }
  }
  const mo = new MutationObserver(muts => {
    if (busy || lang === 'en') return;
    if (queued) { for (const m of muts) pending.push(m); return; }
    queued = true; pending.push(...muts);
    requestAnimationFrame(() => {
      queued = false; const ms = pending.splice(0); busy = true;
      try { for (const m of ms) { if (m.type === 'characterData') doText(m.target); else if (m.type === 'attributes') doAttrs(m.target); else m.addedNodes.forEach(walk); } } finally { busy = false; }
      const t = tr(document.title); if (t != null && document.title !== t) { origTitle = origTitle || document.title; document.title = t; }
    });
  });
  const pending = []; let origTitle = '';
  function apply(l, persist) {
    busy = true;
    try {
      revert(document.documentElement); if (origTitle) { document.title = origTitle; origTitle = ''; }
      lang = (l === 'en' || DATA[l]) ? l : 'en'; dict = lang === 'en' ? null : DATA[lang];
      const rtl = lang === 'ar';
      document.documentElement.lang = lang; document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      if (dict) { walk(document.documentElement); const t = tr(document.title); if (t != null) { origTitle = document.title; document.title = t; } }
    } finally { busy = false; }
    if (persist) { try { localStorage.setItem(KEY, lang); } catch { } try { chrome.storage.local.set({ copyitLang: lang }); } catch { } }
    const sel = document.getElementById('langSel'); if (sel && sel.value !== lang) sel.value = lang;
  }
  function start() {
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    const sel = document.getElementById('langSel');
    if (sel) {
      sel.innerHTML = ''; for (const [c, n] of LANGS) { const o = document.createElement('option'); o.value = c; o.textContent = n; sel.appendChild(o); }
      sel.setAttribute('data-no-i18n', ''); sel.value = lang;
      sel.addEventListener('change', () => apply(sel.value, true));
    }
    const lb = document.getElementById('langBtn'), lm = document.getElementById('langMenu');
    if (lb && lm) {
      for (const [c, n] of LANGS) { const b = document.createElement('button'); b.type = 'button'; b.dataset.lang = c; b.innerHTML = '<span></span><svg class="i ck" viewBox="0 0 24 24"><path d="M5 12.5l4.500 4.500L19 7.500"/></svg>'; b.firstChild.textContent = n; lm.appendChild(b); }
      const mark = () => lm.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
      const shut = () => { lm.hidden = true; lb.setAttribute('aria-expanded', 'false'); };
      lb.addEventListener('click', e => { e.stopPropagation(); mark(); lm.hidden = !lm.hidden; lb.setAttribute('aria-expanded', String(!lm.hidden)); });
      lm.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; shut(); apply(b.dataset.lang, true); });
      document.addEventListener('click', e => { if (!lm.hidden && !e.target.closest('.langwrap')) shut(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lm.hidden) { shut(); lb.focus(); } });
    }
    apply(lang, false);
  }
  addEventListener('storage', e => { if (e.key === KEY && e.newValue && e.newValue !== lang) apply(e.newValue, false); });
  try { chrome.storage.local.get('copyitLang').then(r => { const s = r && r.copyitLang; if (s && s !== lang && (s === 'en' || DATA[s])) { try { localStorage.setItem(KEY, s); } catch { } apply(s, false); } }); } catch { }
  window.CopyitI18n = { LANGS, apply: l => apply(l, true), get lang() { return lang; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
