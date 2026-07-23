import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("the homepage leads with the Maillume promise without explaining the name", () => {
  const homepage = read("src/app/page.tsx");
  const translations = read("src/lib/i18n/marketing-pages.ts");

  assert.match(homepage, /Shine a light on suspicious email/);
  assert.match(homepage, /See the risk before you act\./);
  assert.match(translations, /Zie het risico voordat je handelt\./);
  assert.doesNotMatch(`${homepage}\n${translations}`, /Maillume (?:blends|combines) mail (?:and|with) illuminate/i);
  assert.doesNotMatch(translations, /De naam Maillume verwijst naar mail en illuminate/i);
  assert.match(homepage, /never guarantees that a message is safe or malicious/);
});

test("launch copy reflects optional accounts without advertising hosted AI", () => {
  const platform = read("src/app/platform/page.tsx");
  const pricing = read("src/app/pricing/page.tsx");
  const translations = read("src/lib/i18n/marketing-pages.ts");

  assert.match(platform, /Accounts are optional/);
  assert.match(platform, /Maintainer-hosted AI remains unavailable/);
  assert.doesNotMatch(platform, /Accounts, API keys, Google sign-in.*unavailable/);
  assert.match(pricing, /Optional accounts and quota-limited API keys are available/);
  assert.match(pricing, /managed AI and paid plans are not for sale/);
  assert.doesNotMatch(translations, /Accounts, API keys, Google sign-in.*unavailable/);
  assert.doesNotMatch(translations, /Authentication, API keys, quotas.*remain disabled/);
  assert.doesNotMatch(translations, /Account, API, and managed AI features remain disabled/);
});

test("Chrome extension instructions cover both languages and the Store release boundary", () => {
  const instructions = read("src/app/chrome-extension/page.tsx");
  const platform = read("src/app/platform/page.tsx");
  const header = read("src/components/site-header.tsx");
  const site = read("src/lib/site.ts");

  assert.match(site, /bjiiailjalkfjimkjdikoockjlnjolle/);
  assert.match(instructions, /Available in the Chrome Web Store/);
  assert.match(instructions, /Beschikbaar in de Chrome Web Store/);
  assert.match(instructions, /Add to Chrome/);
  assert.match(instructions, /Toevoegen aan Chrome/);
  assert.doesNotMatch(instructions, /manual beta|handmatige bèta|chrome:\/\/extensions|Load unpacked|Uitgepakte extensie/i);
  assert.match(instructions, /No background scanning/);
  assert.match(instructions, /Geen scans op de achtergrond/);
  assert.match(instructions, /Connection not configured/);
  assert.match(instructions, /Verbinding niet ingesteld/);
  assert.match(header, /\["\/chrome-extension", "Chrome extension"\]/);
  assert.match(header, /\["\/chrome-extension", "Chrome-extensie"\]/);
  assert.match(platform, /Installation guide/);
  assert.match(platform, /Chrome Web Store/);
  assert.doesNotMatch(platform, /Manual beta|review follows later|not yet available/i);
});

test("API-key controls make one-time copy and lost-key replacement visible", () => {
  const manager = read("src/components/api-key-manager.tsx");
  const english = read("src/lib/i18n/account-en.ts");
  const dutch = read("src/lib/i18n/account-nl.ts");

  assert.match(manager, /copyFeedback === "copied"/);
  assert.match(manager, /labels\.copiedButton/);
  assert.match(manager, /labels\.replaceLostKey/);
  assert.match(english, /Copied/);
  assert.match(english, /Replace lost key/);
  assert.match(dutch, /Gekopieerd/);
  assert.match(dutch, /Verloren sleutel vervangen/);
});

test("Dutch terminology and account tone remain consistent", () => {
  const dictionary = read("src/lib/i18n/dictionary.ts");
  const account = read("src/lib/i18n/account-nl.ts");
  const terms = read("src/lib/i18n/trust-terms.ts");

  assert.match(dictionary, /Scanhistorie uitgeschakeld/);
  assert.match(dictionary, /geautomatiseerde risicobeoordeling/);
  assert.doesNotMatch(`${dictionary}\n${account}\n${terms}`, /risico-inschatting/);
  assert.doesNotMatch(`${dictionary}\n${account}\n${terms}`, /\b(?:U|Uw)\b/);
  assert.match(dictionary, /Dit is een geautomatiseerde risicobeoordeling en geen garantie\./);
  assert.doesNotMatch(`${dictionary}\n${account}\n${terms}`, /biedt geen garantie/);
});

test("privacy and authentication copy describe the real data flow", () => {
  const privacy = read("src/lib/i18n/trust-privacy.ts");
  const accountEn = read("src/lib/i18n/account-en.ts");
  const accountNl = read("src/lib/i18n/account-nl.ts");
  const extension = read("integrations/browser-extension/sidepanel.html");

  assert.match(privacy, /Normalized scan text is sent to Maillume only for the requested assessment/);
  assert.match(privacy, /Genormaliseerde scantekst wordt alleen voor de gevraagde beoordeling naar Maillume verstuurd/);
  assert.match(accountEn, /password is sent directly to Supabase/);
  assert.match(accountNl, /wachtwoord wordt rechtstreeks naar Supabase gestuurd/);
  assert.match(accountEn, /Sign in or create an account/);
  assert.match(accountNl, /Log in of maak een account/);
  assert.match(read("src/components/email-auth-form.tsx"), /mode === "sign-in" \|\| mode === "forgot"/);
  assert.match(extension, /Review the captured details/);
  assert.match(extension, /Remember API key on this device/);
  assert.match(extension, /API-sleutel op dit apparaat onthouden/);
  assert.doesNotMatch(extension, /Review before sending|Controleer vóór verzending/);
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
