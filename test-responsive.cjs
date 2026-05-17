const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const url = "http://127.0.0.1:5173/index.html";
const outDir = path.join(__dirname, "output", "responsive");

const devices = [
  { name: "desktop-1280x720", viewport: { width: 1280, height: 720 }, isMobile: false },
  { name: "iphone-390x844", viewport: { width: 390, height: 844 }, isMobile: true },
  { name: "iphone-landscape-844x390", viewport: { width: 844, height: 390 }, isMobile: true },
  { name: "ipad-820x1180", viewport: { width: 820, height: 1180 }, isMobile: true },
  { name: "ipad-landscape-1180x820", viewport: { width: 1180, height: 820 }, isMobile: true }
];

fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();

  for (const device of devices) {
    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.isMobile ? 2 : 1,
      isMobile: device.isMobile,
      hasTouch: device.isMobile
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);

    const box = await page.locator("canvas").boundingBox();
    if (!box) throw new Error(`Canvas missing on ${device.name}`);

    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight
    }));

    if (box.x < -1 || box.y < -1) {
      throw new Error(`${device.name} canvas starts outside viewport: ${JSON.stringify(box)}`);
    }
    if (box.x + box.width > device.viewport.width + 1 || box.y + box.height > device.viewport.height + 1) {
      throw new Error(`${device.name} canvas overflows viewport: ${JSON.stringify({ box, viewport: device.viewport })}`);
    }
    if (overflow.x > 1 || overflow.y > 1) {
      throw new Error(`${device.name} document overflow: ${JSON.stringify(overflow)}`);
    }

    const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode !== "menu") {
      throw new Error(`${device.name} expected menu mode, got ${state.mode}`);
    }
    if (device.viewport.height > device.viewport.width && box.height < device.viewport.height * 0.72) {
      throw new Error(`${device.name} portrait canvas is too small: ${JSON.stringify({ box, viewport: device.viewport })}`);
    }

    await page.screenshot({ path: path.join(outDir, `${device.name}.png`), fullPage: true });
    await clickCanvasPoint(page, box, device.viewport, state.interactiveTargets.fruitButtons[0]);
    await page.waitForTimeout(250);
    const clickedState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (clickedState.mode !== "order") {
      throw new Error(`${device.name} click mapping failed, expected order mode: ${JSON.stringify(clickedState)}`);
    }
    console.log(`${device.name}: canvas ${Math.round(box.width)}x${Math.round(box.height)} at ${Math.round(box.x)},${Math.round(box.y)}`);
    await context.close();
  }

  await browser.close();
}

async function clickCanvasPoint(page, box, viewport, rect) {
  const point = {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };

  if (viewport.height > viewport.width) {
    await page.mouse.click(
      box.x + box.width - (point.y / 540) * box.width,
      box.y + (point.x / 960) * box.height
    );
    return;
  }

  await page.mouse.click(
    box.x + (point.x / 960) * box.width,
    box.y + (point.y / 540) * box.height
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
