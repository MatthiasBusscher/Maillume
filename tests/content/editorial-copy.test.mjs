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

test("GitHub Sponsors is available without cluttering the main navigation", () => {
  const funding = read(".github/FUNDING.yml");
  const site = read("src/lib/site.ts");
  const header = read("src/components/site-header.tsx");
  const footer = read("src/components/site-footer.tsx");
  const scanner = read("src/components/home-page.tsx");
  const dictionary = read("src/lib/i18n/dictionary.ts");

  assert.match(funding, /github:\s*\n\s*-\s*MatthiasBusscher/);
  assert.match(site, /https:\/\/github\.com\/sponsors\/MatthiasBusscher/);
  assert.match(footer, /GITHUB_SPONSORS_URL/);
  assert.match(footer, /Sponsor Maillume/);
  assert.match(footer, /Steun Maillume/);
  assert.match(scanner, /dictionary\.legal\.sponsor/);
  assert.match(dictionary, /sponsor: "Sponsor"/);
  assert.match(dictionary, /sponsor: "Steunen"/);
  assert.doesNotMatch(header, /GITHUB_SPONSORS_URL/);
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
  assert.match(privacy, /does not sell extension data, use it for advertising or credit decisions/);
  assert.match(privacy, /verkoopt extensiegegevens niet, gebruikt ze niet voor advertenties of kredietbeslissingen/);
  assert.match(privacy, /Maillume counts how many assessments are completed each day/);
  assert.match(privacy, /Maillume telt hoeveel beoordelingen er per dag worden afgerond/);
  assert.match(privacy, /cannot be traced back to a person or to a specific scan/);
  assert.match(privacy, /niet te herleiden is naar een persoon of naar een specifieke scan/);
  assert.match(privacy, /uses no third-party analytics, advertising, or tracking service/);
  assert.match(privacy, /geen analytics-, advertentie- of trackingdiensten van derden/);
  assert.match(accountEn, /password is sent directly to Supabase/);
  assert.match(accountNl, /wachtwoord wordt rechtstreeks naar Supabase gestuurd/);
  assert.match(accountEn, /Sign in or create an account/);
  assert.match(accountNl, /Log in of maak een account/);
  assert.match(read("src/components/email-auth-form.tsx"), /mode === "sign-in" \|\| mode === "forgot"/);
  assert.match(extension, /Review the captured details/);
  assert.match(extension, /Connect this browser/);
  assert.match(extension, /Advanced manual setup/);
  assert.match(extension, /Remember manual key on this device/);
  assert.match(extension, /Handmatige sleutel op dit apparaat onthouden/);
  assert.match(privacy, /server receives only a hash of the installation identifier/);
  assert.match(privacy, /server ontvangt alleen een hash van het installatiekenmerk/);
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

test("privacy notice covers retention, rights, transfers, and extension link capture in both languages", () => {
  const privacy = read("src/lib/i18n/trust-privacy.ts");
  const privacyPage = read("src/app/privacy/page.tsx");
  const extensionPrivacy = read("integrations/browser-extension/PRIVACY.md");

  for (const phrase of [
    "Purposes and legal bases",
    "Data categories and recipients",
    "Retention",
    "International transfers",
    "Autoriteit Persoonsgegevens",
    "Doeleinden en grondslagen",
    "Gegevenscategorieën en ontvangers",
    "Bewaartermijnen",
    "Internationale doorgiften",
  ]) {
    assert.match(privacy, new RegExp(phrase), phrase);
  }

  assert.match(privacy, /detected HTTP\(S\) link destinations/);
  assert.match(privacy, /gevonden HTTP\(S\)-linkbestemmingen/);
  assert.match(privacyPage, /autoriteitpersoonsgegevens\.nl/);
  assert.match(extensionPrivacy, /detected HTTP\(S\) link destinations/);
  assert.match(extensionPrivacy, /not separately rendered in the review fields/);
});
