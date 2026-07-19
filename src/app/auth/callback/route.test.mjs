import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
function compileHelper(fileName) {
  const source = readFileSync(join(testDirectory, fileName), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const helperModule = { exports: {} };

  Function("require", "module", "exports", compiled)(
    () => { throw new Error(`${fileName} must not import route dependencies.`); },
    helperModule,
    helperModule.exports,
  );
  return helperModule.exports;
}

const { getSafeOAuthRedirectUrl } = compileHelper("redirect.ts");
const { getPublicAppOrigin } = compileHelper("origin.ts");
const { isPasswordRecoveryPath } = compileHelper("../../../lib/auth/recovery.ts");
const origin = "https://app.maillume.io";

test("recognizes localized password-recovery destinations", () => {
  for (const pathname of ["/auth/update-password", "/nl/auth/update-password"]) {
    assert.equal(isPasswordRecoveryPath(pathname), true, pathname);
  }

  for (const pathname of ["/account", "/auth/mfa", "/update-password/extra"]) {
    assert.equal(isPasswordRecoveryPath(pathname), false, pathname);
  }
});

test("keeps ordinary same-origin callback destinations", () => {
  for (const requestedNext of [
    "/account",
    "/app?tab=inbox#message",
    "/caf%C3%A9",
    "/app?return=%2Faccount",
  ]) {
    assert.equal(
      getSafeOAuthRedirectUrl(requestedNext, origin).origin,
      origin,
      requestedNext,
    );
  }
});

test("falls back for absolute and scheme-relative destinations", () => {
  for (const requestedNext of [
    "https://attacker.example/path",
    "//attacker.example/path",
    "///attacker.example/path",
  ]) {
    assert.equal(
      getSafeOAuthRedirectUrl(requestedNext, origin).href,
      `${origin}/account`,
      requestedNext,
    );
  }
});

test("falls back for raw and recursively encoded redirect delimiters", () => {
  for (const requestedNext of [
    "/\\\\attacker.example/path",
    "/%5c%5cattacker.example/path",
    "/%255c%255cattacker.example/path",
    "/%2f%2fattacker.example/path",
    "/%252f%252fattacker.example/path",
  ]) {
    assert.equal(
      getSafeOAuthRedirectUrl(requestedNext, origin).href,
      `${origin}/account`,
      requestedNext,
    );
  }
});

test("falls back for raw and encoded control characters", () => {
  for (const requestedNext of [
    "/\n//attacker.example/path",
    "/\u0000/account",
    "/\u007f/account",
    "/%0d%0a//attacker.example/path",
    "/%250d%250a//attacker.example/path",
  ]) {
    assert.equal(
      getSafeOAuthRedirectUrl(requestedNext, origin).href,
      `${origin}/account`,
      JSON.stringify(requestedNext),
    );
  }
});

test("uses the configured public app origin ahead of proxy and container values", () => {
  assert.equal(
    getPublicAppOrigin({
      configuredAppUrl: "https://app.maillume.io/app",
      forwardedHost: "attacker.example",
      forwardedProto: "http",
      host: "0.0.0.0:3000",
      requestUrl: "http://0.0.0.0:3000/auth/callback",
    }),
    "https://app.maillume.io",
  );
});

test("uses trusted proxy headers when no app URL is configured", () => {
  assert.equal(
    getPublicAppOrigin({
      forwardedHost: "app.maillume.io, internal.example",
      forwardedProto: "https, http",
      host: "0.0.0.0:3000",
      requestUrl: "http://0.0.0.0:3000/auth/callback",
    }),
    "https://app.maillume.io",
  );
});

test("ignores untrusted proxy hosts when no app URL is configured", () => {
  assert.equal(
    getPublicAppOrigin({
      forwardedHost: "attacker.example",
      forwardedProto: "https",
      host: "0.0.0.0:3000",
      requestUrl: "http://0.0.0.0:3000/auth/callback",
    }),
    "http://0.0.0.0:3000",
  );
});

test("falls back to the request origin for invalid public origin inputs", () => {
  assert.equal(
    getPublicAppOrigin({
      configuredAppUrl: "javascript:alert(1)",
      forwardedHost: "app.maillume.io",
      forwardedProto: "ftp",
      host: "0.0.0.0:3000",
      requestUrl: "http://0.0.0.0:3000/auth/callback",
    }),
    "http://0.0.0.0:3000",
  );
});
