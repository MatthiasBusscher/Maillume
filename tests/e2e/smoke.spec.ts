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
  await expect(page.getByText("Controleert risicopatronen en geeft gestructureerde JSON terug.", { exact: true })).toBeVisible();
  await expect(page.getByText("Er wordt geen e-mailinhoud of resultaat in een scangeschiedenis opgeslagen.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ontdek self-hosting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lees de incidentnotities" })).toBeVisible();
  await expect(page.getByText("Parses files and extracts readable text.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Checks risk patterns and returns structured JSON.", { exact: true })).toHaveCount(0);

  await page.goto("/nl/pricing");
  await expect(page.getByText("Releasekandidaat", { exact: true })).toBeVisible();

  await page.goto("/nl/app");
  const signIn = page.getByRole("link", { name: "Inloggen", exact: true });
  const website = page.getByRole("link", { name: "Website", exact: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(signIn).toBeVisible();
  await expect(website).toBeHidden();
  expect((await signIn.boundingBox())!.width).toBeGreaterThanOrEqual(90);

  for (const width of [640, 768, 900, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(signIn).toBeVisible();
    await expect(website).toBeVisible();
    const signInBox = (await signIn.boundingBox())!;
    const websiteBox = (await website.boundingBox())!;
    expect(signInBox.height).toBe(websiteBox.height);
    expect(websiteBox.width).toBeLessThanOrEqual(signInBox.width * 1.25);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
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
    analyzerVersion: "analysis-v2.1",
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
      analyzerVersion: "analysis-v2.1",
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
  await expect(page.getByText("Release candidate", { exact: true })).toBeVisible();
  await expect(page.getByText("Planned, not for sale")).toBeVisible();

  await page.goto("/self-hosted");
  await expect(page.getByRole("heading", { name: /Your infrastructure/ })).toBeVisible();

  await page.goto("/platform");
  await expect(page.getByText("Implemented in source").first()).toBeVisible();
  await expect(page.getByText("Acceptance pending", { exact: true }).first()).toBeVisible();
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
  expect(specification.components.schemas.AnalysisResult.required).toEqual(expect.arrayContaining(["classification", "score_factors"]));
  expect(specification.components.schemas.AnalyzeResponse.properties.analysis_version.const).toBe("analysis-v2.1");
});

test("Outlook task pane explains explicit current-message access", async ({ page }) => {
  await page.goto("/integrations/outlook");
  await expect(page.getByRole("heading", { name: "Maillume for Outlook" })).toBeVisible();
  await expect(page.getByText(/reads the open message only after/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Analyze this message" })).toBeDisabled();
});

test("Outlook reads only after confirmation and can be embedded by Office", async ({ page, request }) => {
  const paneResponse = await request.get("/integrations/outlook");
  const dutchPaneResponse = await request.get("/nl/integrations/outlook");
  expect(paneResponse.headers()["x-frame-options"]).toBeUndefined();
  expect(paneResponse.headers()["content-security-policy"]).toContain("https://*.office.com");
  expect(dutchPaneResponse.headers()["x-frame-options"]).toBeUndefined();
  expect(dutchPaneResponse.headers()["content-security-policy"]).toContain("https://*.office.com");

  await page.route("https://appsforoffice.microsoft.com/**", async (route) => {
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });

  await page.addInitScript(() => {
    const state = window as typeof window & { __outlookReads: number; Office: unknown };
    state.__outlookReads = 0;
    window.sessionStorage.setItem("maillume-outlook-api-key", `mlm_${"a".repeat(43)}`);
    state.Office = {
      AsyncResultStatus: { Succeeded: "succeeded" },
      CoercionType: { Text: "text" },
      onReady: (callback: (info: { host: string }) => void) => callback({ host: "Outlook" }),
      context: { mailbox: { item: {
        subject: "Synthetic Outlook message",
        from: { emailAddress: "sender@example.com" },
        body: { getAsync: (_type: string, callback: (result: { status: string; value?: string; error?: { message?: string } }) => void) => {
          state.__outlookReads += 1;
          callback({ status: "succeeded", value: "Synthetic message body" });
        } },
      } } },
    };
  });
  let submitted: Record<string, unknown> | undefined;
  let analysisRequests = 0;
  await page.route("**/api/v1/analyze", async (route) => {
    analysisRequests += 1;
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    if (analysisRequests === 1) {
      await route.fulfill({ contentType: "application/json", json: { result: { risk_score: 10 } } });
      return;
    }
    await route.fulfill({ contentType: "application/json", json: { result: {
      classification: "likely_phishing", risk_level: "high", risk_score: 82,
      score_factors: [
        { id: "synthetic-destination", family: "destination", contribution: 30, label: "Synthetic destination warning" },
        { id: "synthetic-intent", family: "intent", contribution: 30, label: "Synthetic intent warning" },
        { id: "synthetic-identity", family: "identity", contribution: 22, label: "Synthetic identity warning" },
      ],
      suspicious_signals: ["Synthetic warning"], detected_links: [],
      recommended_action: "Verify through a known channel.", short_explanation: "Suspicious pattern detected.",
    } } });
  });
  await page.goto("/nl/integrations/outlook");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __outlookReads: number }).__outlookReads)).toBe(0);
  const analyze = page.getByRole("button", { name: "Dit bericht analyseren" });
  await expect(analyze).toBeEnabled();
  await analyze.click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __outlookReads: number }).__outlookReads)).toBe(1);
  await expect(page.getByRole("status")).toHaveText("Maillume gaf een ongeldig analyseresultaat terug.");
  await analyze.click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __outlookReads: number }).__outlookReads)).toBe(2);
  await expect(page.getByText("Hoog", { exact: true })).toBeVisible();
  expect(submitted).toMatchObject({ body: "Synthetic message body", locale: "nl", subject: "Synthetic Outlook message" });
  await page.getByText("API-sleutel", { exact: true }).click();
  await page.getByRole("button", { name: "Sleutel verwijderen" }).click();
  await expect(analyze).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("maillume-outlook-api-key"))).toBeNull();
});
