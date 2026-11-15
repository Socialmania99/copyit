/* v1.1.0 page tools: the "Click to copy" and "Copy text from images & videos" switches.
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

  function build(popup) {
    const el = document.createElement(popup ? 'details' : 'section');
    el.className = 'tools' + (popup ? ' in-popup' : '');
    if (popup) { let open = true; try { open = localStorage.getItem('copyitToolsOpen') !== '0'; } catch { } el.open = open; }
    el.innerHTML = `
      ${popup ? '<summary><span class="tt">Page tools</span><span class="tc" id="toolsCount"></span></summary>' : '<h3 class="tt">Page tools</h3>'}
      <label class="set-row tool"><span><b>Click to copy</b><small>Hover any text and click once. No highlighting, no Ctrl+C. Hold Alt to click normally.</small></span><input type="checkbox" class="switch" id="tgClick" aria-label="Click to copy"></label>
      <div class="tool-opts" id="clickOpts" hidden>
        <div class="unit" role="radiogroup" aria-label="What a click copies">${UNITS.map(u => `<button type="button" role="radio" data-unit="${u[0]}" title="${esc(u[2])}">${u[1]}</button>`).join('')}</div>
        <label class="mini-row"><input type="checkbox" id="tgSave"><span>Also save each copy to my Copyit list</span></label>
      </div>
      <label class="set-row tool"><span><b>Copy text from images &amp; videos</b><small>Hover a picture or a paused video, press <em>Copy text</em>. Reads the text on this device. Right-click an image or video also works without this switch.</small></span><input type="checkbox" class="switch" id="tgImg" aria-label="Copy text from images and videos"></label>
      <p class="tool-note" id="toolNote" hidden></p>`;
    return el;
  }

  async function wire(el) {
    const q = s => el.querySelector(s), note = q('#toolNote');
    const say = t => { note.textContent = t || ''; note.hidden = !t; };
    const paint = s => {
      q('#tgClick').checked = !!s.clickCopy; q('#tgImg').checked = !!s.imgText; q('#tgSave').checked = s.clickSave !== false;
      q('#clickOpts').hidden = !s.clickCopy;
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
        if (!s2.clickCopy && !s2.imgText) { try { await chrome.permissions.remove(ALL); } catch { } }
      }
      paint(await load()); sync();
    }
    q('#tgClick').addEventListener('change', e => flip('clickCopy', e.target));
    q('#tgImg').addEventListener('change', e => flip('imgText', e.target));
    q('#tgSave').addEventListener('change', async e => { await patch({ clickSave: e.target.checked }); });
    el.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', async () => { await patch({ clickUnit: b.dataset.unit }); paint(await load()); }));
    if (el.tagName === 'DETAILS') el.addEventListener('toggle', () => { try { localStorage.setItem('copyitToolsOpen', el.open ? '1' : '0'); } catch { } });
    chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch[SETTINGS]) load().then(paint); });
  }

  function mount() {
    const pop = document.body.classList.contains('popup');
    const host = pop ? document.getElementById('list') : document.querySelector('#settingsDialog .set > h2 + p');
    if (!host) return;
    const el = build(pop);
    if (pop) host.before(el); else host.after(el);
    wire(el);
  }
  mount();
})();
