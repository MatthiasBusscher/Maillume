import assert from "node:assert/strict";

import { getTrustedClientIdentifier } from "./client-identifier";

function main() {
  assert.equal(
    getTrustedClientIdentifier(
      new Headers({ "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.10" }),
      { NODE_ENV: "production" },
    ),
    "cf:203.0.113.10",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "x-forwarded-for": "203.0.113.11" }), { NODE_ENV: "production" }),
    "anonymous",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "x-forwarded-for": "203.0.113.12, 198.51.100.12" }), { NODE_ENV: "test" }),
    "203.0.113.12",
  );
  assert.equal(
    getTrustedClientIdentifier(new Headers({ "cf-connecting-ip": "not-an-ip" }), { NODE_ENV: "production" }),
    "anonymous",
  );

  console.log("Checked trusted proxy client identification.");
}

main();
