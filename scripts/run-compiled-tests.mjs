#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

const SUITES = new Set(["all", "analysis", "security"]);
const suiteArgument = process.argv.find((argument) => argument.startsWith("--suite="));
const suite = suiteArgument?.slice("--suite=".length) ?? "all";

if (!SUITES.has(suite)) {
  throw new Error(`Unsupported test suite \"${suite}\". Use one of: ${[...SUITES].join(", ")}.`);
}

const compiledTestsRoot = resolve(process.cwd(), ".analysis-tests", "src", "lib");

/**
 * Security checks intentionally remain a separate gate. Every other compiled
 * library test protects the scanner's analysis and public contract behaviour.
 */
function isSecurityTest(testPath) {
  return (
    testPath.startsWith("accounts/") ||
    testPath.startsWith("billing/") ||
    testPath.startsWith("security/") ||
    testPath === "operator.test.js" ||
    testPath === "auth/oauth-return.test.js" ||
    testPath === "auth/authenticated-locale.test.js" ||
    testPath === "i18n/account-locale.test.js" ||
    testPath === "supabase/admin-config.test.js"
  );
}

async function discoverTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) return discoverTests(entryPath);
        return entry.isFile() && entry.name.endsWith(".test.js") ? [entryPath] : [];
      }),
  );
  return paths.flat();
}

function belongsToSuite(testPath) {
  if (suite === "all") return true;
  const securityTest = isSecurityTest(relative(compiledTestsRoot, testPath));
  return suite === "security" ? securityTest : !securityTest;
}

function runTest(testPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [testPath], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolvePromise();
      reject(new Error(`Test ${relative(process.cwd(), testPath)} failed${signal ? ` (${signal})` : ""}.`));
    });
  });
}

const tests = (await discoverTests(compiledTestsRoot)).filter(belongsToSuite);
if (tests.length === 0) {
  throw new Error(`No compiled ${suite} tests were discovered under ${compiledTestsRoot}.`);
}

for (const testPath of tests) {
  process.stdout.write(`\n▶ ${relative(process.cwd(), testPath)}\n`);
  await runTest(testPath);
}

process.stdout.write(`\nCompleted ${tests.length} ${suite} compiled test${tests.length === 1 ? "" : "s"}.\n`);
