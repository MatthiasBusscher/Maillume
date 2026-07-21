import assert from "node:assert/strict";

import { getTrustedClientIdentifier } from "./client-identifier";

function main() {
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({ "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.10" }),
      { NODE_ENV: "production", TRUST_CF_CONNECTING_IP: "true" },
    ),
    "cf-connecting-ip:203.0.113.10",
  );
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({ "cf-connecting-ip": "203.0.113.10" }),
      { NODE_ENV: "production" },
    ),
    "anonymous",
    "production must ignore Cloudflare client headers unless the trusted proxy is configured",
  );
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({ "cf-connecting-ip": "198.51.100.99" }),
      { NODE_ENV: "production", TRUST_CF_CONNECTING_IP: "false" },
    ),
    "anonymous",
    "an explicit false value must not enable Cloudflare header trust",
  );
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({ "x-forwarded-for": "203.0.113.20" }),
      { NODE_ENV: "production", TRUSTED_PROXY_IP_HEADER: "x-forwarded-for" },
    ),
    "x-forwarded-for:203.0.113.20",
    "a restricted reverse proxy may explicitly opt into its overwritten client IP header",
  );
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({ "x-real-ip": "2001:db8::20" }),
      { NODE_ENV: "production", TRUSTED_PROXY_IP_HEADER: "x-real-ip" },
    ),
    "x-real-ip:2001:db8::20",
  );
  for (const malformed of ["not-an-ip", "999.999.999.999", ".", "203.0.113.10, 198.51.100.10"]) {
    assert.equal(
      getTrustedClientIdentifier(new Headers({ "cf-connecting-ip": malformed }), {
        NODE_ENV: "production",
        TRUST_CF_CONNECTING_IP: "true",
      }),
      "anonymous",
      `malformed or multi-value client IP must fail closed: ${malformed}`,
    );
  }
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({
        "cf-connecting-ip": "203.0.113.30",
        "x-forwarded-for": "198.51.100.30",
      }),
      {
        NODE_ENV: "production",
        TRUST_CF_CONNECTING_IP: "true",
        TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
      },
    ),
    "anonymous",
    "ambiguous trusted-proxy configuration must fail closed",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "x-forwarded-for": "203.0.113.11" }), { NODE_ENV: "production" }),
    "anonymous",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "x-real-ip": "203.0.113.12" }), { NODE_ENV: "production" }),
    "anonymous",
    "production must ignore X-Real-IP unless its proxy boundary is configured",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "x-forwarded-for": "203.0.113.40" }), {
      NODE_ENV: "production",
      TRUSTED_PROXY_IP_HEADER: "forwarded",
    }),
    "anonymous",
    "arbitrary header names must not be configurable as trusted client IP sources",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "x-forwarded-for": "203.0.113.12, 198.51.100.12" }), { NODE_ENV: "test" }),
    "203.0.113.12",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "cf-connecting-ip": "not-an-ip" }), {
      NODE_ENV: "production",
      TRUST_CF_CONNECTING_IP: "true",
    }),
    "anonymous",
  );

  console.log("Checked trusted proxy client identification.");
}

main();
