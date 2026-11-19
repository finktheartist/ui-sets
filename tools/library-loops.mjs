// Records a short loop of every control being used, for its card in the library: the card plays it on its own and the
// still is the poster. Each control is driven the way a person would use it (a click, a drag, typing, a hold) on its demo
// page, recorded at 2x with the browser's screencast, cropped like the still (sizes.json) and encoded as a small mp4.
// Writes library/loops/SET--NAME.mp4. Needs a server on the repo root, playwright-core and ffmpeg:
//   BASE=http://127.0.0.1:8104/ PW=/path/to/playwright-core node tools/library-loops.mjs [filter]
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8104/';
const only = process.argv[2]; // a filter on the id, or --missing for the controls with no loop yet
const data = JSON.parse(readFileSync('library/components.json', 'utf8'));
mkdirSync('library/loops', { recursive: true });

// helpers for the scripts below; `p` is the page, selectors pierce the controls' shadow roots
const wait = (p, ms) => p.waitForTimeout(ms);
const click = async (p, sel, n = 0) => { await p.locator(sel).nth(n).click({ force: true }); };
const hover = async (p, sel) => { await p.locator(sel).first().hover({ force: true }); };
const center = async (p, sel, n = 0) => { const b = await p.locator(sel).nth(n).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
async function moveTo(p, sel, n = 0, steps = 12) { const [x, y] = await center(p, sel, n); await p.mouse.move(x, y, { steps }); return [x, y]; }
async function press(p, sel, ms, n = 0) { await moveTo(p, sel, n); await p.mouse.down(); await wait(p, ms); await p.mouse.up(); }
async function drag(p, sel, from, to, ms, n = 0) { // from/to are fractions across the element
  const [, , b] = await center(p, sel, n), y = b.y + b.height / 2, x0 = b.x + b.width * from, x1 = b.x + b.width * to;
  await p.mouse.move(x0, y, { steps: 8 }); await p.mouse.down();
  const steps = Math.max(4, Math.round(ms / 16)); for (let i = 1; i <= steps; i++) { await p.mouse.move(x0 + (x1 - x0) * i / steps, y); await wait(p, ms / steps); }
  await p.mouse.up();
}
async function type(p, sel, text, gap = 110) { await click(p, sel); await p.keyboard.type(text, { delay: gap }); }
async function keys(p, sel, key, n, gap) { await p.locator(sel).first().focus(); for (let i = 0; i < n; i++) { await p.keyboard.press(key); await wait(p, gap); } }
const call = (p, js, arg) => p.evaluate(js, arg);
async function feed(p, js, ms) { // drive a progress control from 0 to 1 over ms, through its own set()
  const steps = Math.round(ms / 50); for (let i = 0; i <= steps; i++) { await p.evaluate(([j, v]) => new Function('v', j)(v), [js, i / steps]); await wait(p, 50); }
}

// what each control's loop does, after a short beat at rest
const PLAY = {
  'pinball-ui/toggle': async (p) => { await click(p, 'pinball-toggle >> button'); await wait(p, 1700); await click(p, 'pinball-toggle >> button'); await wait(p, 1700); },
  'pinball-ui/slider': async (p) => { await drag(p, 'pinball-slider >> [role=slider]', 0.4, 0.95, 900); await wait(p, 900); await drag(p, 'pinball-slider >> [role=slider]', 0.95, 0.2, 900); await wait(p, 900); },
  'pinball-ui/plunger': async (p) => { await drag(p, 'pinball-plunger >> button', 0.82, 1.25, 500); await wait(p, 100); await call(p, () => document.querySelector('pinball-plunger').fire()); await wait(p, 2200); },
  'pinball-ui/stepper': async (p) => { for (let i = 0; i < 4; i++) { await click(p, 'pinball-stepper >> .plus'); await wait(p, 380); } await click(p, 'pinball-stepper >> .minus'); await wait(p, 1400); },
  'pinball-ui/targets': async (p) => { for (const i of [1, 3]) { await click(p, 'pinball-targets >> [role=checkbox]', i); await wait(p, 900); } await wait(p, 1400); },
  'pinball-ui/drain': async (p) => { await click(p, 'pinball-drain >> .chute'); await wait(p, 1500); await click(p, 'pinball-drain >> .shoot'); await wait(p, 1800); },
  'pinball-ui/bumper': async (p) => { await click(p, 'pinball-bumpers >> [role=button]'); await wait(p, 500); await click(p, 'pinball-bumpers >> [role=button]'); await wait(p, 2600); },
  'cockpit-ui/launch': async (p) => { await click(p, 'cockpit-launch >> [role=switch]'); await wait(p, 700); await press(p, 'cockpit-launch >> button:not([role])', 3600); await wait(p, 2600); },
  'cockpit-ui/dial': async (p) => { await keys(p, 'cockpit-dial >> [role=slider]', 'ArrowUp', 82, 50); await wait(p, 3000); },
  'cockpit-ui/checklist': async (p) => { for (let i = 0; i < 4; i++) { await click(p, 'cockpit-checklist >> [role=checkbox]', i); await wait(p, 650); } await wait(p, 2400); },
  'cockpit-ui/lock': async (p) => { await click(p, 'cockpit-lock >> [role=switch]'); await wait(p, 4200); },
  'cockpit-ui/mode': async (p) => { for (const i of [1, 2, 3]) { await click(p, 'cockpit-mode >> [role=radio]', i); await wait(p, 1500); } },
  'cockpit-ui/alert': async (p) => { await call(p, () => document.querySelector('cockpit-alert').show('caution', 'Coolant pressure low')); await wait(p, 1800); await call(p, () => document.querySelector('cockpit-alert').show('warning', 'Hull breach, deck three')); await wait(p, 2600); },
  'cockpit-ui/tabs': async (p) => { await click(p, 'cockpit-tabs >> [role=tab]', 1); await wait(p, 1500); await click(p, 'cockpit-tabs >> [role=tab]', 2); await wait(p, 3200); },
  'cockpit-ui/agent': async (p) => { for (const [s, t] of [['thinking', 'planning the fix'], ['working', 'reading 12 files'], ['done', 'all tests pass']]) { await call(p, ([s, t]) => document.querySelector('cockpit-agent').set(s, t), [s, t]); await wait(p, 1700); } },
  'cockpit-ui/loading': async (p) => { await call(p, () => { const e = document.querySelector('cockpit-loading'); e.reset(); e.run?.(); }); await wait(p, 5200); },
  'cockpit-ui/stepper': async (p) => { for (let i = 0; i < 6; i++) { await click(p, 'cockpit-stepper >> button', 1); await wait(p, 320); } await wait(p, 1600); },
  'cockpit-ui/input': async (p) => { await type(p, 'cockpit-input >> input', 'AKIRA-7', 150); await wait(p, 300); await p.keyboard.press('Enter'); await wait(p, 2200); },

  'rubber-hose-ui/button': async (p) => { await moveTo(p, 'hose-button'); await click(p, 'hose-button >> button'); await wait(p, 3000); },
  'rubber-hose-ui/toggle': async (p) => { await click(p, 'hose-toggle >> button'); await wait(p, 2200); await click(p, 'hose-toggle >> button'); await wait(p, 1500); },
  'rubber-hose-ui/slider': async (p) => { await drag(p, 'hose-slider >> input', .35, .95, 700); await wait(p, 900); await drag(p, 'hose-slider >> input', .95, .3, 900); await wait(p, 1200); },
  'rubber-hose-ui/checkbox': async (p) => { await click(p, 'hose-checkbox >> input'); await wait(p, 2200); await click(p, 'hose-checkbox >> input'); await wait(p, 1400); },
  'rubber-hose-ui/radio': async (p) => { await click(p, 'hose-radio >> input', 1); await wait(p, 1800); await click(p, 'hose-radio >> input', 0); await wait(p, 1500); },
  'rubber-hose-ui/input': async (p) => { await type(p, 'hose-input >> input', 'Hello there!', 140); await wait(p, 1400); },
  'rubber-hose-ui/tabs': async (p) => { await click(p, 'hose-tabs >> [role=tab]', 1); await wait(p, 1700); await click(p, 'hose-tabs >> [role=tab]', 2); await wait(p, 1700); await click(p, 'hose-tabs >> [role=tab]', 0); await wait(p, 1200); },
  'rubber-hose-ui/progress': async (p) => { await feed(p, "document.querySelector('hose-progress').set(v)", 3600); await wait(p, 2200); },
  'rubber-hose-ui/rating': async (p) => { await click(p, 'hose-rating >> [role=radio]', 4); await wait(p, 2600); },
  'rubber-hose-ui/toast': async (p) => { await click(p, 'button#go, main button:not([aria-label])'); await wait(p, 3600); },
  'rubber-hose-ui/tooltip': async (p) => { await hover(p, 'hose-tooltip >> button'); await wait(p, 2600); await p.mouse.move(20, 20, { steps: 6 }); await wait(p, 900); },

  'sakuga-vfx/button': async (p) => { await moveTo(p, 'sakuga-button >> button'); await click(p, 'sakuga-button >> button'); await wait(p, 2300); },
  'sakuga-vfx/toggle': async (p) => { await click(p, 'sakuga-toggle >> button'); await wait(p, 1800); await click(p, 'sakuga-toggle >> button'); await wait(p, 1500); },
  'sakuga-vfx/slider': async (p) => { await drag(p, 'sakuga-slider >> input', .3, .95, 380); await wait(p, 1300); await drag(p, 'sakuga-slider >> input', .95, .3, 600); await wait(p, 1200); },
  'sakuga-vfx/checkbox': async (p) => { await click(p, 'sakuga-checkbox'); await wait(p, 1900); await click(p, 'sakuga-checkbox'); await wait(p, 1200); },
  'sakuga-vfx/radio': async (p) => { const [, , b] = await center(p, 'sakuga-radio'); await p.mouse.move(b.x + 12, b.y + b.height * .78, { steps: 10 }); await p.mouse.down(); await p.mouse.up(); await wait(p, 1800); },
  'sakuga-vfx/input': async (p) => { await type(p, 'sakuga-input >> input', 'Hello there', 150); await wait(p, 1200); },
  'sakuga-vfx/tabs': async (p) => { await click(p, 'sakuga-tabs >> [role=tab]', 1); await wait(p, 1300); await click(p, 'sakuga-tabs >> [role=tab]', 2); await wait(p, 1300); await click(p, 'sakuga-tabs >> [role=tab]', 0); await wait(p, 1200); },
  'sakuga-vfx/progress': async (p) => { await call(p, () => document.querySelector('sakuga-progress').reset()); await feed(p, "document.querySelector('sakuga-progress').set(v)", 3400); await wait(p, 2000); },
  'sakuga-vfx/rating': async (p) => { await click(p, 'sakuga-rating >> [role=radio]', 4); await wait(p, 2400); },
  'sakuga-vfx/toast': async (p) => { const [x, y] = await center(p, '#go'); await p.mouse.move(x, y, { steps: 10 }); await p.mouse.down(); await p.mouse.up(); await wait(p, 3800); },
  'sakuga-vfx/tooltip': async (p) => { await hover(p, 'sakuga-tooltip >> button'); await wait(p, 2200); await p.mouse.move(20, 20, { steps: 6 }); await wait(p, 900); },

  'pixel-worlds/sage': async (p) => { await wait(p, 6500); },
  'pixel-worlds/hoard': async (p) => { await press(p, 'hoard-button >> button', 3200); await wait(p, 2400); },
  'pixel-worlds/raven': async (p) => { await click(p, 'raven-send >> button'); await wait(p, 5200); },
  'pixel-worlds/round': async (p) => { await call(p, () => window.round?.demo?.()); await wait(p, 6500); },
  'pixel-worlds/keep': async (p) => { await type(p, 'keep-field >> input', 'Tr0ub4dor&3 horse', 150); await wait(p, 1800); },
  'pixel-worlds/sigil': async (p) => { await wait(p, 6000); },
};

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', args: ['--force-device-scale-factor=2'] });
for (const c of data.components) {
  if (only === '--missing' ? existsSync(`library/loops/${c.set}--${c.name}.mp4`) : only && !c.id.includes(only)) continue;
  if (!PLAY[c.id]) { console.log('no script for', c.id); continue; }
  const { w, h, box } = c.size;
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${BASE}_sets/${c.set}/${c.demo}?embed=1`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.mouse.move(w - 4, h - 4);
  // record: the screencast sends a frame whenever the page changes; each frame is held until the next one
  const cdp = await page.context().newCDPSession(page), frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: w * 2, maxHeight: h * 2, everyNthFrame: 1 });
  await page.waitForTimeout(600);
  try { await PLAY[c.id](page); } catch (e) { console.log(c.id, 'FAILED:', e.message.split('\n')[0]); await page.close(); continue; }
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await page.close();
  if (frames.length < 2) { console.log(c.id, 'no frames'); continue; }
  const dir = join(tmpdir(), `loop-${c.set}-${c.name}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  let list = '';
  frames.forEach((f, i) => {
    writeFileSync(join(dir, `${i}.jpg`), Buffer.from(f.data, 'base64'));
    const next = frames[i + 1]?.t ?? Math.max(f.t + 0.04, tEnd);
    list += `file '${i}.jpg'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}\n`;
  });
  list += `file '${frames.length - 1}.jpg'\n`;
  writeFileSync(join(dir, 'list.txt'), list);
  // crop like the still, cap the width at 720, even sizes for h264
  const fw = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width', '-of', 'csv=p=0', join(dir, '0.jpg')]).toString().trim();
  const k = fw / w; // the screencast's own scale, 2 when it honours the device pixel ratio
  const [x, y, cw, ch] = box.map((v) => Math.floor(v * k / 2) * 2), out = `library/loops/${c.set}--${c.name}.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
    '-vf', `crop=${cw}:${ch}:${x}:${y},scale='min(720,iw)':-2:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt601,fps=30,format=yuv420p`,
    // tagged with the matrix it was made with so browsers show the page's colours exactly and the clip sits on its card without a seam
    '-colorspace', 'smpte170m', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-movflags', '+faststart', '-an', out]);
  rmSync(dir, { recursive: true, force: true });
  const kb = Math.round(readFileSync(out).length / 1024);
  console.log(c.id, `${k}x, ${frames.length} frames, ${(tEnd - frames[0].t).toFixed(1)}s, ${kb} KB`);
}
await browser.close();
