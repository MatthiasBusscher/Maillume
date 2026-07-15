import { pathToFileURL } from "node:url";

const EXPECTED_ANALYSIS_VERSION = "analysis-v2.1";

export async function verifyPublicDeployment({
  appUrl = "https://app.maillume.io",
  marketingUrl = "https://maillume.io",
  expectedRevision,
  attempts = 12,
  delayMs = 5_000,
  fetchImpl = fetch,
} = {}) {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(expectedRevision ?? "")) {
    throw new Error("EXPECTED_REVISION must be a complete lowercase Git revision.");
  }

  const appOrigin = normalizeOrigin(appUrl, "appUrl");
  const marketingOrigin = normalizeOrigin(marketingUrl, "marketingUrl");
  const healthUrl = new URL(`/api/health?release=${expectedRevision}`, appOrigin);

  const health = await retry(async () => {
    const response = await fetchImpl(healthUrl, {
      headers: { Accept: "application/json" },
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Public health endpoint returned HTTP ${response.status}.`);
    if (!response.headers.get("cache-control")?.toLowerCase().includes("no-store")) {
      throw new Error("Public health endpoint is missing Cache-Control: no-store.");
    }

    const body = await response.json();
    const keys = Object.keys(body).sort();
    if (keys.join(",") !== "analysis_version,revision,status") {
      throw new Error("Public health endpoint returned fields outside its release-safe contract.");
    }
    if (body.status !== "ok") throw new Error("Public health endpoint is not healthy.");
    if (body.revision !== expectedRevision) {
      throw new Error(`Public health endpoint reports revision ${body.revision ?? "missing"}.`);
    }
    if (body.analysis_version !== EXPECTED_ANALYSIS_VERSION) {
      throw new Error(`Public health endpoint reports analyzer ${body.analysis_version ?? "missing"}.`);
    }
    return body;
  }, { attempts, delayMs });

  await Promise.all([
    verifyPage(fetchImpl, new URL("/auth/sign-in", appOrigin), "application sign-in"),
    verifyPage(fetchImpl, new URL("/", marketingOrigin), "marketing site"),
  ]);

  return health;
}

async function verifyPage(fetchImpl, url, label) {
  const response = await fetchImpl(url, { redirect: "error" });
  if (!response.ok) throw new Error(`Public ${label} returned HTTP ${response.status}.`);
  if (response.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff") {
    throw new Error(`Public ${label} is missing X-Content-Type-Options: nosniff.`);
  }
}

async function retry(operation, { attempts, delayMs }) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function normalizeOrigin(value, label) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${label} must be an HTTP(S) origin without credentials, path, query, or fragment.`);
  }
  return url;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPublicDeployment({ expectedRevision: process.env.EXPECTED_REVISION })
    .then((health) => {
      console.log(`Public deployment verified: ${health.revision} (${health.analysis_version})`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
