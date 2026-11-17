// Measures each control's demo page (with ?embed=1, 640 wide) and takes a still of it for its card in the library.
// Writes library/sizes.json and library/thumbs/SET--NAME.webp. Needs a server on the repo root and playwright-core:
//   python3 -m http.server 8101 &   then   BASE=http://127.0.0.1:8101/ PW=/path/to/playwright-core node tools/library-shots.mjs
// Afterwards run node tools/library.mjs to fold the sizes into components.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8101/';
const only = process.argv[2];
const data = JSON.parse(readFileSync('library/components.json', 'utf8'));
const paper = Object.fromEntries(data.sets.map((s) => [s.id, s.paper]));
mkdirSync('library/thumbs', { recursive: true });
let sizes = {}; try { sizes = JSON.parse(readFileSync('library/sizes.json', 'utf8')); } catch {}
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
for (const c of data.components) {
  if (only && !c.id.includes(only)) continue;
  await page.goto(`${BASE}_sets/${c.set}/${c.demo}?embed=1`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const h = await page.evaluate(() => Math.ceil(Math.max(document.querySelector('main')?.getBoundingClientRect().bottom || 0, 120)));
  await page.setViewportSize({ width: 640, height: h }); await page.waitForTimeout(600);
  // the card is cropped to the control itself: what is in the demo's stage (or every instance of its element), with room round it,
  // widened to the card's shape so small controls are not lost in a big empty frame
  const box = await page.evaluate(([tag, H]) => {
    let r = null;
    for (const el of document.querySelectorAll(document.querySelector('main .stage') ? 'main .stage > *' : tag)) {
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
      r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), rr: Math.max(r.rr, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, rr: b.right, b: b.bottom };
    }
    if (!r) return [0, 0, 640, H];
    const pad = 36, A = 1 / .86;
    let w = Math.max(r.rr - r.l + pad * 2, 240), h = Math.max(r.b - r.t + pad * 2, 160);
    if (w / h > A) h = w / A; else w = h * A;
    const cx = (r.l + r.rr) / 2, cy = (r.t + r.b) / 2;
    w = Math.min(w, 640); h = Math.min(h, H);
    const x = Math.max(0, Math.min(640 - w, cx - w / 2)), y = Math.max(0, Math.min(H - h, cy - h / 2));
    return [x, y, w, h].map(Math.round);
  }, [c.tag, h]);
  const png = `library/thumbs/${c.set}--${c.name}.png`;
  await page.screenshot({ path: png, clip: { x: box[0], y: box[1], width: box[2], height: box[3] } });
  execFileSync('magick', [png, '-resize', '900x900>', '-quality', '82', png.replace('.png', '.webp')]);
  execFileSync('rm', [png]);
  const bg = await page.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor; return c === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.documentElement).backgroundColor : c; });
  sizes[c.id] = { w: 640, h, box, bg }; // bg: the demo page's own background, which the card uses so the still has no seam console.log(c.id, h, box.join(' '));
  await page.setViewportSize({ width: 640, height: 400 });
}
writeFileSync('library/sizes.json', JSON.stringify(sizes, null, 1) + '\n');
await browser.close();
