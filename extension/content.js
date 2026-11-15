/* Copyit page helper (v1.1.0).
   Runs only after you switch on "Click to copy" or "Copy text from images & videos", or when you use the
   right-click "Copy text from image / video" item. It never sends page text anywhere: copies go to your
   clipboard and, if you allow it, into your Copyit list on this device. */
(() => {
  if (window.__copyitCS) { window.__copyitCS.boot(); return; }

  const SETTINGS_KEY = 'copyitSettings';
  const S = { clickCopy: false, clickUnit: 'paragraph', clickSave: true, imgText: false };
  const BLOCK_SKIP = 'input,textarea,select,option,button,a,summary,label,[contenteditable],[contenteditable="true"],[role="button"],[role="link"],[role="textbox"],[role="menuitem"],[role="tab"],[role="checkbox"],[role="switch"],script,style,noscript,svg,canvas,video,audio,img,iframe,code[data-copyit-skip]';
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VIDEO_HOST = /youtube|youtu\.be|vimeo|dailymotion|twitch|player|video|embed/i;

  /* ---------- shadow-DOM UI (isolated from the page's CSS) ---------- */
  const host = document.createElement('div');
  host.id = 'copyit-root';
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    :host{all:initial}
    *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
    .hl{position:fixed;display:none;pointer-events:none;border:2px dashed #3b6ef5;border-radius:8px;background:rgba(59,110,245,.07)}
    .ln{position:fixed;pointer-events:none;border-radius:4px;background:rgba(59,110,245,.14);border:2px dashed #3b6ef5}
    .ring{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #3b6ef5;pointer-events:none;opacity:0}
    .ring.go{animation:ring .5s ease-out}
    @keyframes ring{from{opacity:.85;transform:scale(.3)}to{opacity:0;transform:scale(1.5)}}
    @media (prefers-reduced-motion:reduce){.ring.go{animation:none}}
    .toast{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);display:none;align-items:center;gap:10px;max-width:min(520px,calc(100vw - 32px));padding:11px 16px 11px 12px;border-radius:999px;background:#12131c;color:#fff;font-size:14px;line-height:1.3;box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:auto}
    .toast.on{display:flex}
    .toast .dot{flex:none;width:20px;height:20px;border-radius:50%;background:#3b6ef5;display:grid;place-items:center}
    .toast .dot svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .toast.warn .dot{background:#e11d48}
    .toast .msg{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .toast .msg small{color:#aab1c8;margin-left:6px;font-size:12.5px}
    .toast .act{flex:none;border:0;background:rgba(255,255,255,.14);color:#fff;font:600 12.5px system-ui;padding:4px 10px;border-radius:99px;cursor:pointer}
    .spin{flex:none;width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;animation:sp .8s linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    .chip{position:fixed;display:none;align-items:center;gap:6px;height:30px;padding:0 11px 0 8px;border:0;border-radius:99px;background:#3b6ef5;color:#fff;font:600 12.5px system-ui;box-shadow:0 4px 14px rgba(20,30,80,.35);cursor:pointer;pointer-events:auto}
    .chip.on{display:inline-flex}
    .chip:hover{filter:brightness(1.08)}
    .chip svg{width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
    .mout{position:fixed;display:none;pointer-events:none;border:2px dashed #3b6ef5;border-radius:6px}
  </style>
  <div class="hl" id="hl"></div><div id="lines"></div><div class="ring" id="ring"></div><div class="mout" id="mout"></div>
  <button class="chip" id="chip" type="button" aria-label="Copy text from this image or video"><svg viewBox="0 0 24 24"><path d="M5 7V5h14v2M12 5v14M9 19h6"/></svg><span>Copy text</span></button>
  <div class="toast" id="toast" role="status" aria-live="polite"><span class="dot" id="tdot"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><span class="msg" id="tmsg"></span></div>`;
  const $ = id => root.getElementById(id);
  const hl = $('hl'), lines = $('lines'), ring = $('ring'), toastEl = $('toast'), tmsg = $('tmsg'), tdot = $('tdot'), chip = $('chip'), mout = $('mout');
  const mount = () => { if (!host.isConnected) (document.documentElement || document.body).appendChild(host); };

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg, opts = {}) {
    mount(); clearTimeout(toastTimer);
    toastEl.classList.toggle('warn', !!opts.warn);
    tdot.innerHTML = opts.busy ? '<span class="spin"></span>' : (opts.warn ? '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17v.1"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>');
    tdot.style.background = opts.busy ? 'transparent' : '';
    tmsg.textContent = msg;
    if (opts.note) { const s = document.createElement('small'); s.textContent = opts.note; tmsg.appendChild(s); }
    toastEl.querySelectorAll('.act').forEach(n => n.remove());
    if (opts.action) { const b = document.createElement('button'); b.className = 'act'; b.textContent = opts.action.label; b.addEventListener('click', () => { opts.action.fn(); }); toastEl.appendChild(b); }
    toastEl.classList.add('on');
    if (!opts.busy) toastTimer = setTimeout(() => toastEl.classList.remove('on'), opts.ms || (opts.action ? 6000 : 1900));
  }
  const hideToast = () => { clearTimeout(toastTimer); toastEl.classList.remove('on'); };

  /* ---------- clipboard + history ---------- */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      (document.body || document.documentElement).appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch { return false; }
  }
  function saveToCopyit(text, source) {
    if (!S.clickSave) return;
    try { chrome.runtime.sendMessage({ type: 'SAVE_ENTRY', entry: { content: text, source } }, () => void chrome.runtime.lastError); } catch { }
  }
  const tidy = s => String(s).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  /* ---------- finding the paragraph / sentence under the pointer ---------- */
  const isInline = el => { const d = getComputedStyle(el).display; return d.startsWith('inline') || d === 'contents' || d === 'ruby' || d === 'ruby-text'; };
  const blockOf = el => { while (el && el.parentElement && isInline(el)) el = el.parentElement; return el; };
  function textNodesOf(block) {
    const out = [], w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement; if (!p || p.closest('script,style,noscript,textarea,[hidden],[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
        return blockOf(p) === block ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    for (let n; (n = w.nextNode());) out.push(n);
    return out;
  }
  function caretAt(x, y) {
    let n = null, o = 0;
    if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); if (c) { n = c.offsetNode; o = c.offset; } }
    else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { n = r.startContainer; o = r.startOffset; } }
    return n && n.nodeType === 3 ? { node: n, offset: o } : null;
  }
  const rectHas = (r, x, y, pad = 3) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  function targetAt(x, y, el) {
    if (!el || el === host || host.contains(el)) return null;
    if (el.closest && el.closest(BLOCK_SKIP)) return null;
    const c = caretAt(x, y); if (!c) return null;
    const p = c.node.parentElement; if (!p || p.closest(BLOCK_SKIP)) return null;
    const block = blockOf(p); if (!block || block === document.body && !block.childElementCount) return null;
    const nodes = textNodesOf(block); if (!nodes.length) return null;
    const first = nodes[0], last = nodes[nodes.length - 1];
    const whole = document.createRange(); whole.setStart(first, 0); whole.setEnd(last, last.nodeValue.length);
    const bounds = whole.getBoundingClientRect();
    if (!rectHas(bounds, x, y, 6)) return null;
    // the pointer has to be on the text itself (inside one of its line boxes), not out in the margin
    if (![...whole.getClientRects()].some(r => rectHas(r, x, y, 4))) return null;
    return { block, nodes, caret: c, whole };
  }
  function sentenceRange(t) {
    let raw = '', map = [];                                        // raw string + node offsets
    for (const n of t.nodes) { map.push({ n, s: raw.length }); raw += n.nodeValue; }
    let at = 0; const ci = t.nodes.indexOf(t.caret.node);
    if (ci >= 0) at = map[ci].s + Math.min(t.caret.offset, t.caret.node.nodeValue.length);
    const segs = [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) for (const s of new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(raw)) segs.push(s);
    let k = segs.findIndex(s => at >= s.index && at < s.index + s.segment.length); if (k < 0 && segs.length) k = segs.length - 1;
    const seg = k >= 0 ? segs[k] : null;
    let a = seg ? seg.index : 0, b = seg ? seg.index + seg.segment.length : raw.length;
    while (a < b && /\s/.test(raw[a])) a++;
    while (b > a && /\s/.test(raw[b - 1])) b--;
    const locate = (pos, end) => { for (let i = map.length - 1; i >= 0; i--) if (pos >= map[i].s) { const off = Math.min(pos - map[i].s, map[i].n.nodeValue.length); if (!end || off > 0 || i === 0) return [map[i].n, off]; } return [map[0].n, 0]; };
    const [sn, so] = locate(a, false), [en, eo] = locate(b, true);
    const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo);
    const idx = { k: k + 1, tot: segs.length };
    return { range: r, text: tidy(raw.slice(a, b)), idx };
  }

  /* ---------- hover highlight ---------- */
  function clearHl() { hl.style.display = 'none'; lines.textContent = ''; mout.style.display = 'none'; current = null; }
  function showBox(r) {
    const pad = 4;
    Object.assign(hl.style, { display: 'block', left: Math.max(0, r.left - pad) + 'px', top: Math.max(0, r.top - pad) + 'px', width: Math.min(innerWidth, r.width + pad * 2) + 'px', height: r.height + pad * 2 + 'px' });
  }
  let current = null;                                               // what a click would copy right now
  function updateHover(x, y, el) {
    if (!S.clickCopy || S.clickUnit === 'selection') { if (current) clearHl(); return; }
    const sel = getSelection();
    if (sel && !sel.isCollapsed) { clearHl(); return; }
    const t = targetAt(x, y, el);
    if (!t) { clearHl(); return; }
    mount();
    if (S.clickUnit === 'sentence') {
      const s = sentenceRange(t);
      if (!s.text) { clearHl(); return; }
      lines.textContent = '';
      const rects = [...s.range.getClientRects()].filter(r => r.width > 1);
      for (const r of rects) { const d = document.createElement('div'); d.className = 'ln'; Object.assign(d.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); lines.appendChild(d); }
      hl.style.display = 'none';
      current = { text: s.text, label: 'Sentence copied', note: s.idx.tot > 1 ? `${s.idx.k} of ${s.idx.tot}` : '' };
    } else {
      lines.textContent = '';
      showBox(t.whole.getBoundingClientRect());
      current = { text: tidy(t.nodes.map(n => n.nodeValue).join('')), label: 'Text copied', note: '' };
    }
  }

  /* ---------- clicking ---------- */
  function burst(x, y) {
    if (REDUCE) return;
    ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
  }
  async function doCopy(text, label, note, x, y, source) {
    if (!text) return;
    const ok = await copyText(text);
    if (ok) { if (x != null) burst(x, y); toast(label, { note }); saveToCopyit(text, source); }
    else toast("Couldn't reach the clipboard", { warn: true, action: { label: 'Try again', fn: async () => { if (await copyText(text)) { toast(label, { note }); saveToCopyit(text, source); } } } });
  }
  function onClick(e) {
    if (!S.clickCopy || S.clickUnit === 'selection') return;
    if (!e.isTrusted || e.button !== 0 || e.detail > 1 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const sel = getSelection(); if (sel && !sel.isCollapsed) return;
    const path = e.composedPath ? e.composedPath()[0] : e.target;
    const t = targetAt(e.clientX, e.clientY, path instanceof Element ? path : e.target); if (!t) return;
    let text, label = 'Text copied', note = '';
    if (S.clickUnit === 'sentence') { const s = sentenceRange(t); text = s.text; label = 'Sentence copied'; note = s.idx.tot > 1 ? `${s.idx.k} of ${s.idx.tot}` : ''; }
    else text = tidy(t.nodes.map(n => n.nodeValue).join(''));
    doCopy(text, label, note, e.clientX, e.clientY, 'click-to-copy');
  }
  let selTimer = 0;
  function onMouseUp(e) {
    if (!S.clickCopy || S.clickUnit !== 'selection' || e.button !== 0 || e.altKey) return;
    clearTimeout(selTimer);
    selTimer = setTimeout(() => {
      const sel = getSelection(); if (!sel || sel.isCollapsed) return;
      const a = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      if (a && a.closest && a.closest('input,textarea,[contenteditable]')) return;
      const text = tidy(sel.toString()); if (!text) return;
      doCopy(text, 'Selected text copied', '', null, null, 'click-to-copy');
    }, 60);
  }

  /* ---------- images & videos: the "Copy text" chip ---------- */
  const isMedia = el => {
    if (!(el instanceof Element) || host.contains(el)) return false;
    const r = el.getBoundingClientRect();
    if (el.tagName === 'IMG') return r.width >= 40 && r.height >= 24 && el.complete && el.naturalWidth > 0;
    if (el.tagName === 'VIDEO') return r.width >= 80 && r.height >= 50;
    if (el.tagName === 'CANVAS') return r.width >= 80 && r.height >= 50;
    if (el.tagName === 'IFRAME') return r.width >= 200 && r.height >= 110 && VIDEO_HOST.test((el.src || '') + ' ' + (el.title || ''));
    return false;
  };
  let mediaEl = null, chipHold = false, chipTimer = 0, busy = false;
  function placeChip() {
    if (!mediaEl || !mediaEl.isConnected) { hideChip(); return; }
    const r = mediaEl.getBoundingClientRect();
    const vis = { l: Math.max(0, r.left), t: Math.max(0, r.top), r: Math.min(innerWidth, r.right), b: Math.min(innerHeight, r.bottom) };
    if (vis.r - vis.l < 40 || vis.b - vis.t < 24) { hideChip(); return; }
    mount(); chip.classList.add('on');
    chip.style.left = Math.max(6, vis.r - chip.offsetWidth - 8) + 'px'; chip.style.top = Math.max(6, vis.t + 8) + 'px';
    Object.assign(mout.style, { display: 'block', left: vis.l + 'px', top: vis.t + 'px', width: vis.r - vis.l + 'px', height: vis.b - vis.t + 'px' });
  }
  function hideChip() { chip.classList.remove('on'); mout.style.display = 'none'; mediaEl = null; }
  function hoverMedia(x, y) {
    if (!S.imgText || busy) return;
    let m = null;
    for (const el of document.elementsFromPoint(x, y)) { if (el === host) continue; if (isMedia(el)) { m = el; break; } }
    clearTimeout(chipTimer);
    if (m) { mediaEl = m; placeChip(); }
    else if (mediaEl && !chipHold) chipTimer = setTimeout(() => { if (!chipHold) hideChip(); }, 350);
  }
  chip.addEventListener('mouseenter', () => { chipHold = true; clearTimeout(chipTimer); });
  chip.addEventListener('mouseleave', () => { chipHold = false; chipTimer = setTimeout(hideChip, 350); });
  chip.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (mediaEl) readText(mediaEl); });

  const frames = n => new Promise(res => { const step = () => (n-- <= 0 ? res() : requestAnimationFrame(step)); step(); });
  async function readText(el) {
    if (busy) return; busy = true;
    const r = el.getBoundingClientRect();
    const rect = { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) };
    hideChip(); clearHl(); hideToast();
    await frames(2); await new Promise(r2 => setTimeout(r2, 40));   // let our own outline disappear before the screenshot
    let res;
    try { res = await chrome.runtime.sendMessage({ type: 'OCR_CAPTURE', rect, viewW: innerWidth, viewH: innerHeight }); }
    catch (err) { res = { ok: false, error: 'Copyit could not read this page. Reload it and try again.' }; }
    busy = false;
    finish(res);
  }
  async function finish(res) {
    if (!res || !res.ok) { toast(res && res.error ? res.error : 'Could not read text here', { warn: true, ms: 3200 }); return; }
    const text = tidy(res.text || '');
    if (!text) { toast('No text found here', { warn: true, note: 'Try pausing the video on a clear frame' }); return; }
    const n = [...text].length;
    const ok = await copyText(text);
    const prev = text.replace(/\s+/g, ' ').slice(0, 50);
    if (ok) { toast(`Copied ${n} character${n === 1 ? '' : 's'}`, { note: prev, ms: 2600 }); saveToCopyit(text, 'image-text'); }
    else toast("Text read, but the clipboard was blocked", { warn: true, action: { label: 'Copy', fn: async () => { if (await copyText(text)) { toast(`Copied ${n} character${n === 1 ? '' : 's'}`, { note: prev }); saveToCopyit(text, 'image-text'); } } } });
  }

  /* ---------- events ---------- */
  let px = 0, py = 0, pel = null, raf = 0;
  function onMove(e) {
    px = e.clientX; py = e.clientY; pel = e.target;
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; if (S.clickCopy) updateHover(px, py, pel); if (S.imgText) hoverMedia(px, py); });
  }
  const onKey = e => { if (e.key === 'Escape') { clearHl(); hideChip(); hideToast(); } };
  const onScroll = () => { if (current) clearHl(); if (mediaEl) placeChip(); };
  const onOut = e => { if (!e.relatedTarget || e.relatedTarget.tagName === 'IFRAME') clearHl(); };
  let wired = false;
  function wire(on) {
    const f = on ? 'addEventListener' : 'removeEventListener';
    if (on === wired) return; wired = on;
    window[f]('pointermove', onMove, { capture: true, passive: true });
    window[f]('click', onClick, true);
    window[f]('mouseup', onMouseUp, true);
    window[f]('keydown', onKey, true);
    window[f]('scroll', onScroll, { capture: true, passive: true });
    document[f]('mouseleave', clearHl);
    document[f]('mouseout', onOut, true);
    if (!on) { clearHl(); hideChip(); }
  }
  function apply(next) {
    Object.assign(S, next || {});
    wire(!!(S.clickCopy || S.imgText));
    if (!S.clickCopy) clearHl();
    if (!S.imgText) hideChip();
  }
  function boot() {
    try { chrome.storage.local.get(SETTINGS_KEY, d => { void chrome.runtime.lastError; apply((d && d[SETTINGS_KEY]) || {}); }); } catch { }
  }
  try { chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch[SETTINGS_KEY]) apply(ch[SETTINGS_KEY].newValue || {}); }); } catch { }

  /* messages from the extension: read-this-frame results and "find the media element" for the right-click item */
  try {
    chrome.runtime.onMessage.addListener((m, _s, send) => {
      if (!m || m.target !== 'page') return;
      if (m.type === 'OCR_STATUS') { toast(m.text, { busy: true }); return; }
      if (m.type === 'OCR_RESULT') { busy = false; finish(m.result); return; }
      if (m.type === 'OCR_FIND') {                                   // right-click on an image or video: find it and report its box
        const all = [...document.querySelectorAll('img,video')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; });
        const src = m.srcUrl || '';
        let hit = all.find(el => (el.currentSrc || el.src) === src) || all.find(el => src && (el.currentSrc || el.src || '').split('#')[0] === src.split('#')[0]);
        if (!hit && lastCtx && lastCtx.el && lastCtx.el.isConnected) hit = lastCtx.el;
        if (!hit) { const cx = innerWidth / 2, cy = innerHeight / 2; hit = all.sort((a, b) => dist(a, cx, cy) - dist(b, cx, cy))[0]; }
        if (!hit) { send({ ok: false }); return; }
        const r = hit.getBoundingClientRect();
        const rect = { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) };
        hideChip(); clearHl(); hideToast();
        frames(2).then(() => setTimeout(() => send({ ok: true, rect, viewW: innerWidth, viewH: innerHeight }), 60));
        return true;
      }
    });
  } catch { }
  let lastCtx = null;
  const dist = (el, cx, cy) => { const r = el.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); };
  window.addEventListener('contextmenu', e => { const m = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.tagName === 'IMG' || el.tagName === 'VIDEO'); lastCtx = m ? { el: m } : null; }, true);

  window.__copyitCS = { boot };
  mount(); boot();
})();
