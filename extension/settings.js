/* Copyit settings page: category navigation, back button, small helpers. The settings themselves are wired in app.js. */
(() => {
  const $ = id => document.getElementById(id);
  const TITLES = { general: 'General', tools: 'Page tools', privacy: 'Privacy & security', storage: 'Storage & clean-up', backup: 'Import & export', danger: 'Danger zone' };
  const side = $('spSide'), scrim = $('spScrim'), menu = $('spMenu');
  const closeNav = () => { side.classList.remove('open'); scrim.hidden = true; menu.setAttribute('aria-expanded', 'false'); };
  const openNav = () => { side.classList.add('open'); scrim.hidden = false; menu.setAttribute('aria-expanded', 'true'); };
  function show(cat) {
    if (!TITLES[cat]) cat = 'general';
    document.querySelectorAll('.sp-panel').forEach(p => { p.hidden = p.dataset.panel !== cat; });
    document.querySelectorAll('.sp-nav a[data-cat]').forEach(a => { const on = a.dataset.cat === cat; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('spTitle').textContent = TITLES[cat];
    document.title = TITLES[cat] + ' · Copyit Settings';
    const m = document.querySelector('.sp-main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0);
    closeNav();
  }
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  menu.addEventListener('click', () => side.classList.contains('open') ? closeNav() : openNav());
  scrim.addEventListener('click', closeNav);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  try { const v = chrome.runtime.getManifest().version; $('spVer').textContent = 'v' + v; $('aboutVer').textContent = v; } catch { }
  $('copyMail').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('socialmania99@gmail.com'); $('copyMail').textContent = 'Copied'; setTimeout(() => { $('copyMail').textContent = 'Copy email'; }, 1500); } catch { $('copyMail').textContent = 'Copy failed'; }
  });
  show(location.hash.slice(1));
})();
/* custom colour picker: hue/saturation wheel + brightness slider + swatches + hex */
(() => {
  const T = window.CopyitTheme, c = document.getElementById('cpWheel'); if (!T || !c) return;
  const $ = id => document.getElementById(id), ctx = c.getContext('2d'), W = c.width, R = W / 2;
  const SW = ['#111111', '#8a8a8a', '#ee2233', '#c726d9', '#2b46f0', '#14a7e8', '#12b865', '#5cf021', '#ffd91a', '#f26a1b'];
  let H = 0, S = 1, V = 1;
  const img = ctx.createImageData(W, W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), i = (y * W + x) * 4; if (d > R) continue;
    const [r, g, b] = hsv(((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360, d / R, 1);
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  function hsv(h, s, v) { const l = v * (1 - s / 2), sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l); return T.hsl2rgb(h, sl, l); }
  function fromRgb([r, g, b]) { const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255; const [h] = T.rgb2hsl([r, g, b]); H = h; V = mx; S = mx ? (mx - mn) / mx : 0; }
  const cur = () => T.toHex(hsv(H, S, V));
  function draw() {
    ctx.clearRect(0, 0, W, W); ctx.putImageData(img, 0, 0);
    const a = H * Math.PI / 180, x = R + Math.cos(a) * S * R, y = R + Math.sin(a) * S * R;
    ctx.fillStyle = 'rgba(0,0,0,' + (1 - V) + ')'; ctx.beginPath(); ctx.arc(R, R, R, 0, 7); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill(); ctx.stroke();
  }
  function ui(save) {
    const hx = cur(), base = T.toHex(hsv(H, S, 1));
    c.parentElement.style.setProperty('--cpc', base); $('cpPrev').style.setProperty('--cpc', hx);
    $('cpHex').value = hx; $('cpBright').value = Math.round(V * 100); draw();
    document.querySelectorAll('#cpSw button').forEach(b => b.classList.toggle('on', b.dataset.c === hx));
    if (save) T.set(hx);
  }
  function pick(e) { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W - R, y = (e.clientY - r.top) / r.height * W - R; H = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360; S = Math.min(1, Math.hypot(x, y) / R); if (V < .15) V = .6; ui(true); }
  let down = false;
  c.addEventListener('pointerdown', e => { down = true; c.setPointerCapture(e.pointerId); pick(e); });
  c.addEventListener('pointermove', e => { if (down) pick(e); });
  c.addEventListener('pointerup', () => { down = false; });
  $('cpBright').addEventListener('input', e => { V = e.target.value / 100; ui(true); });
  $('cpSw').innerHTML = SW.map(h => `<button type="button" data-c="${h}" style="--c:${h}" title="${h}"></button>`).join('');
  $('cpSw').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fromRgb(T.hex2rgb(b.dataset.c)); ui(true); });
  $('cpHex').addEventListener('input', e => { let v = e.target.value.trim(); if (v[0] !== '#') v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) { fromRgb(T.hex2rgb(v)); ui(true); } });
  const reset = () => { T.set(''); init(); };
  $('cpReset').addEventListener('click', reset);
    function init() { const g = T.get() || '#3b6ef5'; fromRgb(T.hex2rgb(g)); ui(false); }
  init();
})();
