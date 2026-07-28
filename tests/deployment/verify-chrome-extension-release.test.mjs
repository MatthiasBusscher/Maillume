import assert from "node:assert/strict";
import test from "node:test";

import { verifyChromeExtensionRelease } from "../../scripts/verify-chrome-extension-release.mjs";

const extensionId = "bjiiailjalkfjimkjdikoockjlnjolle";

function updateXml({
  appId = extensionId,
  appStatus = "ok",
  updateStatus = "ok",
  version = "0.3.8",
  codebase = "https://clients2.googleusercontent.com/crx/maillume.crx",
} = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gupdate protocol="2.0">
  <app appid="${appId}" status="${appStatus}">
    <updatecheck codebase="${codebase}" status="${updateStatus}" version="${version}"/>
  </app>
</gupdate>`;
}

function response(xml, init = {}) {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
    ...init,
  });
}

test("accepts the exact live Chrome Web Store version", async () => {
  let requestedUrl;
  let requestedOptions;
  const result = await verifyChromeExtensionRelease({
    expectedVersion: "0.3.8",
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      return response(updateXml());
    },
  });

  assert.equal(requestedUrl.origin, "https://clients2.google.com");
  assert.equal(requestedUrl.pathname, "/service/update2/crx");
  assert.equal(requestedUrl.searchParams.get("response"), "updatecheck");
  assert.equal(requestedUrl.searchParams.get("acceptformat"), "crx3");
  assert.equal(requestedUrl.searchParams.get("x"), `id=${extensionId}&uc`);
  assert.equal(requestedOptions.redirect, "error");
  assert.deepEqual(result, {
    extensionId,
    version: "0.3.8",
    packageUrl: "https://clients2.googleusercontent.com/crx/maillume.crx",
  });
});

test("rejects an older live Store version", async () => {
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response(updateXml({ version: "0.3.5" })),
    }),
    /serves extension 0\.3\.5; expected 0\.3\.8/,
  );
});

test("rejects wrong app identity, unavailable updates, and unexpected package origins", async () => {
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response(updateXml({ appId: "a".repeat(32) })),
    }),
    /exactly one matching extension/,
  );
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response(updateXml({ updateStatus: "noupdate" })),
    }),
    /update status noupdate/,
  );
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response(updateXml({ codebase: "https://downloads.example.test/extension.crx" })),
    }),
    /unexpected package origin/,
  );
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response(
        `<gupdate>${updateXml().replace(/^<\?xml[^>]+>\s*/, "")}${
          updateXml({ appId: "a".repeat(32) }).replace(/^<\?xml[^>]+>\s*/, "")
        }</gupdate>`,
      ),
    }),
    /exactly one matching extension/,
  );
});

test("fails closed for malformed, oversized, or unsuccessful responses", async () => {
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    }),
    /HTTP 503/,
  );
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response("<gupdate/>"),
    }),
    /exactly one matching extension/,
  );
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      fetchImpl: async () => response("x".repeat(64 * 1024 + 1)),
    }),
    /size limit/,
  );
});

test("validates configured version and extension identifiers before fetching", async () => {
  let fetchCalled = false;
  const fetchImpl = async () => {
    fetchCalled = true;
    return response(updateXml());
  };

  await assert.rejects(
    verifyChromeExtensionRelease({ expectedVersion: "0.3", fetchImpl }),
    /numeric version format/,
  );
  await assert.rejects(
    verifyChromeExtensionRelease({
      expectedVersion: "0.3.8",
      extensionId: "not-an-extension-id",
      fetchImpl,
    }),
    /32 characters/,
  );
  assert.equal(fetchCalled, false);
});
