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
  const authCallbackContent = readProjectFile("src/app/auth/callback/route.ts");
  const accountDeletionContent = readProjectFile("src/app/account/delete/route.ts");
  const scannerPageContent = readProjectFile("src/app/app/page.tsx");
  const feedbackMigration = readProjectFile(
    "supabase/migrations/20260710150000_create_detection_feedback.sql",
  );
  const licenseContent = readProjectFile("LICENSE");
  const packageMetadata = JSON.parse(readProjectFile("package.json")) as {
    license?: string;
  };
  const nextConfigContent = readProjectFile("next.config.ts");
  const dockerfileContent = readProjectFile("Dockerfile");
  const composeContent = readProjectFile("docker-compose.production.yml");
  const apiAccessMigration = readProjectFile(
    "supabase/migrations/20260711120000_create_api_access.sql",
  );
  const quotaRefundMigration = readProjectFile(
    "supabase/migrations/20260711180000_refund_api_quota.sql",
  );
  const hostedApiRoute = readProjectFile("src/app/api/v1/analyze/route.ts");
  const extensionManifest = readProjectFile("integrations/browser-extension/manifest.json");
  const extensionPanel = readProjectFile("integrations/browser-extension/sidepanel.js");
  const gmailManifest = readProjectFile("integrations/gmail-addon/appsscript.json");
  const gmailCode = readProjectFile("integrations/gmail-addon/Code.gs");
  const outlookManifest = readProjectFile("public/outlook-manifest.xml");
  const outlookComponent = readProjectFile("src/components/outlook-integration.tsx");

  assert.match(routeContent, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(routeContent, /console\./);
  assert.doesNotMatch(routeContent, /node:fs|writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(routeContent, /supabase|feedback\/storage/);
  assert.match(feedbackRouteContent, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(feedbackRouteContent, /console\./);
  assert.match(feedbackMigration, /enable row level security/i);
  assert.match(feedbackMigration, /purge_expired_detection_feedback/);
  assert.match(authCallbackContent, /requestedNext\.startsWith\("\/"\)/);
  assert.match(authCallbackContent, /!requestedNext\.startsWith\("\/\/"\)/);
  assert.match(authCallbackContent, /private, no-cache, no-store/);
  assert.match(accountDeletionContent, /getUser\(\)/);
  assert.match(accountDeletionContent, /admin\.auth\.admin\.deleteUser/);
  assert.match(accountDeletionContent, /Cross-origin account deletion is not allowed/);
  assert.match(accountDeletionContent, /private, no-cache, no-store/);
  assert.ok(
    accountDeletionContent.indexOf("getUser()") <
      accountDeletionContent.indexOf("admin.auth.admin.deleteUser"),
    "account deletion must verify the signed-in user before using the admin API",
  );
  assert.doesNotMatch(scannerPageContent, /\bredirect\s*\(/);

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
  assert.match(nextConfigContent, /source: "\/integrations\/outlook"/);
  assert.match(nextConfigContent, /frame-ancestors https:\/\/\*\.office\.com/);
  assert.match(nextConfigContent, /Referrer-Policy/);
  assert.match(nextConfigContent, /Permissions-Policy/);
  assert.match(nextConfigContent, /output: "standalone"/);
  assert.match(dockerfileContent, /USER nextjs/);
  assert.match(dockerfileContent, /rm -rf \/usr\/local\/lib\/node_modules\/npm/);
  assert.doesNotMatch(composeContent, /^\s*ports:/m);
  assert.match(composeContent, /read_only: true/);
  assert.match(composeContent, /no-new-privileges:true/);
  assert.match(composeContent, /max-size: 10m/);
  assert.match(apiAccessMigration, /enable row level security/gi);
  assert.match(apiAccessMigration, /secret_hash char\(64\)/);
  assert.match(apiAccessMigration, /consume_api_quota/);
  assert.match(apiAccessMigration, /purge_expired_api_usage/);
  assert.match(quotaRefundMigration, /greatest\(0, request_count - 1\)/);
  assert.match(hostedApiRoute, /refund_api_quota/);
  assert.doesNotMatch(apiAccessMigration, /^\s*(body|subject|sender_email|message_text|links|result|ip_address)\s+/im);
  assert.doesNotMatch(hostedApiRoute, /console\.|writeFile|appendFile|createWriteStream/);
  assert.match(hostedApiRoute, /hashApiKey\(token\)/);
  assert.match(hostedApiRoute, /consume_api_quota/);
  assert.match(extensionManifest, /"activeTab"/);
  assert.doesNotMatch(extensionManifest, /"content_scripts"|"tabs"|mail\.google\.com|outlook\.office\.com/);
  assert.doesNotMatch(extensionPanel, /storage\.local\.set\([^)]*(?:body|result)[\s\S]*?\)/);
  assert.match(gmailManifest, /gmail\.addons\.current\.message\.readonly/);
  assert.doesNotMatch(gmailManifest, /auth\/gmail\.readonly|auth\/gmail\.modify|auth\/gmail\"/);
  assert.ok(
    gmailCode.indexOf("Analyze this message") < gmailCode.indexOf("message.getPlainBody()"),
    "Gmail UI must require an explicit analysis action before message reading",
  );
  assert.match(outlookManifest, /<Permissions>ReadItem<\/Permissions>/);
  assert.doesNotMatch(outlookManifest, /ReadWriteMailbox/);
  assert.doesNotMatch(outlookComponent, /localStorage\.setItem\([^)]*(?:body|result|subject|sender)[\s\S]*?\)/);
  assert.match(licenseContent, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(licenseContent, /13\. Remote Network Interaction/);
  assert.equal(packageMetadata.license, "AGPL-3.0-only");

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
