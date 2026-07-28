import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_EXTENSION_ID = "bjiiailjalkfjimkjdikoockjlnjolle";
const MAX_RESPONSE_BYTES = 64 * 1024;

export async function verifyChromeExtensionRelease({
  expectedVersion,
  extensionId = DEFAULT_EXTENSION_ID,
  fetchImpl = fetch,
} = {}) {
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(expectedVersion ?? "")) {
    throw new Error("Expected extension version must use Chrome's numeric version format.");
  }
  if (!/^[a-p]{32}$/.test(extensionId)) {
    throw new Error("Chrome extension ID must contain exactly 32 characters from a through p.");
  }

  const updateUrl = new URL("https://clients2.google.com/service/update2/crx");
  updateUrl.searchParams.set("response", "updatecheck");
  updateUrl.searchParams.set("prodversion", "140.0.0.0");
  updateUrl.searchParams.set("acceptformat", "crx3");
  updateUrl.searchParams.set("x", `id=${extensionId}&uc`);

  const response = await fetchImpl(updateUrl, {
    headers: { Accept: "application/xml,text/xml" },
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Chrome update service returned HTTP ${response.status}.`);
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Chrome update response exceeds the release-check size limit.");
  }

  const xml = await response.text();
  if (Buffer.byteLength(xml, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Chrome update response exceeds the release-check size limit.");
  }

  const appMatches = [...xml.matchAll(/<app\b([^>]*)>/g)];
  const matchingApps = appMatches.filter((match) =>
    parseAttributes(match[1]).appid === extensionId
  );
  if (appMatches.length !== 1 || matchingApps.length !== 1) {
    throw new Error("Chrome update response does not contain exactly one matching extension.");
  }

  const appMatch = matchingApps[0];
  const appAttributes = parseAttributes(appMatch[1]);
  if (appAttributes.status !== "ok") {
    throw new Error(`Chrome update response reports app status ${appAttributes.status ?? "missing"}.`);
  }

  const appEnd = xml.indexOf("</app>", appMatch.index + appMatch[0].length);
  if (appEnd < 0) {
    throw new Error("Chrome update response contains an unterminated app record.");
  }
  const appBody = xml.slice(appMatch.index + appMatch[0].length, appEnd);
  const updateMatches = [...appBody.matchAll(/<updatecheck\b([^>]*)\/?>/g)];
  if (updateMatches.length !== 1) {
    throw new Error("Chrome update response does not contain exactly one update record.");
  }

  const update = parseAttributes(updateMatches[0][1]);
  if (update.status !== "ok") {
    throw new Error(`Chrome update response reports update status ${update.status ?? "missing"}.`);
  }
  if (update.version !== expectedVersion) {
    throw new Error(
      `Chrome Web Store serves extension ${update.version ?? "missing"}; expected ${expectedVersion}.`,
    );
  }

  let codebase;
  try {
    codebase = new URL(update.codebase);
  } catch {
    throw new Error("Chrome update response is missing a valid package URL.");
  }
  if (
    codebase.protocol !== "https:"
    || !["clients2.google.com", "clients2.googleusercontent.com"].includes(codebase.hostname)
  ) {
    throw new Error("Chrome update response returned an unexpected package origin.");
  }

  return {
    extensionId,
    version: update.version,
    packageUrl: codebase.href,
  };
}

function parseAttributes(source) {
  const attributes = {};
  const attributePattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/g;
  for (const match of source.matchAll(attributePattern)) {
    if (Object.hasOwn(attributes, match[1])) {
      throw new Error(`Chrome update response repeats attribute ${match[1]}.`);
    }
    attributes[match[1]] = match[2];
  }
  return attributes;
}

async function readExpectedVersion() {
  const manifestPath = path.join(
    process.cwd(),
    "integrations/browser-extension/manifest.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return manifest.version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const expectedVersion = await readExpectedVersion();
  verifyChromeExtensionRelease({ expectedVersion })
    .then(({ extensionId, version }) => {
      console.log(`Chrome Web Store release verified: ${extensionId} (${version})`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
