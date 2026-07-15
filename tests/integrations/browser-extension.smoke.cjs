/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const { chromium } = require("playwright");

async function run() {
  const extensionPath = path.resolve("integrations/browser-extension");
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "maillume-extension-"));
  const server = await startFixtureServer();
  const fixtureUrl = `http://127.0.0.1:${server.address().port}/`;
  let context;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    assert.match(extensionId, /^[a-p]{32}$/);

    const panelApisPatched = await worker.evaluate(() => {
      globalThis.__maillumeOriginalSetOptions = chrome.sidePanel.setOptions;
      globalThis.__maillumeOriginalOpen = chrome.sidePanel.open;
      const noOp = async () => {};
      chrome.sidePanel.setOptions = noOp;
      chrome.sidePanel.open = noOp;
      return chrome.sidePanel.setOptions === noOp && chrome.sidePanel.open === noOp;
    });
    assert.equal(panelApisPatched, true, "the smoke harness must keep the capture handoff available for inspection");

    const messagePage = await context.newPage();
    await messagePage.goto(fixtureUrl);
    const browserSession = await context.browser().newBrowserCDPSession();
    const { targetInfos } = await browserSession.send("Target.getTargets", {
      filter: [{ type: "tab", exclude: false }, { exclude: true }],
    });
    const messageTarget = targetInfos.find(({ type, url }) => type === "tab" && url === fixtureUrl);
    assert.ok(messageTarget, "the fixture tab target must be available to the browser-level action trigger");
    const tabId = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.id;
    });
    assert.equal(Number.isInteger(tabId), true);

    const framedInput = messagePage.frameLocator("#message-frame").locator("#message-body");
    await framedInput.fill("Before framed selection after");
    await messagePage.bringToFront();
    const inputSelection = await framedInput.evaluate(async (input) => {
      input.focus();
      input.setSelectionRange(7, 23);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { start: input.selectionStart, end: input.selectionEnd };
    });
    assert.deepEqual(inputSelection, { start: 7, end: 23 }, "the framed selection must exist before invoking the action");
    await browserSession.send("Extensions.triggerAction", { id: extensionId, targetId: messageTarget.targetId });
    const inputCapture = await waitForCapture(worker, tabId);
    assert.deepEqual(inputCapture, { status: "success", text: "framed selection" });

    await messagePage.locator("#window-message").evaluate((element) => {
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await browserSession.send("Extensions.triggerAction", { id: extensionId, targetId: messageTarget.targetId });
    const windowCapture = await waitForCapture(worker, tabId);
    assert.deepEqual(windowCapture, { status: "success", text: "Window selection text" });

    const panelApisRestored = await worker.evaluate(() => {
      chrome.sidePanel.setOptions = globalThis.__maillumeOriginalSetOptions;
      chrome.sidePanel.open = globalThis.__maillumeOriginalOpen;
      return chrome.sidePanel.setOptions === globalThis.__maillumeOriginalSetOptions
        && chrome.sidePanel.open === globalThis.__maillumeOriginalOpen;
    });
    assert.equal(panelApisRestored, true);
    await browserSession.send("Extensions.triggerAction", { id: extensionId, targetId: messageTarget.targetId });
    const panelOptions = await waitForPanelOptions(worker, tabId);
    assert.equal(panelOptions.enabled, true);
    assert.equal(panelOptions.path, "sidepanel.html");
    await waitForTarget(browserSession, `chrome-extension://${extensionId}/sidepanel.html`);

    const panelPage = await context.newPage();
    await panelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    assert.equal(await panelPage.locator("h1").textContent(), "Maillume");
    assert.equal(await panelPage.locator("#endpoint").inputValue(), "https://app.maillume.io");
    assert.equal(await panelPage.locator("#analyze").isDisabled(), true);
    assert.equal(await panelPage.locator("#result").isHidden(), true);
    assert.equal(await panelPage.locator("#capture").count(), 1);
    assert.equal(await panelPage.locator("#capture").textContent(), "Use current message");
  } finally {
    if (context) await context.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(userDataDir, { force: true, recursive: true });
  }

  console.log("Captured framed-input and window selections and verified the in-panel recapture action in Playwright Chromium.");
}

async function waitForCapture(worker, tabId) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const capture = await worker.evaluate((id) => consumeCapture(id), tabId);
    if (capture.status === "success") return capture;
    if (capture.status === "error" && capture.code !== "handoff_missing") {
      throw new Error(`Toolbar capture failed: ${capture.code}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The extension action did not produce a capture within five seconds.");
}

async function waitForTarget(browserSession, url) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const { targetInfos } = await browserSession.send("Target.getTargets");
    const target = targetInfos.find((candidate) => candidate.url === url);
    if (target) return target;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Chrome did not open the expected side-panel target: ${url}`);
}

async function waitForPanelOptions(worker, tabId) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const options = await worker.evaluate(async (id) => chrome.sidePanel.getOptions({ tabId: id }), tabId);
    if (options.enabled && options.path === "sidepanel.html") return options;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Chrome did not enable the tab-specific Maillume side panel within five seconds.");
}

async function startFixtureServer() {
  const server = http.createServer((request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.url === "/frame") {
      response.end("<!doctype html><html><body><textarea id=\"message-body\"></textarea></body></html>");
      return;
    }
    response.end("<!doctype html><html><body><p id=\"window-message\" tabindex=\"0\">Window selection text</p><iframe id=\"message-frame\" src=\"/frame\"></iframe></body></html>");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
