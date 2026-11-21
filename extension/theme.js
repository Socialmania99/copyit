/* Copyit custom accent colour. Loaded first on every extension page; applies the saved colour and follows changes live. */
(() => {
  const KEY = 'copyitAccent', root = document.documentElement;
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb2hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2; let h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, s, l]; };
  const hsl2rgb = (h, s, l) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [r, g, b].map(v => Math.round((v + m) * 255)); };
  const toHex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('');
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const VARS = ['--acc-l', '--accent-soft', '--accent-rgb', '--g1', '--g2', '--g3', '--b1', '--b2', '--b3', '--on', '--hover'];
  function apply(hex) {
    VARS.forEach(v => root.style.removeProperty(v));
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) { if (root.dataset.theme === 'custom') delete root.dataset.theme; return false; }
    const base = hex2rgb(hex), [h, s0, l0] = rgb2hsl(base), s = Math.max(s0, .35);
    const mk = l => toHex(hsl2rgb(h, s, Math.min(.95, Math.max(.05, l))));
    const ink = mk(Math.min(l0, .42)), soft = mk(Math.max(l0, .7)), g2 = toHex(base), g1 = mk(l0 + .12), g3 = mk(l0 - .12);
    const st = (k, v) => root.style.setProperty(k, v);
    st('--acc-l', ink); st('--accent-soft', soft); st('--accent-rgb', hsl2rgb(h, s, Math.min(l0, .42)).join(','));
    st('--g1', g1); st('--g2', g2); st('--g3', g3); st('--b1', g1); st('--b2', g2); st('--b3', soft);
    st('--on', lum(base) > .5 ? '#14161d' : '#fff'); st('--hover', `rgba(${base.join(',')},.12)`);
    root.dataset.theme = 'custom';
    return true;
  }
  const get = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
  const set = hex => {
    try { hex ? localStorage.setItem(KEY, hex) : localStorage.removeItem(KEY); } catch { }
    try { chrome.storage.local.set({ [KEY]: hex || '' }); } catch { }
    apply(hex);
  };
  window.CopyitTheme = { apply, get, set, hex2rgb, rgb2hsl, hsl2rgb, toHex };
  apply(get());
  addEventListener('storage', e => { if (e.key === KEY) apply(e.newValue || ''); });
  try { chrome.storage.local.get(KEY).then(r => { const v = r[KEY] || ''; if (v !== get()) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { } apply(v); } }); } catch { }
})();
