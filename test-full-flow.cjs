// Smoke test for the new 1-fruit + 3-vegetable flow.
// Walks: menu -> order -> wash -> cut -> plate -> wash veg (internal loop) ->
//        cut veg (internal loop) -> cook -> stir -> reward
// Screenshots every transition for visual verification.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const url = "http://127.0.0.1:5173/index.html";
const outDir = path.join(__dirname, "output", "web-game-full");

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
async function readState(page) { return JSON.parse(await page.evaluate(() => window.render_game_to_text())); }
async function shot(page, name) { await page.locator("canvas").screenshot({ path: path.join(outDir, `${name}.png`) }); }

async function makePointer(page) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  const toPage = (x, y) => ({ x: box.x + (x / 960) * box.width, y: box.y + (y / 540) * box.height });
  return {
    async click(x, y) { const p = toPage(x, y); await page.mouse.click(p.x, p.y); },
    async drag(points) {
      const first = toPage(points[0][0], points[0][1]);
      await page.mouse.move(first.x, first.y);
      await page.mouse.down();
      for (const [x, y] of points.slice(1)) {
        const p = toPage(x, y);
        await page.mouse.move(p.x, p.y, { steps: 4 });
      }
      await page.mouse.up();
    },
    async dragTo(fromX, fromY, toX, toY) {
      await this.drag([[fromX, fromY], [(fromX + toX) / 2, (fromY + toY) / 2], [toX, toY]]);
    },
    async circle(cx, cy, radius, turns) {
      const first = toPage(cx + radius, cy);
      await page.mouse.move(first.x, first.y);
      await page.mouse.down();
      const total = turns * 24;
      for (let i = 1; i <= total; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const p = toPage(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        await page.mouse.move(p.x, p.y, { steps: 2 });
      }
      await page.mouse.up();
    }
  };
}

function expect(state, mode, hint) {
  if (state.mode !== mode) throw new Error(`Expected mode ${mode}, got ${state.mode} (${hint || ""}): ${JSON.stringify(state)}`);
}

// Drag the wash gesture until the mode leaves "wash". In veg phase this drains all 3 veggies.
async function washCurrent(page, pointer) {
  for (let attempt = 0; attempt < 8; attempt++) {
    await pointer.drag([
      [382, 300], [445, 306], [380, 336], [452, 286], [390, 350],
      [450, 330], [370, 315], [438, 282], [392, 346], [452, 316]
    ]);
    await page.waitForTimeout(120);
    const s = await readState(page);
    if (s.mode !== "wash") return s;
    if (s.progress.wash >= 0.99) await page.waitForTimeout(280);
  }
  return await readState(page);
}

// Cut gesture loop. For "slice"/"segment"/"brush"-style prep this is enough; the
// "peel" prep (banana) takes a sweeping drag instead.
async function cutCurrent(page, pointer) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const s = await readState(page);
    if (s.progress.prepKind === "peel") {
      await pointer.drag([
        [380, 315], [430, 335], [470, 355], [390, 348], [462, 326],
        [520, 344], [430, 362], [486, 320], [530, 350]
      ]);
    } else {
      await pointer.drag([[354, 260], [390, 296], [430, 334], [470, 374]]);
      await page.waitForTimeout(80);
      await pointer.drag([[466, 258], [430, 296], [396, 336], [360, 374]]);
      await page.waitForTimeout(80);
      await pointer.drag([[344, 330], [386, 318], [430, 306], [480, 292]]);
    }
    await page.waitForTimeout(160);
    const after = await readState(page);
    if (after.mode !== "cut") return after;
    if (after.progress.cuts >= 3) await page.waitForTimeout(720);
  }
  return await readState(page);
}

async function dragPiecesUntilEmpty(page, pointer, target, settledKey, maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const fresh = await readState(page);
    const next = fresh.interactiveTargets.pieces.find((p) => !p[settledKey]);
    if (!next) return;
    await pointer.dragTo(next.x, next.y, target.x, target.y);
    await page.waitForTimeout(250);
  }
}

(async () => {
  ensureDir(outDir);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.addInitScript(() => localStorage.removeItem("kingdomKitchenStickers"));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const pointer = await makePointer(page);

  let state = await readState(page);
  expect(state, "menu", "initial");
  await shot(page, "01-menu");

  // Pick apple as the main fruit.
  const apple = state.interactiveTargets.fruitButtons.find((b) => b.id === "apple");
  await pointer.click(apple.x + apple.w / 2, apple.y + apple.h / 2);
  await page.waitForTimeout(300);
  state = await readState(page);
  expect(state, "order", "after picking apple");
  await shot(page, "02-order");

  const order = state.interactiveTargets.orderButton;
  await pointer.click(order.x + order.w / 2, order.y + order.h / 2);
  await page.waitForTimeout(250);
  expect(await readState(page), "wash", "wash apple");
  await shot(page, "03-wash-apple");

  state = await washCurrent(page, pointer);
  expect(state, "cut", "after wash apple");
  await shot(page, "04-cut-apple");

  state = await cutCurrent(page, pointer);
  expect(state, "plate", "after cut apple");
  await shot(page, "05-plate-empty");

  state = await readState(page);
  await dragPiecesUntilEmpty(page, pointer, state.interactiveTargets.plate, "inPlate");
  await page.waitForTimeout(900);
  state = await readState(page);
  await shot(page, "06-veg-wash-start");
  expect(state, "wash", "after plate");
  if (state.fruit.id !== "tomato") throw new Error(`Expected first veg tomato, got ${state.fruit.id}`);

  state = await washCurrent(page, pointer);
  await shot(page, "07-veg-wash-done");
  expect(state, "cut", "after wash all veg");
  if (state.fruit.id !== "tomato") throw new Error(`Expected veg-cut to start at tomato, got ${state.fruit.id}`);

  state = await cutCurrent(page, pointer);
  await shot(page, "08-veg-cut-done");
  expect(await readState(page), "cook", "after veg cut");
  await shot(page, "09-cook-ready");

  state = await readState(page);
  await dragPiecesUntilEmpty(page, pointer, state.interactiveTargets.pot, "inPot");
  await page.waitForTimeout(900);
  expect(await readState(page), "stir", "after cook");
  await shot(page, "10-stir");

  const pot = state.interactiveTargets.pot;
  await pointer.circle(pot.x, pot.y, 74, 4);
  await page.waitForTimeout(500);
  state = await readState(page);
  expect(state, "reward", "after stir");
  await shot(page, "11-reward");

  if (errors.length) {
    fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2));
    throw new Error(`Console errors: ${errors.join("; ")}`);
  }

  fs.writeFileSync(path.join(outDir, "final-state.json"), JSON.stringify(state, null, 2));
  console.log("All transitions OK.");
  await browser.close();
})();
