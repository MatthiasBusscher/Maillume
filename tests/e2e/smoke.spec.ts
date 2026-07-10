import { expect, test } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
  await expect(page.getByRole("heading", { name: "Controleer een verdachte e-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "E-mail analyseren" })).toBeVisible();

  await page.getByTitle("English").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Check a suspicious email" })).toBeVisible();
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
  await expect(page).toHaveTitle("Inbox Risk Scanner");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /privacy-first automated risk assessment/i,
  );

  const [iconResponse, openGraphResponse, manifestResponse] = await Promise.all([
    request.get("/icon"),
    request.get("/opengraph-image"),
    request.get("/manifest.webmanifest"),
  ]);

  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toContain("image/png");
  expect(openGraphResponse.ok()).toBe(true);
  expect(openGraphResponse.headers()["content-type"]).toContain("image/png");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");
});
