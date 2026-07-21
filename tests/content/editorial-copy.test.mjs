import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("the homepage explains the Maillume name and promise", () => {
  const homepage = read("src/app/page.tsx");

  assert.match(homepage, /Shine a light on suspicious email/);
  assert.match(homepage, /Maillume blends mail and illuminate/);
  assert.match(homepage, /never guarantees that a message is safe or malicious/);
});

test("launch copy reflects optional accounts without advertising hosted AI", () => {
  const platform = read("src/app/platform/page.tsx");
  const pricing = read("src/app/pricing/page.tsx");

  assert.match(platform, /Accounts are optional/);
  assert.match(platform, /Maintainer-hosted AI remains unavailable/);
  assert.doesNotMatch(platform, /Accounts, API keys, Google sign-in.*unavailable/);
  assert.match(pricing, /Optional accounts and quota-limited API keys are available/);
  assert.match(pricing, /managed AI and paid plans are not for sale/);
});

test("Dutch terminology and account tone remain consistent", () => {
  const dictionary = read("src/lib/i18n/dictionary.ts");
  const account = read("src/lib/i18n/account-nl.ts");
  const terms = read("src/lib/i18n/trust-terms.ts");

  assert.match(dictionary, /Scanhistorie uitgeschakeld/);
  assert.match(dictionary, /geautomatiseerde risicobeoordeling/);
  assert.doesNotMatch(`${dictionary}\n${account}\n${terms}`, /risico-inschatting/);
  assert.doesNotMatch(`${dictionary}\n${account}\n${terms}`, /\b(?:U|Uw)\b/);
});

test("auth templates describe real product behavior", () => {
  const confirmation = read("supabase/templates/confirmation.html");
  const invite = read("supabase/templates/invite.html");
  const recovery = read("supabase/templates/recovery.html");

  assert.doesNotMatch(confirmation, /start scanning messages/);
  assert.doesNotMatch(invite, /before it reaches inboxes/);
  assert.doesNotMatch(recovery, /\{\{ \.Token \}\}/);
  assert.match(recovery, /Choose a new password/);
});

test("launch documentation no longer describes the active release as private", () => {
  const files = [
    "docs/authentication.md",
    "docs/evaluation.md",
    "docs/google-oauth-branding.md",
    "docs/hosted-service.md",
    "docs/integrations.md",
    "docs/launch-checklist.md",
    "docs/operations.md",
    "docs/public-beta-launch.md",
    "docs/roadmap.md",
  ];

  for (const file of files) {
    assert.doesNotMatch(read(file), /private[- ]beta/i, file);
  }
});

test("privacy copy names active authentication and operational providers", () => {
  const privacy = read("src/lib/i18n/trust-privacy.ts");

  for (const provider of ["Hostinger", "Cloudflare", "Supabase", "Resend", "Google Workspace", "GitHub", "UptimeRobot"]) {
    assert.match(privacy, new RegExp(provider), provider);
  }

  assert.match(privacy, /Email-and-password sign-in/);
  assert.match(privacy, /authenticator-app two-factor authentication/);
  assert.match(privacy, /Inloggen met e-mailadres en wachtwoord/);
  assert.match(privacy, /tweestapsverificatie met een authenticatie-app/);
});
