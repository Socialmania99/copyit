/* Copyit text reader. Runs the bundled Tesseract OCR engine inside this hidden extension page.
   Nothing is downloaded and nothing leaves the device: the engine, its WebAssembly core and the English
   language data are all files inside the extension. */
let worker = null, starting = null, idle = 0;
const url = p => chrome.runtime.getURL(p);

async function getWorker() {
  clearTimeout(idle);
  if (worker) return worker;
  if (!starting) starting = Tesseract.createWorker('eng', 1, {
    workerPath: url('vendor/tesseract/worker.min.js'),
    corePath: url('vendor/tesseract/'),
    langPath: url('vendor/tesseract/lang/'),
    workerBlobURL: false, cacheMethod: 'none', gzip: true
  }).then(w => (worker = w)).finally(() => { starting = null; });
  return starting;
}
const sleepWorker = () => { clearTimeout(idle); idle = setTimeout(async () => { const w = worker; worker = null; try { await w?.terminate(); } catch { } }, 90000); };

async function prepare(shot, rect, viewW, viewH) {
  const bmp = await createImageBitmap(await (await fetch(shot)).blob());
  const sx = bmp.width / viewW, sy = bmp.height / viewH;
  const x = Math.max(0, Math.round(rect.x * sx)), y = Math.max(0, Math.round(rect.y * sy));
  const w = Math.max(8, Math.min(bmp.width - x, Math.round(rect.w * sx))), h = Math.max(8, Math.min(bmp.height - y, Math.round(rect.h * sy)));
  // small pictures read better when enlarged; very large ones are kept within about 4 megapixels
  let k = 1; if (Math.max(w, h) < 1100) k = Math.min(3, 1400 / Math.max(w, h)); if (w * h * k * k > 4e6) k = Math.sqrt(4e6 / (w * h));
  const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  const g = cv.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, x, y, w, h, 0, 0, cv.width, cv.height); bmp.close && bmp.close();
  // grey-scale; if the picture is mostly dark (light text on dark), flip it so the reader sees dark-on-light
  const im = g.getImageData(0, 0, cv.width, cv.height), d = im.data; let sum = 0;
  for (let i = 0; i < d.length; i += 4) { const l = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; d[i] = d[i + 1] = d[i + 2] = l; sum += l; }
  const dark = sum / (d.length / 4) < 118;
  if (dark) for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255 - d[i]; }
  g.putImageData(im, 0, 0);
  return cv;
}

// Drop lines the reader itself is unsure about, so pictures with no text do not return noise.
function pick(data) {
  const lines = (data.lines || []).filter(l => l.text && l.text.trim());
  const good = lines.filter(l => l.confidence >= 55 && /[\p{L}\p{N}]/u.test(l.text));
  const text = (good.length ? good : []).map(l => l.text.trim()).join('\n');
  return { text, conf: good.length ? Math.round(good.reduce((a, l) => a + l.confidence, 0) / good.length) : 0 };
}

async function run(msg) {
  const cv = await prepare(msg.shot, msg.rect, msg.viewW, msg.viewH);
  const w = await getWorker();
  let out = { text: '', conf: 0 };
  for (const psm of ['3', '11']) {
    await w.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1' });
    const { data } = await w.recognize(cv);
    out = pick(data);
    if (out.text.replace(/\s/g, '').length >= 2) break;
  }
  sleepWorker();
  return { ok: true, text: out.text, confidence: out.conf };
}

chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (!m || m.target !== 'offscreen' || m.type !== 'OCR_RUN') return;
  run(m).then(send).catch(e => send({ ok: false, error: 'Could not read text: ' + (e && e.message || e) }));
  return true;
});
