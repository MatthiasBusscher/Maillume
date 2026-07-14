import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const redirectSource = readFileSync(join(testDirectory, "redirect.ts"), "utf8");
const compiledRoute = ts.transpileModule(redirectSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const routeModule = { exports: {} };

Function("require", "module", "exports", compiledRoute)(
  () => { throw new Error("The redirect helper must not import route dependencies."); },
  routeModule,
  routeModule.exports,
);

const { getSafeOAuthRedirectUrl } = routeModule.exports;
const origin = "https://app.maillume.io";

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
