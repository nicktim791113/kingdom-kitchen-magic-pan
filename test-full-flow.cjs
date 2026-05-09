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

function expectFruit(state, fruitId) {
  if (state.fruit.id !== fruitId) {
    throw new Error(`Expected fruit ${fruitId}, got ${state.fruit.id}: ${JSON.stringify(state)}`);
  }
}

async function openMenuIfNeeded(page, pointer) {
  const state = await readState(page);
  if (state.mode === "reward") {
    await pointer.click(480, 428);
    await page.waitForTimeout(300);
  }
  expectMode(await readState(page), "menu");
}

async function chooseFruit(page, pointer, fruitId) {
  const state = await readState(page);
  const fruitButton = state.interactiveTargets.fruitButtons.find((button) => button.id === fruitId);
  if (!fruitButton) throw new Error(`Fruit button not found for ${fruitId}: ${JSON.stringify(state)}`);
  await pointer.click(fruitButton.x + fruitButton.w / 2, fruitButton.y + fruitButton.h / 2);
  await page.waitForTimeout(300);
  const selectedState = await readState(page);
  expectMode(selectedState, "order");
  expectFruit(selectedState, fruitId);
}

async function playRound(page, pointer, label, fruitId) {
  await openMenuIfNeeded(page, pointer);
  await screenshot(page, `${label}-01-menu`);
  await chooseFruit(page, pointer, fruitId);

  const orderState = await readState(page);
  expectMode(orderState, "order");
  expectFruit(orderState, fruitId);
  await screenshot(page, `${label}-02-order`);

  await pointer.click(725, 417);
  await page.waitForTimeout(200);
  expectMode(await readState(page), "wash");
  await screenshot(page, `${label}-03-wash-start`);

  await pointer.drag([
    [382, 300], [445, 306], [380, 336], [452, 286], [390, 350],
    [450, 330], [370, 315], [438, 282], [392, 346], [452, 316]
  ]);
  await page.waitForTimeout(500);
  expectMode(await readState(page), "cut");
  await screenshot(page, `${label}-04-cut`);

  await pointer.click(410, 315);
  await pointer.click(410, 315);
  await pointer.click(410, 315);
  await page.waitForTimeout(220);
  expectMode(await readState(page), "cut");
  await screenshot(page, `${label}-05-cut-sliced`);
  await page.waitForTimeout(700);
  expectMode(await readState(page), "cook");
  await screenshot(page, `${label}-06-cook`);

  await pointer.drag([[410, 315], [520, 330], [640, 350], [765, 361]]);
  await page.waitForTimeout(300);
  expectMode(await readState(page), "stir");
  await screenshot(page, `${label}-07-stir`);

  await pointer.circle(765, 361, 74, 3);
  await page.waitForTimeout(400);
  const finalState = await readState(page);
  expectMode(finalState, "reward");
  expectFruit(finalState, fruitId);
  await screenshot(page, `${label}-08-reward`);
  return finalState;
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

  const finalStates = [];
  finalStates.push(await playRound(page, pointer, "01-apple", "apple"));
  finalStates.push(await playRound(page, pointer, "02-banana", "banana"));
  finalStates.push(await playRound(page, pointer, "03-strawberry", "strawberry"));
  finalStates.push(await playRound(page, pointer, "04-orange", "orange"));
  const finalState = finalStates.at(-1);
  fs.writeFileSync(path.join(outDir, "final-state.json"), JSON.stringify(finalState, null, 2), "utf8");

  if (errors.length) {
    fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2), "utf8");
    throw new Error(`Console errors: ${errors.join("; ")}`);
  }

  await browser.close();
})();
