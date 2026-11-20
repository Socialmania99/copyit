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
