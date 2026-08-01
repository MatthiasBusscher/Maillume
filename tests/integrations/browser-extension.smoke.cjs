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
    const prepareFramedSelection = () => framedInput.evaluate(async (input) => {
      input.focus();
      input.setSelectionRange(7, 23);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { start: input.selectionStart, end: input.selectionEnd };
    });
    const inputCapture = await triggerCaptureWithRetry({
      browserSession,
      extensionId,
      messageTarget,
      prepareSelection: async () => {
        const selection = await prepareFramedSelection();
        assert.deepEqual(selection, { start: 7, end: 23 }, "the framed selection must exist before invoking the action");
      },
      tabId,
      worker,
    });
    assert.deepEqual(inputCapture, { status: "success", text: "framed selection" });

    const prepareWindowSelection = () => messagePage.locator("#window-message").evaluate((element) => {
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    const windowCapture = await triggerCaptureWithRetry({
      browserSession,
      extensionId,
      messageTarget,
      prepareSelection: prepareWindowSelection,
      tabId,
      worker,
    });
    assert.deepEqual(windowCapture, { status: "success", text: "Window selection text" });

    // Keep the handoff unconsumed while the panel APIs are patched, then
    // force a worker restart and let the panel wake the new worker.
    await triggerHandoffWithRetry({
      browserSession,
      extensionId,
      messageTarget,
      prepareSelection: prepareWindowSelection,
      tabId,
      worker,
    });

    const serviceWorkerTarget = await findServiceWorkerTarget(browserSession, extensionId);
    assert.ok(serviceWorkerTarget, "the extension service worker target must be available for the suspension check");
    await worker.evaluate(() => { globalThis.__maillumeSmokeSentinel = "before-suspension"; });
    const closeResult = await browserSession.send("Target.closeTarget", { targetId: serviceWorkerTarget.targetId });
    assert.equal(closeResult.success, true, "the smoke harness must be able to stop the service worker");

    const panelPage = await context.newPage();
    await panelPage.setViewportSize({ width: 320, height: 900 });
    await panelPage.addInitScript((sourceTabId) => {
      const originalQuery = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = (query) => query?.active && query.currentWindow
        ? Promise.resolve([{ id: sourceTabId }])
        : originalQuery(query);
    }, tabId);
    await panelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    const restartedWorker = await waitForServiceWorker(context, browserSession, extensionId);
    assert.ok(restartedWorker, "opening the panel must restart the suspended service worker");
    assert.equal(await restartedWorker.evaluate(() => globalThis.__maillumeSmokeSentinel || null), null, "the panel must wake a fresh service-worker global");
    assert.equal(await panelPage.locator("h1").textContent(), "Maillume");
    const brandLogo = panelPage.locator("header .brand-logo");
    assert.equal(await brandLogo.count(), 1, "the header must use the packaged Maillume brand mark");
    assert.equal(await brandLogo.getAttribute("src"), "icons/icon-48.png");
    assert.equal(await brandLogo.getAttribute("alt"), "", "the visible product name remains the accessible label");
    assert.equal(await brandLogo.getAttribute("width"), "48");
    assert.equal(await brandLogo.getAttribute("height"), "48");
    assert.equal(await panelPage.locator("#scannerView").isVisible(), true, "the scanner must be the default panel view");
    assert.equal(await panelPage.locator("#settingsView").isHidden(), true, "connection controls must stay out of the scanner by default");
    assert.equal(await panelPage.locator("#settingsToggle").getAttribute("aria-expanded"), "false");
    assert.equal(await panelPage.locator("#scannerView #connectionState").count(), 0, "browser connection state must live only in Settings");
    assert.equal(await panelPage.locator("#scannerView #destination").count(), 0, "deployment state must live only in Settings");
    assert.equal(await panelPage.locator("#endpoint").inputValue(), "https://app.maillume.io");
    assert.equal(await panelPage.locator("#result").isHidden(), true);
    assert.equal(await panelPage.locator("#capture").count(), 1);
    assert.equal(await panelPage.locator("#capture").textContent(), "Use current message");
    assert.equal(await panelPage.locator(".number").count(), 0, "the narrow panel must not reserve a numbered gutter");
    assert.equal(await panelPage.locator("#captureStep").getAttribute("aria-labelledby"), "captureHeading");
    assert.equal(await panelPage.locator("#reviewStep").getAttribute("aria-labelledby"), "reviewHeading");
    assert.equal(await panelPage.locator("#captureHeading").textContent(), "Capture the open message");
    assert.equal(await panelPage.locator("#reviewHeading").textContent(), "Review the captured details");
    assert.equal(await panelPage.locator("#captureHelpToggle").getAttribute("aria-expanded"), "true");
    await panelPage.locator("#captureHelpToggle").click();
    assert.equal(await panelPage.locator("#captureHelpToggle").getAttribute("aria-expanded"), "false");
    await panelPage.locator("#captureHelpToggle").click();
    assert.equal(await panelPage.locator("#captureHelpToggle").getAttribute("aria-expanded"), "true");
    await assertPanelFitsViewport(panelPage);
    await panelPage.setViewportSize({ width: 280, height: 900 });
    await assertPanelFitsViewport(panelPage);
    await panelPage.locator("#settingsToggle").click();
    assert.equal(await panelPage.locator("#scannerView").isHidden(), true, "Settings must replace rather than lengthen the scan workflow");
    assert.equal(await panelPage.locator("#settingsView").isVisible(), true);
    assert.equal(await panelPage.locator("#settingsToggle").getAttribute("aria-expanded"), "true");
    assert.equal(await panelPage.locator("#connectionState").isVisible(), true, "connection state must be available in Settings");
    assert.equal(await panelPage.locator("#destination").isVisible(), true, "deployment state must be available in Settings");
    await assertPanelFitsViewport(panelPage, ["#settingsBack", "#endpoint", "#connect"]);
    await panelPage.locator("#settingsBack").click();
    assert.equal(await panelPage.locator("#scannerView").isVisible(), true);
    assert.equal(await panelPage.locator("#settingsView").isHidden(), true);
    assert.equal(await panelPage.locator("#settingsToggle").getAttribute("aria-expanded"), "false");
    assert.deepEqual(
      await panelPage.locator("script[src]").evaluateAll((scripts) => scripts.map((script) => script.getAttribute("src"))),
      [
        "sidepanel-compatibility.js",
        "sidepanel-copy.js",
        "sidepanel-contract.js",
        "sidepanel-render.js",
        "sidepanel-capture.js",
        "sidepanel-connection.js",
        "sidepanel.js",
      ],
      "the panel must use only the ordered, packaged local modules",
    );
    const recoveredBody = await waitForPanelBody(panelPage, "Window selection text");
    assert.equal(recoveredBody, "Window selection text");
    assert.equal(await panelPage.locator("#analyze").isEnabled(), true, "a captured message without a connection must offer a clear next step");
    await panelPage.locator("#analyze").click();
    assert.equal(await panelPage.locator("#status").textContent(), "Connect this browser first, or use Advanced manual setup.");

    const rememberedKey = `mlm_${"r".repeat(43)}`;
    await panelPage.evaluate(async (apiKey) => {
      await chrome.storage.local.set({ apiKey });
      await chrome.storage.session.remove(["apiKey"]);
    }, rememberedKey);
    await panelPage.reload();
    await panelPage.locator("#settingsToggle").click();
    assert.equal(await panelPage.locator("#apiKey").inputValue(), rememberedKey);
    assert.equal(await panelPage.locator("#rememberApiKey").isChecked(), true);
    await panelPage.getByText("Advanced manual setup", { exact: true }).click();
    await panelPage.locator("#apiKeyVisibility").click();
    assert.equal(await panelPage.locator("#apiKey").getAttribute("type"), "text");
    assert.equal(await panelPage.locator("#apiKeyVisibility").getAttribute("aria-pressed"), "true");

    const managedKey = `mlm_${"b".repeat(43)}`;
    const managedExpiry = new Date(Date.now() + 90 * 86_400_000).toISOString();
    const managedHardExpiry = new Date(Date.now() + 365 * 86_400_000).toISOString();
    await panelPage.evaluate(async ({ apiKey, expiresAt, hardExpiresAt }) => {
      await chrome.storage.local.set({
        apiKey,
        apiKeyExpiresAt: expiresAt,
        apiKeyHardExpiresAt: hardExpiresAt,
        connectionKind: "browser",
        endpoint: "https://app.maillume.io",
      });
      await chrome.storage.session.remove([
        "apiKey",
        "apiKeyExpiresAt",
        "apiKeyHardExpiresAt",
        "connectionKind",
      ]);
    }, { apiKey: managedKey, expiresAt: managedExpiry, hardExpiresAt: managedHardExpiry });
    await panelPage.reload();
    assert.equal(await panelPage.locator("#scannerView").isVisible(), true, "a connected browser must return to the scan workflow after reload");
    await panelPage.locator("#settingsToggle").click();
    assert.equal(await panelPage.locator("#apiKey").inputValue(), "", "a managed key must remain outside the manual field after reopening the panel");
    assert.equal(await panelPage.locator("#apiKeyVisibility").isDisabled(), true, "a managed key must disable the manual field visibility control");
    await panelPage.locator("#apiKeyVisibility").evaluate((element) => element.click());
    assert.equal(await panelPage.locator("#apiKey").getAttribute("type"), "password", "the managed credential visibility control must not switch field state");
    assert.equal(await panelPage.locator("#apiKeyVisibility").getAttribute("aria-pressed"), "false");
    assert.equal(await panelPage.locator("#connectionState").textContent(), "Connected through your Maillume account.");
    assert.equal(await panelPage.locator("#connect").isHidden(), true, "a healthy stored browser connection must not offer another connection action");
    assert.equal(await panelPage.locator("#reset").isVisible(), true, "the connected state must retain a removal action");
    await panelPage.locator("#reset").click();
    assert.deepEqual(await panelPage.evaluate(async () => chrome.storage.local.get(["apiKey", "connectionKind"])), {}, "removing a browser connection must clear local credential state");
    assert.equal(await panelPage.locator("#apiKeyVisibility").isDisabled(), false, "removing a browser connection must restore manual key visibility control");

    await panelPage.locator("#reviewStep").evaluate((element) => { element.hidden = true; });
    assert.equal(await panelPage.locator("#reviewStep").isHidden(), true, "the review step must collapse after analysis");

  } finally {
    if (context) await context.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(userDataDir, { force: true, recursive: true });
  }

  console.log("Captured selections and verified in-panel recapture plus remembered-key visibility in Playwright Chromium.");
}

async function waitForPanelBody(panelPage, expectedBody) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const value = await panelPage.locator("#body").inputValue();
    if (value === expectedBody) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const diagnostics = await panelPage.evaluate(async () => ({
    body: document.querySelector("#body")?.value,
    status: document.querySelector("#status")?.textContent,
    session: await chrome.storage.session.get(null),
  }));
  throw new Error(`The panel did not recover the capture after worker suspension: ${JSON.stringify(diagnostics)}`);
}

async function assertPanelFitsViewport(panelPage, selectors = ["#capture", "#subject", "#sender", "#body", "#analyze"]) {
  const layout = await panelPage.evaluate((activeSelectors) => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    controls: activeSelectors.map((selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return { selector, left: rect?.left, right: rect?.right };
    }),
  }), selectors);
  assert.ok(layout.scrollWidth <= layout.innerWidth, `side panel must not scroll horizontally at ${layout.innerWidth}px`);
  for (const control of layout.controls) {
    assert.equal(Number.isFinite(control.left), true, `${control.selector} must be visible`);
    assert.ok(control.left >= 0 && control.right <= layout.innerWidth, `${control.selector} must fit within the narrow panel`);
  }
}

async function triggerCaptureWithRetry({ browserSession, extensionId, messageTarget, prepareSelection, tabId, worker }) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await prepareSelection();
    await browserSession.send("Extensions.triggerAction", { id: extensionId, targetId: messageTarget.targetId });
    try {
      return await waitForCapture(worker, tabId);
    } catch (error) {
      lastError = error;
      if (error.code !== "no_selection") throw error;
    }
  }
  throw lastError;
}

async function triggerHandoffWithRetry({ browserSession, extensionId, messageTarget, prepareSelection, tabId, worker }) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await prepareSelection();
    await browserSession.send("Extensions.triggerAction", { id: extensionId, targetId: messageTarget.targetId });
    try {
      return await waitForHandoffDescriptor(worker, tabId);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function waitForCapture(worker, tabId) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const capture = await worker.evaluate((id) => consumeCapture(id), tabId);
    if (capture.status === "success") return capture;
    if (capture.status === "error" && capture.code !== "handoff_missing") {
      const error = new Error(`Toolbar capture failed: ${capture.code}`);
      error.code = capture.code;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The extension action did not produce a capture within five seconds.");
}

async function waitForHandoffDescriptor(worker, tabId) {
  const key = `capture-handoff:${tabId}`;
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const descriptor = await worker.evaluate(async (storageKey) => {
      const stored = await chrome.storage.session.get(storageKey);
      return stored[storageKey];
    }, key);
    if (descriptor?.status === "success") return descriptor;
    if (descriptor?.status === "error") throw new Error("Toolbar capture did not produce a successful handoff.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The extension did not persist a capture recovery descriptor within five seconds.");
}

async function findServiceWorkerTarget(browserSession, extensionId) {
  const { targetInfos } = await browserSession.send("Target.getTargets");
  return targetInfos.find(({ type, url }) => type === "service_worker" && url === `chrome-extension://${extensionId}/service-worker.js`);
}

async function waitForServiceWorker(context, browserSession, extensionId) {
  const deadline = Date.now() + 5_000;
  let lastTargets = [];
  while (Date.now() < deadline) {
    const worker = context.serviceWorkers().find((candidate) => candidate.url() === `chrome-extension://${extensionId}/service-worker.js`);
    if (worker) {
      const { targetInfos } = await browserSession.send("Target.getTargets");
      lastTargets = targetInfos.filter(({ type, url }) => type === "service_worker" && url === worker.url());
      if (targetInfos.some(({ type, url }) => type === "service_worker" && url === worker.url())) return worker;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Chrome did not restart the extension service worker after the panel opened: ${JSON.stringify(lastTargets)}`);
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
