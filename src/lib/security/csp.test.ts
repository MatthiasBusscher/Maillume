import assert from "node:assert/strict";
import test from "node:test";

import { getCspConnectSources } from "./csp";

test("keeps browser connections same-origin without Supabase configuration", () => {
  assert.deepEqual(getCspConnectSources(), ["'self'"]);
});

test("allows only the normalized configured Supabase HTTPS and WebSocket origins", () => {
  assert.deepEqual(
    getCspConnectSources(" https://project.supabase.co/auth/v1/signup "),
    ["'self'", "https://project.supabase.co", "wss://project.supabase.co"],
  );
});

test("supports explicit local HTTP configuration", () => {
  assert.deepEqual(
    getCspConnectSources("http://127.0.0.1:54321/auth/v1"),
    ["'self'", "http://127.0.0.1:54321", "ws://127.0.0.1:54321"],
  );
});

test("rejects malformed, credentialed, and unsupported URLs", () => {
  assert.deepEqual(getCspConnectSources("https://user:pass@example.com"), ["'self'"]);
  assert.deepEqual(getCspConnectSources("javascript:alert(1)"), ["'self'"]);
  assert.deepEqual(getCspConnectSources("https://example.com; connect-src *"), ["'self'"]);
});
