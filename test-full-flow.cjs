const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const url = "http://127.0.0.1:5173/index.html";
const outDir = path.join(__dirname, "output", "web-game-full");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

async function screenshot(page, name) {
  await page.locator("canvas").screenshot({ path: path.join(outDir, `${name}.png`) });
}

async function makePointer(page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");

  const toPage = (x, y) => ({
    x: box.x + (x / 960) * box.width,
    y: box.y + (y / 540) * box.height
  });

  return {
    async click(x, y) {
      const point = toPage(x, y);
      await page.mouse.click(point.x, point.y);
    },
    async drag(points) {
      const first = toPage(points[0][0], points[0][1]);
      await page.mouse.move(first.x, first.y);
      await page.mouse.down();
      for (const [x, y] of points.slice(1)) {
        const point = toPage(x, y);
        await page.mouse.move(point.x, point.y, { steps: 4 });
      }
      await page.mouse.up();
    },
    async circle(cx, cy, radius, turns) {
      const first = toPage(cx + radius, cy);
      await page.mouse.move(first.x, first.y);
      await page.mouse.down();
      const total = turns * 24;
      for (let i = 1; i <= total; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const point = toPage(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        await page.mouse.move(point.x, point.y, { steps: 2 });
      }
      await page.mouse.up();
    }
  };
}

function expectMode(state, mode) {
  if (state.mode !== mode) {
    throw new Error(`Expected mode ${mode}, got ${state.mode}: ${JSON.stringify(state)}`);
  }
}

(async () => {
  ensureDir(outDir);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const pointer = await makePointer(page);

  await screenshot(page, "01-menu");
  await pointer.click(480, 423);
  await page.waitForTimeout(300);
  expectMode(await readState(page), "order");
  await screenshot(page, "02-order");

  await pointer.click(725, 417);
  await page.waitForTimeout(200);
  expectMode(await readState(page), "wash");
  await screenshot(page, "03-wash-start");

  await pointer.drag([
    [382, 300], [445, 306], [380, 336], [452, 286], [390, 350],
    [450, 330], [370, 315], [438, 282], [392, 346], [452, 316]
  ]);
  await page.waitForTimeout(500);
  expectMode(await readState(page), "cut");
  await screenshot(page, "04-cut");

  await pointer.click(410, 315);
  await pointer.click(410, 315);
  await pointer.click(410, 315);
  await page.waitForTimeout(220);
  expectMode(await readState(page), "cut");
  await screenshot(page, "05-cut-sliced");
  await page.waitForTimeout(700);
  expectMode(await readState(page), "cook");
  await screenshot(page, "06-cook");

  await pointer.drag([[410, 315], [520, 330], [640, 350], [765, 361]]);
  await page.waitForTimeout(300);
  expectMode(await readState(page), "stir");
  await screenshot(page, "07-stir");

  await pointer.circle(765, 361, 74, 3);
  await page.waitForTimeout(400);
  const finalState = await readState(page);
  expectMode(finalState, "reward");
  await screenshot(page, "08-reward");
  fs.writeFileSync(path.join(outDir, "final-state.json"), JSON.stringify(finalState, null, 2), "utf8");

  if (errors.length) {
    fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2), "utf8");
    throw new Error(`Console errors: ${errors.join("; ")}`);
  }

  await browser.close();
})();
