import assert from "node:assert/strict";

import {
  DEFAULT_SITE_LOCALE,
  getSiteLocaleCookieDomain,
  getVerifiedInternalPathname,
  SITE_LOCALE_COOKIE,
} from "./site-locale";

assert.equal(DEFAULT_SITE_LOCALE, "en");
assert.equal(
  SITE_LOCALE_COOKIE,
  "maillume-locale-v2",
  "the v2 cookie must ignore conflicting host-only cookies from earlier releases",
);
assert.equal(getSiteLocaleCookieDomain("maillume.io"), ".maillume.io");
assert.equal(getSiteLocaleCookieDomain("app.maillume.io"), ".maillume.io");
assert.equal(getSiteLocaleCookieDomain("APP.MAILLUME.IO."), ".maillume.io");
assert.equal(getSiteLocaleCookieDomain("notmaillume.io"), undefined);
assert.equal(getSiteLocaleCookieDomain("localhost"), undefined);
assert.equal(getSiteLocaleCookieDomain("127.0.0.1"), undefined);

assert.equal(getVerifiedInternalPathname("/app", "/nl/app", "nl"), "/nl/app");
assert.equal(getVerifiedInternalPathname("/", "/nl", "nl"), "/nl");
assert.equal(
  getVerifiedInternalPathname("/app", "/nl/pricing", "nl"),
  "/app",
  "an internal pathname cannot point metadata at another route",
);
assert.equal(
  getVerifiedInternalPathname("/app", "/app", "nl"),
  "/app",
  "an internal pathname must carry the requested locale",
);
assert.equal(getVerifiedInternalPathname("/app", "/nl/app?next=/pricing", "nl"), "/app");
assert.equal(getVerifiedInternalPathname("/app", "/nl\\app", "nl"), "/app");

console.log("Checked the default locale and shared production cookie scope.");
