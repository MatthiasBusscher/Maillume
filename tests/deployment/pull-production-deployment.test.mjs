import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = process.cwd();
const revision = (character) => character.repeat(40);
const image = (character) => `ghcr.io/matthiasbusscher/maillume@sha256:${character.repeat(64)}`;
const deployment = (id, sha, img, creator = "github-actions[bot]") =>
  JSON.stringify([{ id, sha, payload: { image: img }, creator: { login: creator } }]);

test("deploys a new approved release with the files of that exact commit", (t) => {
  const sandbox = createSandbox(t, deployment(41, revision("b"), image("c")));
  writeFileSync(join(sandbox.directory, ".current-production-revision"), `${revision("a")}\n`);

  const result = run(sandbox);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readLog(sandbox, "deploy.log"), [`${image("c")} ${revision("b")}`]);
  // Every deploy file came from the approved commit, not a branch.
  const fetched = readLog(sandbox, "curl.log").filter((url) => url.includes("raw.test"));
  assert.equal(fetched.length, 6);
  assert.ok(fetched.every((url) => url.includes(`/MatthiasBusscher/Maillume/${revision("b")}/`)));
  assert.equal(readFileSync(join(sandbox.directory, ".last-pulled-deployment"), "utf8").trim(), "41");
});

test("does nothing when the approved release is already running", (t) => {
  const sandbox = createSandbox(t, deployment(42, revision("b"), image("c")));
  writeFileSync(join(sandbox.directory, ".current-production-revision"), `${revision("b")}\n`);

  const result = run(sandbox);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readLog(sandbox, "deploy.log"), []);
  assert.equal(readFileSync(join(sandbox.directory, ".last-pulled-deployment"), "utf8").trim(), "42");
});

test("attempts each deployment once, so a failed release is not retried every run", (t) => {
  const sandbox = createSandbox(t, deployment(43, revision("b"), image("c")));
  writeFileSync(join(sandbox.directory, ".last-pulled-deployment"), "43\n");

  const result = run(sandbox);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readLog(sandbox, "deploy.log"), []);
});

test("rejects images that are not an immutable Maillume digest", (t) => {
  for (const img of ["ghcr.io/matthiasbusscher/maillume:latest", `ghcr.io/attacker/maillume@sha256:${"c".repeat(64)}`, ""]) {
    const sandbox = createSandbox(t, deployment(44, revision("b"), img));
    const result = run(sandbox);
    assert.equal(result.status, 1, img);
    assert.match(result.stderr, /not an immutable Maillume digest/);
    assert.deepEqual(readLog(sandbox, "deploy.log"), []);
    // Recorded, so the rejection is reported once rather than on every timer run.
    assert.equal(readFileSync(join(sandbox.directory, ".last-pulled-deployment"), "utf8").trim(), "44");
  }
});

test("rejects deployments not created by the release workflow", (t) => {
  for (const creator of ["MatthiasBusscher", "someone-else", ""]) {
    const sandbox = createSandbox(t, deployment(46, revision("b"), image("c"), creator));
    const result = run(sandbox);
    assert.equal(result.status, 1, creator);
    assert.match(result.stderr, /not the release workflow/);
    assert.deepEqual(readLog(sandbox, "deploy.log"), []);
  }
});

test("rejects commits that are not on main", (t) => {
  for (const status of ["diverged", "behind", ""]) {
    const sandbox = createSandbox(t, deployment(47, revision("b"), image("c")), status);
    const result = run(sandbox);
    assert.equal(result.status, 1, status);
    assert.match(result.stderr, /is not on main/);
    assert.deepEqual(readLog(sandbox, "deploy.log"), []);
    // Nothing is downloaded for a rejected commit.
    assert.equal(readLog(sandbox, "curl.log").filter((url) => url.includes("raw.test")).length, 0);
  }
});

test("a rejected deployment stays quiet on the next run", (t) => {
  const sandbox = createSandbox(t, deployment(48, revision("b"), image("c"), "MatthiasBusscher"));
  assert.equal(run(sandbox).status, 1);
  const second = run(sandbox);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stderr, "");
});

test("rejects a deployment without a full commit revision", (t) => {
  const sandbox = createSandbox(t, deployment(45, "main", image("c")));
  const result = run(sandbox);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid revision/);
});

test("exits quietly when no deployment exists yet", (t) => {
  const sandbox = createSandbox(t, "[]");
  const result = run(sandbox);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readLog(sandbox, "deploy.log"), []);
});

function createSandbox(t, deploymentsJson, compareStatus = "ahead") {
  const directory = mkdtempSync(join(tmpdir(), "maillume-pull-test-"));
  const binDirectory = join(directory, "bin");
  mkdirSync(join(directory, "scripts"));
  mkdirSync(binDirectory);
  const script = join(directory, "scripts", "pull-production-deployment.sh");
  copyFileSync(join(repositoryRoot, "scripts", "pull-production-deployment.sh"), script);
  chmodSync(script, 0o750);
  writeFileSync(join(directory, "deployments.json"), deploymentsJson);
  writeFileSync(join(directory, "compare.json"), JSON.stringify(compareStatus ? { status: compareStatus } : {}));
  writeFileSync(join(directory, "curl.log"), "");
  writeFileSync(join(directory, "deploy.log"), "");

  // Fake curl: the API answers with deployments.json (compare.json for the main check); raw downloads write a stub file, and the
  // downloaded deploy-production.sh records its arguments instead of deploying.
  writeFileSync(
    join(binDirectory, "curl"),
    `#!/bin/sh
out=""
url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift ;;
    -H|--max-time) shift ;;
    -*) ;;
    *) url="$1" ;;
  esac
  shift
done
echo "$url" >> "$SANDBOX/curl.log"
case "$url" in
  *api.test*/compare/*) cat "$SANDBOX/compare.json" ;;
  *api.test*) cat "$SANDBOX/deployments.json" ;;
  *deploy-production.sh) printf '#!/bin/sh\\necho "$1 $2" >> "$SANDBOX/deploy.log"\\n' > "$out" ;;
  *) printf '#!/bin/sh\\nexit 0\\n' > "$out" ;;
esac
`,
  );
  chmodSync(join(binDirectory, "curl"), 0o750);

  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, binDirectory, script };
}

function run(sandbox) {
  return spawnSync(sandbox.script, [], {
    cwd: sandbox.directory,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${sandbox.binDirectory}:${process.env.PATH}`,
      SANDBOX: sandbox.directory,
      GITHUB_API_URL: "https://api.test",
      GITHUB_RAW_URL: "https://raw.test",
    },
  });
}

function readLog(sandbox, name) {
  return readFileSync(join(sandbox.directory, name), "utf8").trim().split("\n").filter(Boolean);
}
