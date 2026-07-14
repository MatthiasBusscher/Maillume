/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { chromium } = require("playwright");

async function run() {
  const extensionPath = path.resolve("integrations/browser-extension");
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "maillume-extension-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    assert.match(extensionId, /^[a-p]{32}$/);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    assert.equal(await page.locator("h1").textContent(), "Maillume");
    assert.equal(await page.locator("#endpoint").inputValue(), "https://app.maillume.io");
    assert.equal(await page.locator("#analyze").isDisabled(), true);
    assert.equal(await page.locator("#result").isHidden(), true);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { force: true, recursive: true });
  }

  console.log("Loaded the unpacked Maillume extension in Playwright Chromium.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
