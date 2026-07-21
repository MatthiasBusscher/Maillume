import assert from "node:assert/strict";
import test from "node:test";

import { createContentSecurityPolicy, getCspConnectSources } from "./csp";

test("creates a nonce-based production policy without unsafe inline scripts", () => {
  const policy = createContentSecurityPolicy({
    nonce: "request-specific-nonce",
    supabaseUrl: "https://project.supabase.co",
  });

  assert.match(policy, /script-src 'self' 'nonce-request-specific-nonce' 'strict-dynamic'/);
  assert.match(policy, /'wasm-unsafe-eval' blob:/);
  assert.match(policy, /connect-src 'self' https:\/\/project\.supabase\.co wss:\/\/project\.supabase\.co/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-eval'/);
});

test("adds the React development allowance without weakening inline script protection", () => {
  const policy = createContentSecurityPolicy({
    isDevelopment: true,
    nonce: "development-nonce",
  });

  assert.match(policy, /script-src[^;]*'unsafe-eval'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
});

test("rejects a nonce that could inject another directive", () => {
  assert.throws(
    () => createContentSecurityPolicy({ nonce: "valid; script-src *" }),
    /unsupported characters/,
  );
});

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
