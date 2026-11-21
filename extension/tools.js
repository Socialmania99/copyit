/* v1.2.0 page tools: the "Click to copy" and "Copy text from images & videos" switches.
   Shared by the popup and the dashboard settings. The page helper only runs while one of these is on,
   and Chrome asks you once to allow Copyit on websites when you turn the first one on. */
(() => {
  const { SETTINGS, DEFAULT_SETTINGS } = CopyitLib;
  const ALL = { origins: ['<all_urls>'] };
  const load = async () => ({ ...DEFAULT_SETTINGS, ...((await chrome.storage.local.get(SETTINGS))[SETTINGS] || {}) });
  const patch = async p => { const s = await load(); await chrome.storage.local.set({ [SETTINGS]: { ...s, ...p } }); };
  const sync = () => chrome.runtime.sendMessage({ type: 'SYNC_SCRIPTS' }).catch(() => { });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UNITS = [['paragraph', 'Paragraph', 'The whole block under the pointer'], ['sentence', 'Sentence', 'Just the sentence under the pointer'], ['selection', 'Selection', 'Highlight text and it copies itself']];
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

  // The two tools, drawn once and used both in the popup dropdown and in the dashboard settings.
  function body() {
    return `
      <div class="pt-row"><span><b>Click to copy</b><small>Hover text, click once. Hold Alt to click normally.</small></span><input type="checkbox" class="switch" id="tgClick" aria-label="Click to copy"></div>
      <div class="pt-opts" id="clickOpts">
        <div class="unit" role="radiogroup" aria-label="What a click copies">${UNITS.map(u => `<button type="button" role="radio" data-unit="${u[0]}" aria-checked="false" title="${esc(u[2])}">${u[1]}</button>`).join('')}</div>
        <label class="mini-row"><input type="checkbox" id="tgSave"><span>Also save each copy to my list</span></label>
      </div>
      <div class="pt-sep"></div>
      <div class="pt-row"><span><b>Copy text from images &amp; videos</b><small>Hover a picture or paused video, press Copy text.</small></span><input type="checkbox" class="switch" id="tgImg" aria-label="Copy text from images and videos"></div>
      <p class="tool-note" id="toolNote" hidden></p>`;
  }
  function build(popup) {
    const el = document.createElement(popup ? 'div' : 'section');
    if (popup) {
      el.className = 'ptbar';
      el.innerHTML = `<button type="button" class="ptbtn" id="ptBtn" aria-haspopup="true" aria-expanded="false" title="Page tools"><svg class="i" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.2-.6-.6-2.2z"/></svg><span class="ptl">Tools</span><span class="pts" id="toolsCount">off</span></button><div class="ptpop" id="ptPop" hidden>${body()}</div>`;
    } else {
      el.className = 'tools';
      el.innerHTML = `<h3 class="tt">Page tools</h3>${body()}`;
    }
    return el;
  }

  async function wire(el) {
    const q = s => el.querySelector(s), note = q('#toolNote');
    const say = t => { note.textContent = t || ''; note.hidden = !t; };
    const paint = s => {
      q('#tgClick').checked = !!s.clickCopy; q('#tgImg').checked = !!s.imgText;
      q('#tgSave').checked = s.clickSave !== false;
      q('#clickOpts').classList.toggle('off', !s.clickCopy);
      el.querySelectorAll('[data-unit]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.unit === s.clickUnit)));
      const n = (s.clickCopy ? 1 : 0) + (s.imgText ? 1 : 0), c = q('#toolsCount'); if (c) { c.textContent = n ? `${n} on` : 'off'; c.classList.toggle('on', !!n); }
    };
    // if the website permission was taken away in Chrome, show the switches as off instead of lying
    let s = await load();
    if ((s.clickCopy || s.imgText) && !(await chrome.permissions.contains(ALL))) { await patch({ clickCopy: false, imgText: false }); s = await load(); }
    paint(s);

    async function flip(key, input) {
      say('');
      if (input.checked) {
        let ok = true;
        if (!(await chrome.permissions.contains(ALL))) {
          const req = chrome.permissions.request(ALL);                 // must start inside the click
          patch({ [key]: true });                                      // saved right away, so it still works if the popup closes during Chrome's prompt
          try { ok = await req; } catch { ok = false; }
        } else await patch({ [key]: true });
        if (!ok) { await patch({ [key]: false }); input.checked = false; say('Copyit needs your OK to work on websites. It only reads a page after you click, and nothing leaves your device.'); }
      } else {
        await patch({ [key]: false });
        const s2 = await load();
        let keep = false; try { keep = !!(await chrome.storage.local.get('copyitPreviewWeb')).copyitPreviewWeb; } catch { }
        if (!s2.clickCopy && !s2.imgText && !keep) { try { await chrome.permissions.remove(ALL); } catch { } }
      }
      paint(await load()); sync();
    }
    q('#tgClick').addEventListener('change', e => flip('clickCopy', e.target));
    q('#tgImg').addEventListener('change', e => flip('imgText', e.target));
    q('#tgSave').addEventListener('change', async e => { await patch({ clickSave: e.target.checked }); });
    el.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', async () => { await patch({ clickUnit: b.dataset.unit }); paint(await load()); }));
    const btn = q('#ptBtn'), pop = q('#ptPop');
    if (btn) {                                                       // popup: small dropdown that floats over the list
      const shut = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); });
      document.addEventListener('click', e => { if (!pop.hidden && !el.contains(e.target)) shut(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { shut(); btn.focus(); } });
    }
    chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch[SETTINGS]) load().then(paint); });
  }

  function mount() {
    const pop = document.body.classList.contains('popup');
    const host = document.getElementById('toolsHost');
    if (!host) return;
    const el = build(pop);
    host.append(el);
    wire(el);
  }
  mount();
})();
