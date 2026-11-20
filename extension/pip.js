/* Copyit pop-out player. Used only from Copyit's own preview window, for media the user saved in Copyit (video or audio).
   It never runs on websites. */
(() => {
  let pipWin = null;
  async function open(el, label) {
    if (!el) return { ok: false, msg: 'No video or audio to pop out' };
    if (pipWin) { try { pipWin.close(); } catch { } return { ok: true }; }
    const video = el.tagName === 'VIDEO' && el.videoWidth > 0;
    if (window.documentPictureInPicture && window.documentPictureInPicture.requestWindow) {
      try { await docPip(el, video, label); return { ok: true }; } catch (e) { if (e && e.name === 'NotAllowedError') return { ok: false, msg: 'Press the button again to pop out' }; }
    }
    if (video && document.pictureInPictureEnabled && !el.disablePictureInPicture) {
      try { await el.requestPictureInPicture(); return { ok: true }; } catch (e) { if (e && e.name === 'NotAllowedError') return { ok: false, msg: 'Press the button again to pop out' }; }
    }
    return { ok: false, msg: video ? 'Picture in picture is not available here' : 'Audio pop-out needs Chrome 116 or newer' };
  }
  async function docPip(el, video, label) {
    const asp = video ? el.videoWidth / el.videoHeight : 0;
    const NORM = video ? [480, Math.min(700, Math.round(480 / asp) + 52)] : [360, 170];
    const win = await window.documentPictureInPicture.requestWindow({ width: NORM[0], height: NORM[1] });
    pipWin = win;
    const d = win.document, NS = 'http://www.w3.org/2000/svg';
    const sheet = new win.CSSStyleSheet();                        // constructed styles are not blocked by the site's content security policy
    sheet.replaceSync(`html,body{margin:0;height:100%;background:#0b0c10;color:#fff;font:13px system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}
      .wrap{display:flex;flex-direction:column;height:100%}
      .stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden}
      .stage.audio{background:linear-gradient(135deg,#1d2f6b,#0b0c10)}
      .stage video{width:100%;height:100%;max-width:none;max-height:none;object-fit:contain;margin:0;position:static;transform:none}
      .card{text-align:center;padding:12px 18px;min-width:0}.card svg{width:44px;height:44px;stroke:#9db4ff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .card .t{margin-top:8px;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
      .mtitle{display:none;padding:10px 14px 0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bar{flex:none;display:flex;align-items:center;gap:4px;padding:8px 10px;background:#12131a}
      .b{flex:none;width:30px;height:30px;border:0;border-radius:8px;background:transparent;display:grid;place-items:center;cursor:pointer;padding:0}
      .b:hover{background:rgba(255,255,255,.15)}
      .b svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .seek{flex:1;min-width:40px;accent-color:#3b6ef5;margin:0 4px}
      .time{flex:none;font-variant-numeric:tabular-nums;font-size:11.5px;color:#aab1c8;margin:0 4px}
      .sep{flex:none;width:1px;height:18px;margin:0 3px;background:rgba(255,255,255,.2)}
      .min .stage{display:none}.min .mtitle{display:block}.min .wrap{justify-content:center}`);
    d.adoptedStyleSheets = [sheet];
    const mk = (tag, cls, txt) => { const n = d.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
    const ico = paths => { const s = d.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); for (const p of paths) { const e = d.createElementNS(NS, 'path'); e.setAttribute('d', p); s.appendChild(e); } return s; };
    const btn = (title, paths, fn) => { const b = mk('button', 'b'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.appendChild(ico(paths)); b.addEventListener('click', fn); return b; };
    const I = { play: ['M8 5.5v13l10-6.5z'], pause: ['M9 6v12M15 6v12'], vol: ['M4 10v4h4l5 4V6L8 10z', 'M16.5 9a4 4 0 0 1 0 6'], mute: ['M4 10v4h4l5 4V6L8 10z', 'M16 9.5l5 5M21 9.5l-5 5'], min: ['M6 12h12'], max: ['M6 6h12v12H6z'], restore: ['M9 5h10v10', 'M5 9h10v10H5z'], back: ['M14 5h5v5', 'M19 5l-8 8', 'M10 6H6.5A1.5 1.5 0 0 0 5 7.5v10A1.5 1.5 0 0 0 6.5 19h10a1.5 1.5 0 0 0 1.5-1.5V14'] };
    const title = () => label || 'Copyit';

    const wrap = mk('div', 'wrap'), stage = mk('div', 'stage' + (video ? '' : ' audio')), mtitle = mk('div', 'mtitle', title()), bar = mk('div', 'bar');
    let marker = null, savedStyle = null;
    if (video) {
      marker = document.createComment('copyit-pip'); el.before(marker); savedStyle = el.getAttribute('style');
      const was = !el.paused; stage.appendChild(el); if (was && el.paused) el.play().catch(() => { });
    } else {
      const card = mk('div', 'card'); card.appendChild(ico(['M9 18V6l10-2v12', 'M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', 'M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z'])); card.appendChild(mk('div', 't', title())); stage.appendChild(card);
    }
    const play = btn('Play / pause', I.play, () => { if (el.paused) el.play().catch(() => { }); else el.pause(); });
    const seek = mk('input', 'seek'); seek.type = 'range'; seek.min = 0; seek.step = 'any'; seek.value = 0; seek.addEventListener('input', () => { try { el.currentTime = Number(seek.value); } catch { } });
    const time = mk('span', 'time', '0:00');
    const mute = btn('Mute', I.vol, () => { el.muted = !el.muted; });
    let state = 'normal';
    const sizeFor = s => {
      const aw = screen.availWidth || 1280, ah = screen.availHeight || 800;
      if (s === 'min') return [330, 124];
      if (s === 'max') { const w = Math.min(video ? 1280 : 720, aw - 120); return [w, Math.min(ah - 100, video ? Math.round(w / asp) + 52 : 190)]; }
      return NORM;
    };
    const minB = btn('Minimize', I.min, () => setState(state === 'min' ? 'normal' : 'min'));
    const maxB = btn('Maximize', I.max, () => setState(state === 'max' ? 'normal' : 'max'));
    const backB = btn('Back to Copyit', I.back, () => { try { win.close(); } catch { } window.focus(); });
    function setState(s) {
      state = s; wrap.classList.toggle('min', s === 'min'); d.body.classList.toggle('min', s === 'min');
      minB.replaceChildren(ico(s === 'min' ? I.restore : I.min)); minB.title = s === 'min' ? 'Restore' : 'Minimize';
      maxB.replaceChildren(ico(s === 'max' ? I.restore : I.max)); maxB.title = s === 'max' ? 'Restore size' : 'Maximize';
      const [w, h] = sizeFor(s); try { win.resizeTo(w, h); } catch { }
    }
    const fmt = t => { t = Math.max(0, Math.floor(t || 0)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
    const upd = () => {
      play.replaceChildren(ico(el.paused ? I.play : I.pause)); play.title = el.paused ? 'Play' : 'Pause';
      mute.replaceChildren(ico(el.muted || el.volume === 0 ? I.mute : I.vol));
      const fin = isFinite(el.duration) && el.duration > 0; seek.style.visibility = fin ? 'visible' : 'hidden';
      if (fin) { seek.max = el.duration; seek.value = el.currentTime; }
      time.textContent = fin ? `${fmt(el.currentTime)} / ${fmt(el.duration)}` : (el.paused ? 'Paused' : 'Live');
    };
    const evs = ['play', 'pause', 'timeupdate', 'volumechange', 'durationchange', 'loadedmetadata', 'ended'];
    evs.forEach(n => el.addEventListener(n, upd)); upd();
    bar.append(play, seek, time, mute, mk('span', 'sep'), minB, maxB, backB);
    wrap.append(mtitle, stage, bar); d.body.appendChild(wrap);
    d.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); play.click(); } });
    win.addEventListener('pagehide', () => {
      evs.forEach(n => el.removeEventListener(n, upd));
      if (video) { const was = !el.paused; if (marker.parentNode) marker.replaceWith(el); if (savedStyle == null) el.removeAttribute('style'); else el.setAttribute('style', savedStyle); if (was && el.paused) el.play().catch(() => { }); }
      pipWin = null;
    }, { once: true });
  }
  window.CopyitPip = { open };
})();
