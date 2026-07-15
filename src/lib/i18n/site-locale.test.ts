import assert from "node:assert/strict";

import {
  DEFAULT_SITE_LOCALE,
  getSiteLocaleCookieDomain,
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

console.log("Checked the default locale and shared production cookie scope.");
