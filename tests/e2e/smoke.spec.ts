import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/app");
});

test("paste analysis renders a structured result and disclaimer", async ({ page }) => {
  await page.getByLabel("Subject").fill("Urgent account verification");
  await page.getByLabel("Sender email").fill("security@microsoft-login-alert.example");
  await page
    .getByLabel("Email content")
    .fill("Verify your password immediately at https://microsoft-login-alert.example/verify");
  await page.getByRole("button", { name: "Analyze email" }).click();

  await expect(page.getByText("Risk score")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Suspicious signals", exact: true })).toBeVisible();
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", /\d+/);
  await expect(
    page.getByText("This is an automated risk assessment and should not be considered a guarantee."),
  ).toBeVisible();
});

test("language switching updates the scanner", async ({ page }) => {
  await page.getByTitle("Nederlands").click();

  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page).toHaveURL(/\/nl\/app$/);
  await expect(page.getByRole("heading", { name: "Controleer een verdachte e-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "E-mail analyseren" })).toBeVisible();
  await page.getByRole("button", { name: "Voorbeeld" }).click();
  await page.getByRole("button", { name: "E-mail analyseren" }).click();
  await expect(page.getByRole("heading", { name: "Verdachte signalen", exact: true })).toBeVisible();
  await expect(page.getByText(/Klik niet, antwoord niet|Controleer de afzender|Er zijn weinig waarschuwingstekens/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Help de detectie verbeteren" })).toBeVisible();

  await page.getByTitle("English").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Check a suspicious email" })).toBeVisible();

  await page.goto("/pricing");
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "The safety workflow stays free." })).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const localeCookies = (await page.context().cookies()).filter(
    ({ name }) => name === "maillume-locale-v2",
  );
  expect(localeCookies).toHaveLength(1);
  expect(localeCookies[0].value).toBe("en");
  await page.goto("/privacy");
  const privacyLink = page.getByRole("link", { name: "Privacy", exact: true });
  await expect(privacyLink).toBeVisible();
  await privacyLink.scrollIntoViewIfNeeded();
  const footer = privacyLink.locator("xpath=ancestor::footer");
  const footerBox = await footer.boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(footerBox).not.toBeNull();
  expect(footerBox!.y).toBeLessThan(viewportHeight);
  expect(footerBox!.y + footerBox!.height).toBeGreaterThanOrEqual(viewportHeight - 1);
});

test("Dutch routes render server-side and persist across navigation", async ({ page }) => {
  await page.goto("/nl/platform");
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByRole("link", { name: "Prijzen" }).first()).toHaveAttribute("href", "/nl/pricing");

  await page.goto("/pricing");
  await expect(page).toHaveURL(/\/nl\/pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");

  const apiResponse = await page.request.get("/api/health");
  expect(apiResponse.ok()).toBe(true);
  expect(apiResponse.url()).toContain("/api/health");
  expect(await apiResponse.json()).toEqual({
    status: "ok",
    revision: "development",
    analysis_version: "analysis-v4",
  });
});

test("Dutch input controls stay inside their buttons on mobile", async ({ page }) => {
  await page.goto("/nl/app");
  await page.setViewportSize({ width: 320, height: 800 });

  const modeGroup = page.getByRole("group", { name: "Invoermethode" });
  const emlMode = modeGroup.getByRole("button", { name: ".eml-bestand" });
  await expect(emlMode).toBeVisible();
  expect(await emlMode.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);

  await emlMode.click();
  const uploadButton = page.locator("label").filter({ hasText: ".eml-bestand kiezen" });
  await expect(uploadButton).toBeVisible();
  expect(await uploadButton.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
});

test("marketing language redirects use the configured public origin", async ({ page, request }) => {
  const response = await request.get("/language/en?next=%2Fnl", {
    headers: { Host: "0.0.0.0:3000" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe("http://127.0.0.1:3100/");

  await page.goto("/nl");
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("Dutch marketing preview and app navigation are visibly localized", async ({ page }) => {
  await page.goto("/nl");
  const preview = page.getByTestId("scanner-preview");
  for (const text of [
    "E-mailanalyse",
    "Controleer een verdachte e-mail",
    "Onderwerp",
    "Afzender",
    "E-mailinhoud",
    "E-mail analyseren",
    "Risicoscore",
    "Hoog",
    "Creëert urgentie rond een probleem met je account.",
    "De linkbestemming past niet bij de beweerde afzender.",
    "Controleer dit via een bekend contactkanaal voordat je handelt.",
    "Geautomatiseerde risicobeoordeling. Dit resultaat is geen garantie.",
  ]) {
    await expect(preview.getByText(text, { exact: true })).toBeVisible();
  }
  for (const text of [
    "Email analysis",
    "Subject",
    "Sender",
    "Email content",
    "Analyze email",
    "Risk score",
    "High",
    "Creates urgency around an account problem.",
    "Link destination does not match the claimed sender.",
  ]) {
    await expect(preview.getByText(text, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByText("Verwerkt bestanden en haalt leesbare tekst op.", { exact: true })).toBeVisible();
  await expect(page.getByText("Weegt risicosignalen en geeft een uitlegbare beoordeling terug.", { exact: true })).toBeVisible();
  await expect(page.getByText("E-mailinhoud en resultaten worden niet in de applicatieopslag bewaard.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ontdek self-hosting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lees de incidentnotities" })).toBeVisible();
  await expect(page.getByText("Parses files and extracts readable text.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Checks risk patterns and returns structured JSON.", { exact: true })).toHaveCount(0);

  await page.goto("/nl/pricing");
  await expect(page.getByText("Beschikbaar in de publieke bèta", { exact: true })).toBeVisible();

  await page.goto("/nl/app");
  await expect(page.getByLabel("Maillume website")).toHaveAttribute("href", "http://127.0.0.1:3100/nl");
  const menu = page.locator('summary[aria-label="Meer opties"]');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "Inloggen", exact: true })).toHaveCount(0);
  await expect(menu).toBeVisible();

  for (const width of [640, 768, 900, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.getByRole("link", { name: "Inloggen", exact: true })).toHaveCount(0);
    await expect(menu).toBeVisible();
    expect((await page.locator("header").boundingBox())!.height).toBe(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }

  await menu.click();
  await expect(page.getByRole("link", { name: "Website", exact: true })).toBeVisible();
  await expect(page.locator("details").getByRole("link", { name: "Broncode", exact: true })).toBeVisible();
});

test("scanner shows its character and byte budget before submission", async ({ page }) => {
  let analysisRequests = 0;
  await page.route("**/api/analyze", async (route) => {
    analysisRequests += 1;
    await route.abort();
  });

  await page.getByLabel("Email content").fill("x".repeat(20_001));

  await expect(page.getByText("20,001 / 20,000 characters")).toBeVisible();
  await expect(page.getByText("Shorten the email content to 20,000 characters or less.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze email" })).toBeDisabled();
  expect(analysisRequests).toBe(0);
});

test("scanner explains a non-JSON upstream 413 response", async ({ page }) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({ body: "Content Too Large", contentType: "text/plain", status: 413 });
  });

  await page.getByLabel("Email content").fill("Synthetic message body");
  await page.getByRole("button", { name: "Analyze email" }).click();
  await expect(page.locator("form [role='alert']")).toContainText(
    "This message is too large to analyze safely.",
  );
});

test("initial scanner workspace stays visible and contained on common desktop viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/app");
    const box = await page.getByTestId("scanner-workspace").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(64);
    expect(box!.y).toBeLessThan(viewport.height);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  }
});

test("keyboard users can skip directly to the scanner", async ({ page }) => {
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to scanner" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#scanner")).toBeFocused();
});

test("eml upload is parsed and can be analyzed", async ({ page }) => {
  await page.getByRole("button", { name: ".eml file" }).click();
  await page.locator('input[type="file"][accept=".eml,message/rfc822"]').setInputFiles(
    path.join(process.cwd(), "tests/fixtures/synthetic-phishing.eml"),
  );

  await expect(page.getByText("Email file parsed and ready to analyze.")).toBeVisible();
  await expect(page.getByLabel("Email content")).toHaveValue(/Verify your password immediately/);

  await page.getByRole("button", { name: "Analyze email" }).click();
  await expect(page.getByText("Risk score")).toBeVisible();
});

test("screenshot mode validates unsupported files before OCR", async ({ page }) => {
  await page.getByRole("button", { name: "Screenshot" }).click();

  await expect(page.getByText("Upload a screenshot of the suspicious email.")).toBeVisible();
  await page.locator('input[type="file"][accept^="image/png"]').setInputFiles({
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
    mimeType: "image/svg+xml",
    name: "unsupported.svg",
  });

  await expect(page.locator("form [role='alert']")).toContainText(
    "This file type is not supported.",
  );
});

test("screenshot OCR extracts labelled subject and sender without remote assets", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1_100, height: 500 });
  await page.setContent(`
    <main style="padding:48px;background:white;color:black;font:700 36px Arial,sans-serif;line-height:1.5">
      SUBJECT: URGENT ACCOUNT LOCKED<br>
      FROM: alerts@notice.example<br><br>
      VERIFY YOUR LOGIN NOW
    </main>
  `);
  const screenshot = await page.screenshot({ type: "png" });
  const externalOcrRequests: string[] = [];
  page.on("request", (request) => {
    if (/jsdelivr|projectnaptha|tessdata/i.test(request.url())) {
      externalOcrRequests.push(request.url());
    }
  });

  await page.goto("/app");
  await page.getByRole("button", { name: "Screenshot" }).click();
  await page.locator('input[type="file"][accept^="image/png"]').setInputFiles({
    buffer: screenshot,
    mimeType: "image/png",
    name: "synthetic-warning.png",
  });

  await expect(page.getByText("Extracted text is ready to analyze.")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByLabel("Subject")).toHaveValue(/URGENT ACCOUNT LOCKED/i);
  await expect(page.getByLabel("Sender email")).toHaveValue("alerts@notice.example");
  await expect(page.getByLabel("Email content")).toHaveValue(/VERIFY YOUR LOGIN NOW/i);
  await expect(page.getByLabel("Email content")).not.toHaveValue(/SUBJECT:|FROM:/i);
  expect(externalOcrRequests).toEqual([]);
});

test("risk meter color follows the evidence-derived level instead of fixed score bands", async ({ page }) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        result: {
          classification: "likely_spam",
          risk_level: "medium",
          risk_score: 67,
          score_factors: [
            { id: "synthetic-intent", family: "intent", contribution: 30, label: "Synthetic intent factor" },
            { id: "synthetic-identity", family: "identity", contribution: 20, label: "Synthetic identity factor" },
            { id: "synthetic-destination", family: "destination", contribution: 17, label: "Synthetic destination factor" },
          ],
          suspicious_signals: ["Synthetic test factor"],
          detected_links: [],
          recommended_action: "Review before acting.",
          short_explanation: "Synthetic medium-risk result.",
        },
        analysis_mode: "heuristic",
        analysis_provider: "heuristic",
        analysis_version: "analysis-v4",
        disclaimer: "Automated assessment.",
        privacy: { stored: false, retention: "not_stored", message: "Not stored." },
      },
      status: 200,
    });
  });

  await page.getByLabel("Email content").fill("Synthetic message body");
  await page.getByRole("button", { name: "Analyze email" }).click();

  const meter = page.getByRole("meter");
  await expect(meter).toHaveAttribute("data-risk-level", "medium");
  await expect(meter.getByTestId("risk-score-fill")).toHaveClass(/bg-\[#c38122\]/);
  await expect(meter.getByText("Medium", { exact: true }).last()).toHaveClass(/text-\[#714812\]/);
});

test("rate-limited analysis shows a clear localized error", async ({ page }) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { error: "AI analysis is temporarily rate-limited." },
      status: 429,
    });
  });

  await page.getByLabel("Email content").fill("Synthetic message body");
  await page.getByRole("button", { name: "Analyze email" }).click();

  await expect(page.locator("form [role='alert']")).toContainText(
    "Too many analyses were requested. Please wait and try again.",
  );
});

test("launch metadata and generated assets are available", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Maillume");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /shine a light on suspicious email/i,
  );

  const [iconResponse, openGraphResponse, manifestResponse, robotsResponse, sitemapResponse] = await Promise.all([
    request.get("/icon"),
    request.get("/opengraph-image"),
    request.get("/manifest.webmanifest"),
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
  ]);

  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toContain("image/png");
  expect(openGraphResponse.ok()).toBe(true);
  expect(openGraphResponse.headers()["content-type"]).toContain("image/png");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");
  expect(robotsResponse.ok()).toBe(true);
  expect(await robotsResponse.text()).toContain("Disallow: /app");
  expect(sitemapResponse.ok()).toBe(true);
  expect(await sitemapResponse.text()).toContain("/self-hosted");

  const sourceLinks = page.getByRole("link", { name: "Source", exact: true });
  await expect(sourceLinks.first()).toHaveAttribute(
    "href",
    "https://github.com/MatthiasBusscher/Maillume",
  );
  await expect(page.getByRole("link", { name: "License" })).toHaveAttribute(
    "href",
    "https://github.com/MatthiasBusscher/Maillume/blob/main/LICENSE",
  );
  await expect(page.getByRole("link", { name: "AGPL-3.0" })).toBeVisible();
});

test("optional feedback sends labels without scan content", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Use sample" }).click();
  await page.getByRole("button", { name: "Analyze email" }).click();

  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Legitimate", exact: true }).click();
  await page.getByRole("button", { name: "Safe email marked risky" }).click();
  await page.getByRole("checkbox", { name: "Urgency or pressure" }).check();

  const requestPromise = page.waitForRequest((request) => request.url().endsWith("/api/feedback"));
  await page.getByRole("button", { name: "Send feedback" }).click();
  const feedbackRequest = await requestPromise;
  const payload = feedbackRequest.postDataJSON() as Record<string, unknown>;

  expect(payload).toEqual({
    helpful: false,
    expectedClassification: "legitimate",
    feedbackKind: "false_positive",
    locale: "en",
    source: "paste",
    analyzerVersion: "analysis-v4",
    scoreBand: "high",
    signalCategories: ["urgency"],
  });

  for (const forbiddenField of ["body", "subject", "senderEmail", "links", "file"]) {
    expect(payload).not.toHaveProperty(forbiddenField);
  }

  await expect(page.getByText("Feedback received")).toBeVisible();
});

test("feedback controls work from the keyboard and reject content fields", async ({ page, request }) => {
  const rejected = await request.post("/api/feedback", {
    data: {
      helpful: false,
      expectedClassification: "legitimate",
      feedbackKind: "false_positive",
      locale: "en",
      source: "paste",
      analyzerVersion: "analysis-v4",
      scoreBand: "high",
      signalCategories: [],
      body: "must never be accepted",
    },
  });

  expect(rejected.status()).toBe(400);

  await page.goto("/app");
  await page.getByRole("button", { name: "Use sample" }).click();
  await page.getByRole("button", { name: "Analyze email" }).click();

  const notHelpful = page.getByRole("button", { name: "No", exact: true });
  await notHelpful.focus();
  await page.keyboard.press("Enter");

  const expectedSpam = page.getByRole("button", { name: "Spam", exact: true });
  await expectedSpam.focus();
  await page.keyboard.press("Space");

  const falseNegative = page.getByRole("button", { name: "Risky email marked safe" });
  await falseNegative.focus();
  await page.keyboard.press("Enter");

  const submit = page.getByRole("button", { name: "Send feedback" });
  await submit.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Feedback received")).toBeVisible();
});

test("marketing routes accurately distinguish available and manual-beta features", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Maillume", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check an email" }).first()).toHaveAttribute(
    "href",
    "/app",
  );
  await expect(page.getByText("No account required", { exact: false }).first()).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "The safety workflow stays free." })).toBeVisible();
  await expect(page.getByText("Available in public beta", { exact: true })).toBeVisible();
  await expect(page.getByText("Planned, not for sale")).toBeVisible();

  await page.goto("/self-hosted");
  await expect(page.getByRole("heading", { name: /Your infrastructure/ })).toBeVisible();

  await page.goto("/platform");
  await expect(page.getByRole("heading", { name: "The web scanner comes first." })).toBeVisible();
  await expect(page.getByText("Optional", { exact: true })).toBeVisible();
  await expect(page.getByText("Manual beta", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Later", { exact: true })).toBeVisible();
});

test("public beta hides accounts and rejects account APIs before request processing", async ({ page, request }) => {
  for (const path of ["/auth/sign-in", "/auth/forgot-password", "/auth/mfa", "/auth/update-password", "/account", "/nl/auth/sign-in", "/nl/auth/forgot-password", "/nl/account"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/(?:nl\/)?app$/);
  }

  await page.goto("/app");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Account" })).toHaveCount(0);

  for (const response of [
    await request.get("/account/api-keys"),
    await request.post("/account/delete", { data: "x".repeat(8_192), headers: { "Content-Type": "text/plain" } }),
    await request.post("/account/language", { data: "x".repeat(8_192), headers: { "Content-Type": "text/plain" } }),
    await request.post("/api/v1/analyze", { data: "x".repeat(8_192), headers: { "Content-Type": "text/plain" } }),
  ]) {
    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("trust pages are publicly accessible", async ({ page }) => {
  for (const [path, heading] of [
    ["/privacy", "Privacy notice"],
    ["/terms", "Public-beta terms"],
    ["/security", "Security"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
  await page.goto("/privacy");
  await expect(page.getByRole("link", { name: "privacy@maillume.io" })).toHaveAttribute("href", "mailto:privacy@maillume.io");
  await expect(page.getByText("Example B.V.")).toBeVisible();
  await page.goto("/security");
  await expect(page.getByRole("link", { name: "security@maillume.io" })).toHaveAttribute("href", "mailto:security@maillume.io");
  await page.goto("/terms");
  await expect(page.getByRole("link", { name: "support@maillume.io" })).toHaveAttribute("href", "mailto:support@maillume.io");
});

test("the app subdomain root resolves to the scanner workspace", async ({ request }) => {
  const response = await request.get("/", {
    headers: {
      Host: "app.maillume.io",
    },
  });

  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("Inspect a suspicious email");
});

test("an OAuth code returned to the app root is recovered by the callback route", async ({ request }) => {
  const response = await request.get("/?code=synthetic-code", {
    headers: { Host: "app.maillume.io" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  const callbackLocation = new URL(response.headers().location);
  expect(callbackLocation.pathname).toBe("/auth/callback");
  expect(callbackLocation.searchParams.get("code")).toBe("synthetic-code");
});

test("anonymous beta discards OAuth callback values and returns to the scanner", async ({ page, request }) => {
  const rawQuery = "error=access_denied&error_description=sensitive-provider-detail&state=synthetic-state";
  const rootResponse = await request.get(`/?${rawQuery}`, {
    headers: { Host: "app.maillume.io" },
    maxRedirects: 0,
  });

  expect(rootResponse.status()).toBe(307);
  const rootLocation = new URL(rootResponse.headers().location);
  expect(rootLocation.pathname).toBe("/app");
  expect(rootLocation.search).toBe("");

  const callbackResponse = await request.get(`/auth/callback?${rawQuery}`, {
    maxRedirects: 0,
  });
  expect(callbackResponse.status()).toBe(307);
  const callbackLocation = new URL(callbackResponse.headers().location);
  expect(callbackLocation.pathname).toBe("/app");
  expect(callbackLocation.search).toBe("");

  const callbackCodeResponse = await request.get("/auth/callback?code=synthetic-code", {
    maxRedirects: 0,
  });
  expect(callbackCodeResponse.status()).toBe(307);
  expect(new URL(callbackCodeResponse.headers().location, callbackCodeResponse.url()).pathname).toBe("/app");

  await page.goto("/auth/sign-in?error=oauth_provider_failed");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("sensitive-provider-detail")).toHaveCount(0);
});

test("account deletion rejects cross-origin requests", async ({ request }) => {
  const response = await request.post("/account/delete", {
    form: { confirm: "delete" },
    headers: { Origin: "https://attacker.example" },
  });

  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("sign-out rejects cross-origin requests", async ({ request }) => {
  const response = await request.post("/auth/sign-out", {
    form: { csrf: "invalid" },
    headers: { Origin: "https://attacker.example" },
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("password updates stay unavailable while accounts are disabled", async ({ request }) => {
  for (const path of ["/auth/update-password", "/nl/auth/update-password"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, response.url()).pathname).toMatch(/\/(?:nl\/)?app$/);
  }
});

test("account mutations remain unavailable regardless of origin or body size", async ({ request }) => {
  const missingDeletionOrigin = await request.post("/account/delete", {
    form: { confirm: "delete" },
  });
  expect(missingDeletionOrigin.status()).toBe(404);

  const missingApiKeyOrigin = await request.post("/account/api-keys", {
    data: { lifetimeDays: 30, name: "Browser" },
  });
  expect(missingApiKeyOrigin.status()).toBe(404);

  const oversizedDeletion = await request.post("/account/delete", {
    data: `confirm=delete&padding=${"x".repeat(1_024)}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "http://127.0.0.1:3100",
    },
  });
  expect(oversizedDeletion.status()).toBe(404);

  const oversizedApiKeyMutation = await request.post("/account/api-keys", {
    data: JSON.stringify({ lifetimeDays: 30, name: "x".repeat(4_096) }),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://127.0.0.1:3100",
    },
  });
  expect(oversizedApiKeyMutation.status()).toBe(404);
});

test("health endpoint exposes no dependency or secret details", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({
    status: "ok",
    revision: "development",
    analysis_version: "analysis-v4",
  });
});

test("analysis rejects oversized request bodies before processing", async ({ request }) => {
  const response = await request.post("/api/analyze", {
    data: { source: "paste", body: "x".repeat(40_000) },
  });

  expect(response.status()).toBe(413);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("canonical domain redirects preserve path and query", async ({ request }) => {
  for (const host of ["maillume.nl", "www.maillume.nl", "www.maillume.io"]) {
    const response = await request.get("/privacy?source=redirect-test", {
      headers: { Host: host },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(
      host.endsWith(".nl") || host === "maillume.nl"
        ? "https://maillume.io/nl/privacy?source=redirect-test"
        : "https://maillume.io/privacy?source=redirect-test",
    );
  }
});

test("marketing account routes redirect to the canonical app host", async ({ request }) => {
  for (const path of [
    "/account?source=redirect-test",
    "/nl/account?source=redirect-test",
    "/auth/sign-in?source=redirect-test",
    "/nl/auth/sign-in?source=redirect-test",
  ]) {
    const response = await request.get(path, {
      headers: { Host: "maillume.io" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`https://app.maillume.io${path}`);
  }
});

test("internal locale parameters cannot point canonical metadata at another route", async ({ page }) => {
  await page.goto("/app?__maillume_locale=nl&__maillume_path=/nl/pricing");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/nl/app",
  );
  await expect(page.locator('link[rel="canonical"]')).not.toHaveAttribute(
    "href",
    /pricing/,
  );
});

test("the sourced Odido incident resource states Maillume's limits", async ({ page }) => {
  await page.goto("/resources/odido-phishing-incident");

  await expect(page.getByRole("heading", { name: /first step, not the whole attack/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /original NOS report/ })).toHaveAttribute(
    "href",
    "https://nos.nl/artikel/2602283-odido-hackers-kwamen-binnen-via-phishing-deden-zich-voor-als-ict-afdeling",
  );
  await expect(page.getByText(/cannot verify a caller's identity/)).toBeVisible();
});

test("primary pages fit mobile and desktop viewports without horizontal overflow", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1570, height: 1599 },
  ]) {
    await page.setViewportSize(viewport);

    for (const path of [
      "/",
      "/app",
      "/platform",
      "/pricing",
      "/auth/sign-in",
      "/resources/odido-phishing-incident",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

      if (path === "/") {
        for (const testId of ["scanner-preview", "scanner-preview-result"]) {
          const box = await page.getByTestId(testId).boundingBox();
          expect(box).not.toBeNull();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
        }
      }
    }
  }
});

test("hosted API stays unavailable during the anonymous public beta", async ({ request }) => {
  const response = await request.post("/api/v1/analyze", {
    data: { source: "paste", body: "Synthetic message" },
  });

  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("security headers include the production CSP", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"];

  expect(csp).toContain("default-src 'self'");
  expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=_-]+'/);
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("worker-src 'self' blob:");
  expect(csp).toContain("connect-src 'self'");
  expect(response.headers()["strict-transport-security"]).toBe(
    "max-age=63072000; includeSubDomains; preload",
  );
});

test("hosted API publishes its machine-readable contract", async ({ request }) => {
  const response = await request.get("/openapi.json");
  expect(response.ok()).toBe(true);
  const specification = await response.json();
  expect(specification.openapi).toBe("3.1.0");
  expect(specification.paths["/api/v1/analyze"].post.security).toEqual([{ apiKey: [] }]);
  expect(specification.components.schemas.AnalysisResult.required).toEqual(expect.arrayContaining(["classification", "score_factors"]));
  expect(specification.components.schemas.AnalyzeResponse.properties.analysis_version.const).toBe("analysis-v4");
});

test("primary public pages have no serious accessibility violations", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/app", "/nl/app", "/privacy", "/auth/sign-in"]) {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations
        .filter(({ impact }) => impact === "critical" || impact === "serious")
        .map(({ id, impact, nodes }) => ({
          id,
          impact,
          targets: nodes.map((node) => node.target.join(" ")),
        }));
      expect(blocking, `${route} at ${viewport.width}px`).toEqual([]);
    }
  }
});
