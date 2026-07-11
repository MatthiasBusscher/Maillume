import { expect, test } from "@playwright/test";
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
  await expect(page.getByText("Suspicious signals")).toBeVisible();
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
  await expect(page.getByText("Verdachte signalen")).toBeVisible();
  await expect(page.getByText(/Klik niet op links|Ga voorzichtig verder/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Help de detectie verbeteren" })).toBeVisible();

  await page.getByTitle("English").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Check a suspicious email" })).toBeVisible();
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
    "Too many AI analyses were requested. Please wait and try again.",
  );
});

test("launch metadata and generated assets are available", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Maillume");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /privacy-first risk assessment/i,
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
    "https://github.com/MatthiasBusscher/inbox-risk-scanner",
  );
  await expect(page.getByRole("link", { name: "License" })).toHaveAttribute(
    "href",
    "https://github.com/MatthiasBusscher/inbox-risk-scanner/blob/main/LICENSE",
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
    analyzerVersion: "analysis-v1",
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
      analyzerVersion: "analysis-v1",
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

test("marketing routes accurately distinguish available and source-beta features", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Maillume", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check an email" }).first()).toHaveAttribute(
    "href",
    "/app",
  );
  await expect(page.getByText("No account required", { exact: false }).first()).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "The safety workflow stays free." })).toBeVisible();
  await expect(page.getByText("Planned, not for sale")).toBeVisible();

  await page.goto("/self-hosted");
  await expect(page.getByRole("heading", { name: /Your infrastructure/ })).toBeVisible();

  await page.goto("/platform");
  await expect(page.getByText("Available today").first()).toBeVisible();
  await expect(page.getByText("Available", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Source beta", { exact: true }).first()).toBeVisible();
});

test("Google sign-in degrades safely when Supabase auth is not configured", async ({ page }) => {
  await page.goto("/auth/sign-in");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  await expect(page.getByText("The scanner still works without an account.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open scanner" })).toHaveAttribute("href", "/app");
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

test("account deletion rejects cross-origin requests", async ({ request }) => {
  const response = await request.post("/account/delete", {
    form: { confirm: "delete" },
    headers: { Origin: "https://attacker.example" },
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("health endpoint exposes no dependency or secret details", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
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

    for (const path of ["/", "/app", "/resources/odido-phishing-incident"]) {
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

test("hosted API requires a valid API key before reading scan content", async ({ request }) => {
  const response = await request.post("/api/v1/analyze", {
    data: { source: "paste", body: "Synthetic message" },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("hosted API publishes its machine-readable contract", async ({ request }) => {
  const response = await request.get("/openapi.json");
  expect(response.ok()).toBe(true);
  const specification = await response.json();
  expect(specification.openapi).toBe("3.1.0");
  expect(specification.paths["/api/v1/analyze"].post.security).toEqual([{ apiKey: [] }]);
});

test("Outlook task pane explains explicit current-message access", async ({ page }) => {
  await page.goto("/integrations/outlook");
  await expect(page.getByRole("heading", { name: "Maillume for Outlook" })).toBeVisible();
  await expect(page.getByText(/reads the open message only after/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze this message" })).toBeDisabled();
});
