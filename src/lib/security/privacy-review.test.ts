import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const SOURCE_ROOT = join(PROJECT_ROOT, "src");
const SERVER_SECRET_NAMES = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AI_API_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
];

function main() {
  const sourceFiles = listSourceFiles(SOURCE_ROOT);
  const productionFiles = sourceFiles.filter((file) => !file.endsWith(".test.ts"));

  for (const file of productionFiles) {
    const content = readFileSync(file, "utf8");
    const label = relative(PROJECT_ROOT, file);

    assert.doesNotMatch(
      content,
      /\bconsole\.(debug|error|info|log|warn)\s*\(/,
      `${label} should not log scan content or prompts`,
    );
  }

  for (const file of productionFiles.filter(isClientComponent)) {
    const content = readFileSync(file, "utf8");
    const label = relative(PROJECT_ROOT, file);

    assert.doesNotMatch(content, /process\.env/, `${label} should not read server env vars`);

    for (const secretName of SERVER_SECRET_NAMES) {
      assert.equal(
        content.includes(secretName),
        false,
        `${label} should not reference server secret ${secretName}`,
      );
    }
  }

  const routeContent = readProjectFile("src/app/api/analyze/route.ts");
  const feedbackRouteContent = readProjectFile("src/app/api/feedback/route.ts");
  const feedbackMigration = readProjectFile(
    "supabase/migrations/20260710150000_create_detection_feedback.sql",
  );
  const nextConfigContent = readProjectFile("next.config.ts");

  assert.match(routeContent, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(routeContent, /console\./);
  assert.match(feedbackRouteContent, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(feedbackRouteContent, /console\./);
  assert.match(feedbackMigration, /enable row level security/i);
  assert.match(feedbackMigration, /purge_expired_detection_feedback/);

  for (const forbiddenColumn of [
    "body",
    "subject",
    "sender_email",
    "message_text",
    "links",
    "attachments",
    "free_text",
    "ip_address",
  ]) {
    assert.doesNotMatch(
      feedbackMigration,
      new RegExp(`^\\s*${forbiddenColumn}\\s+`, "im"),
      `feedback storage must not define ${forbiddenColumn}`,
    );
  }
  assert.match(nextConfigContent, /X-Content-Type-Options/);
  assert.match(nextConfigContent, /X-Frame-Options/);
  assert.match(nextConfigContent, /Referrer-Policy/);
  assert.match(nextConfigContent, /Permissions-Policy/);

  const analyzeResponseType = getAnalyzeResponseType();

  for (const rawInputField of ["body", "subject", "senderEmail"]) {
    assert.equal(
      analyzeResponseType.includes(rawInputField),
      false,
      `AnalyzeResponse should not include raw input field ${rawInputField}`,
    );
  }

  console.log("Checked privacy and secret-exposure guardrails.");
}

main();

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx)$/.test(fullPath)) {
      return [];
    }

    return [fullPath];
  });
}

function isClientComponent(file: string): boolean {
  return readFileSync(file, "utf8").startsWith('"use client";');
}

function readProjectFile(path: string): string {
  return readFileSync(join(PROJECT_ROOT, path), "utf8");
}

function getAnalyzeResponseType(): string {
  const typesContent = readProjectFile("src/lib/types.ts");
  const start = typesContent.indexOf("export type AnalyzeResponse");
  const end = typesContent.indexOf("export type AnalyzeErrorResponse");

  assert.notEqual(start, -1, "AnalyzeResponse type should exist");
  assert.notEqual(end, -1, "AnalyzeErrorResponse type should exist");

  return typesContent.slice(start, end);
}
