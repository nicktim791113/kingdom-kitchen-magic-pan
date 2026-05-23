// Capture screenshots of menu / wash / cut / cook stages for visual review.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text()); });

  await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const outDir = path.resolve(__dirname);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Menu
  await page.screenshot({ path: path.join(outDir, 'shot-1-menu.png') });

  // Helper: set game state by tapping into the global vars
  async function setMode(mode, fruitIndex = 0, extra = {}) {
    await page.evaluate(({ mode, fruitIndex, extra }) => {
      state.fruit = FRUITS[fruitIndex];
      state.selectedFruitIndex = fruitIndex;
      state.guest = GUESTS[0];
      state.mode = mode;
      Object.assign(state, extra);
    }, { mode, fruitIndex, extra });
    await page.waitForTimeout(500);
  }

  // 2. Wash (apple, mid-progress)
  await setMode('wash', 0, { wash: 0.45, drag: { type: 'wash', last: { x: 450, y: 280 } } });
  await page.screenshot({ path: path.join(outDir, 'shot-2-wash.png') });

  // 3. Cut (apple, 1 cut done, drawing trail)
  await setMode('cut', 0, {
    cuts: 1.2,
    cutMarks: [{ start: { x: 380, y: 240 }, end: { x: 360, y: 360 }, color: '#ffecb3' }],
    cutTrail: [
      { x: 420, y: 240 }, { x: 415, y: 270 }, { x: 410, y: 300 }, { x: 405, y: 330 }, { x: 400, y: 360 }
    ],
    drag: { type: 'prep', last: { x: 400, y: 360 } },
    cutFlash: 0.15
  });
  await page.screenshot({ path: path.join(outDir, 'shot-3-cut.png') });

  // 4. Cook
  await setMode('cook', 2, { apple: { x: 600, y: 320, r: 46 }, drag: { type: 'apple', last: { x: 600, y: 320 } } });
  await page.screenshot({ path: path.join(outDir, 'shot-4-cook.png') });

  // 5. Stir
  await setMode('stir', 3, { stir: { active: true, lastAngle: 0, travel: Math.PI * 1.8 } });
  await page.screenshot({ path: path.join(outDir, 'shot-5-stir.png') });

  await browser.close();
  console.log('Done');
})().catch((e) => { console.error(e); process.exit(1); });
