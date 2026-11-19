importScripts('lib.js');
const { KEY, BLOB_PREFIX, BLOB_KINDS, SETTINGS, DEFAULT_SETTINGS, norm, detectKind, languageOf, isRichHtml, applyRetention } = CopyitLib;
const MAX_TEXT = 2000000, MAX_HTML = 300000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'save-selected-text', title: 'Save selected text to Copyit', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'save-link', title: 'Save link address to Copyit', contexts: ['link'] });
    chrome.contextMenus.create({ id: 'save-image-url', title: 'Save image address to Copyit', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'save-page-url', title: 'Save page address to Copyit', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'copy-image', title: 'Copy image directly (Copyit)', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'copy-frame', title: 'Copy video frame as image (Copyit)', contexts: ['video'] });
    chrome.contextMenus.create({ id: 'preview-media', title: 'Preview in Copyit', contexts: ['image', 'video'] });
    chrome.contextMenus.create({ id: 'pip-media', title: 'Picture in picture (Copyit)', contexts: ['video', 'audio'] });
    chrome.contextMenus.create({ id: 'ocr-media', title: 'Copy text from this image or video', contexts: ['image', 'video'] });
  });
  syncScripts();
});
chrome.runtime.onStartup.addListener(syncScripts);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ocr-media') { ocrFromMenu(info, tab); return; }
  if (info.menuItemId === 'copy-image' || info.menuItemId === 'copy-frame') { mediaFromMenu(info, tab, info.menuItemId === 'copy-frame' ? 'frame' : 'image'); return; }
  if (info.menuItemId === 'pip-media') { if (tab && tab.id != null) pageMsg(tab, { type: 'PIP_OPEN', srcUrl: info.srcUrl || '' }); return; }
  if (info.menuItemId === 'preview-media') { previewFromMenu(info, tab); return; }
  const text = { 'save-selected-text': info.selectionText, 'save-link': info.linkUrl, 'save-image-url': info.srcUrl, 'save-page-url': info.pageUrl || tab?.url }[info.menuItemId];
  if (!text) return;
  await enqueue(() => saveEntry({ content: text, source: 'context-menu' }));
  flashBadge();
});

// Brief "saved" tick on the toolbar icon after a right-click save.
function flashBadge() {
  chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
  chrome.action.setBadgeText({ text: '✓' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1800);
}

// Saves run one at a time so two quick saves cannot overwrite each other.
let chain = Promise.resolve();
const enqueue = fn => (chain = chain.then(fn, fn));

async function saveEntry(input, blob) {
  const data = await chrome.storage.local.get([KEY, SETTINGS]);
  const items = Array.isArray(data[KEY]) ? data[KEY] : [];
  const settings = { ...DEFAULT_SETTINGS, ...(data[SETTINGS] || {}) };
  const now = new Date().toISOString();
  const isImg = BLOB_KINDS.includes(input.kind) && input.image && typeof blob === 'string' && blob.startsWith('data:');
  let content = String(input.content ?? '');
  if (!isImg) {
    content = content.trim();
    if (!content) return { ok: false, error: 'Nothing to save.' };
    if (content.length > MAX_TEXT) return { ok: false, error: 'That text is too large to save (over 2 MB).' };
  }
  const existing = isImg ? items.find(x => x.hash && x.hash === input.hash) : items.find(x => !BLOB_KINDS.includes(x.kind) && norm(x.content) === norm(content));
  let id, duplicate = false;
  if (existing) {
    existing.copiedAt = now; existing.copies = (existing.copies || 1) + 1; existing.source = input.source || existing.source;
    id = existing.id; duplicate = true;
  } else {
    id = crypto.randomUUID();
    const e = { id, content, createdAt: now, copiedAt: now, updatedAt: null, favorite: false, pinned: false, copies: 1, source: input.source || 'manual' };
    if (isImg) {
      e.kind = input.kind; e.image = input.image; e.hash = input.hash || '';
      await chrome.storage.local.set({ [BLOB_PREFIX + id]: blob });
    } else {
      let kind = detectKind(content);
      const html = typeof input.html === 'string' ? input.html : '';
      if (html && html.length <= MAX_HTML && isRichHtml(html, content)) { kind = 'rich'; e.html = html; }
      e.kind = kind;
      if (kind === 'code') e.lang = languageOf(content);
    }
    items.unshift(e);
  }
  const { kept, removed } = applyRetention(items, settings);
  await chrome.storage.local.set({ [KEY]: kept });
  const gone = removed.filter(x => BLOB_KINDS.includes(x.kind)).map(x => BLOB_PREFIX + x.id);
  if (gone.length) await chrome.storage.local.remove(gone);
  return { ok: true, id, duplicate };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'offscreen') return;
  if (message?.type === 'OCR_CAPTURE') {
    runOcr(sender.tab, message.rect, message.viewW, message.viewH).then(sendResponse);
    return true;
  }
  if (message?.type === 'SYNC_SCRIPTS') { syncScripts().then(() => sendResponse({ ok: true })); return true; }
  if (message?.type === 'SAVE_ENTRY') {
    enqueue(() => saveEntry(message.entry || {}, message.blob)).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'SAVE_TEXT') {            // kept for older callers
    enqueue(() => saveEntry({ content: message.text, source: message.source || 'manual' })).then(r => sendResponse(r)).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});


/* ───────────── v1.1.0: page helper (click to copy, copy text from images & videos) ───────────── */
const CS_ID = 'copyit-page-helper', ALL = { origins: ['<all_urls>'] };

// The page helper is only registered while a feature is switched on AND you have allowed Copyit on all sites.
async function syncScripts() {
  try {
    const data = await chrome.storage.local.get(SETTINGS);
    const s = { ...DEFAULT_SETTINGS, ...(data[SETTINGS] || {}) };
    const want = (s.clickCopy || s.imgText || s.pip) && await chrome.permissions.contains(ALL);
    const have = (await chrome.scripting.getRegisteredContentScripts({ ids: [CS_ID] })).length > 0;
    if (want && !have) {
      await chrome.scripting.registerContentScripts([{ id: CS_ID, matches: ['http://*/*', 'https://*/*'], js: ['content.js'], runAt: 'document_idle', allFrames: false, persistAcrossSessions: true }]);
      injectOpenTabs();
    } else if (!want && have) {
      await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
    } else if (want && have) injectOpenTabs();
  } catch (e) { console.warn('Copyit page helper:', e && e.message); }
}
async function injectOpenTabs() {            // so the switch works on pages that are already open, without a reload
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    await Promise.all(tabs.map(t => chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['content.js'] }).catch(() => { })));
  } catch { }
}
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch[SETTINGS]) syncScripts(); });
chrome.permissions.onAdded.addListener(syncScripts);
chrome.permissions.onRemoved.addListener(syncScripts);

/* ----- reading text out of a screenshot of an image or video ----- */
let offscreenReady = null;
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!offscreenReady) offscreenReady = chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['WORKERS'], justification: 'Reads text from images and videos on this device with a bundled OCR engine' }).finally(() => { offscreenReady = null; });
  await offscreenReady;
}
async function runOcr(tab, rect, viewW, viewH) {
  if (!tab || tab.id == null) return { ok: false, error: 'No tab to read.' };
  let shot;
  try { shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }); }
  catch (e) { return { ok: false, error: /permission|activeTab|<all_urls>/i.test(String(e && e.message)) ? 'Copyit needs permission for this page. Use the right-click item or allow all sites in Copyit settings.' : 'Could not capture this page.' }; }
  chrome.tabs.sendMessage(tab.id, { target: 'page', type: 'OCR_STATUS', text: 'Reading text…' }).catch(() => { });
  try {
    await ensureOffscreen();
    const r = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'OCR_RUN', shot, rect, viewW, viewH });
    return r || { ok: false, error: 'The text reader did not answer. Try again.' };
  } catch (e) { return { ok: false, error: 'The text reader could not start: ' + (e && e.message || e) }; }
}
async function ocrFromMenu(info, tab) {         // right-click on an image or video (works through activeTab, no extra permission)
  if (!tab || tab.id == null) return;
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch { return; }
  let found; try { found = await chrome.tabs.sendMessage(tab.id, { target: 'page', type: 'OCR_FIND', srcUrl: info.srcUrl || '' }); } catch { }
  if (!found || !found.ok) return;
  const result = await runOcr(tab, found.rect, found.viewW, found.viewH);
  chrome.tabs.sendMessage(tab.id, { target: 'page', type: 'OCR_RESULT', result }).catch(() => { });
}

// Right-click on an image or video: copy it straight to the clipboard, or preview it in a small window.
async function pageMsg(tab, msg) { try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); await chrome.tabs.sendMessage(tab.id, { target: 'page', ...msg }); } catch { } }
async function mediaFromMenu(info, tab, mode) {
  if (!tab || tab.id == null) return;
  await pageMsg(tab, { type: 'MEDIA_COPY', srcUrl: info.srcUrl || '', mode });
}
async function previewFromMenu(info, tab) {
  const u = info.srcUrl || '';
  if (!/^(https?:|data:)/i.test(u)) { if (tab && tab.id != null) await pageMsg(tab, { type: 'MEDIA_MSG', text: 'This file cannot be previewed', note: 'It has no public address. Use Copy image instead.' }); return; }
  const W = 560, H = 500;
  let left, top;
  try { const w = await chrome.windows.getCurrent(); left = Math.round((w.left || 0) + ((w.width || 1000) - W) / 2); top = Math.round((w.top || 0) + ((w.height || 700) - H) / 3); } catch { }
  chrome.windows.create({ url: chrome.runtime.getURL('viewer.html?url=' + encodeURIComponent(u)), type: 'popup', width: W, height: H, left, top });
}
async function fetchMedia(url) {                 // used when the page itself may not read a picture (other site, no CORS)
  if (!/^https?:/i.test(url)) throw new Error('not a web address');
  const r = await fetch(url, { credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = await r.arrayBuffer(); if (buf.byteLength > 25 * 1048576) throw new Error('too large');
  let bin = '', a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) bin += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return 'data:' + (r.headers.get('content-type') || 'image/png').split(';')[0] + ';base64,' + btoa(bin);
}
chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (m && m.type === 'FETCH_MEDIA') { fetchMedia(m.url).then(dataUrl => send({ ok: true, dataUrl })).catch(e => send({ ok: false, error: String(e && e.message || e) })); return true; }
});
