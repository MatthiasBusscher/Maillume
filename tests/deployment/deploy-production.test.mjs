import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repositoryRoot = process.cwd();
const image = (character) =>
  `ghcr.io/matthiasbusscher/maillume@sha256:${character.repeat(64)}`;
const revision = (character) => character.repeat(40);

test("migrates legacy state and retains the previous known-good release", (t) => {
  const sandbox = createSandbox(t);
  const oldImage = image("a");
  const newImage = image("b");
  const oldRevision = revision("1");
  const newRevision = revision("2");

  writeState(sandbox, ".previous-production-image", oldImage);
  writeState(sandbox, ".previous-production-revision", oldRevision);

  const result = runScript(sandbox, "deploy-production.sh", [newImage, newRevision]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readState(sandbox, ".current-production-image"), newImage);
  assert.equal(readState(sandbox, ".current-production-revision"), newRevision);
  assert.equal(readState(sandbox, ".previous-production-image"), oldImage);
  assert.equal(readState(sandbox, ".previous-production-revision"), oldRevision);
});

test("a failed deployment returns to the current known-good release", (t) => {
  const sandbox = createSandbox(t);
  const olderImage = image("a");
  const currentImage = image("b");
  const targetImage = image("c");

  writeState(sandbox, ".current-production-image", currentImage);
  writeState(sandbox, ".current-production-revision", revision("2"));
  writeState(sandbox, ".previous-production-image", olderImage);
  writeState(sandbox, ".previous-production-revision", revision("1"));

  const result = runScript(
    sandbox,
    "deploy-production.sh",
    [targetImage, revision("3")],
    { FAIL_HEALTH_IMAGE: targetImage },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Deployment failed health checks/);
  assert.match(result.stderr, /Rolling back to/);
  assert.deepEqual(readDockerLog(sandbox), [`up:${targetImage}`, `up:${currentImage}`]);
  assert.equal(readState(sandbox, ".current-production-image"), currentImage);
  assert.equal(readState(sandbox, ".previous-production-image"), olderImage);
});

test("hosted deployment refuses to collapse clients into the shared bucket", (t) => {
  const sandbox = createSandbox(t);
  writeFileSync(join(sandbox.directory, ".env.production"), "ANALYSIS_MODE=heuristic\n");

  const result = runScript(
    sandbox,
    "deploy-production.sh",
    [image("c"), revision("3")],
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires TRUST_CF_CONNECTING_IP=true/);
  assert.deepEqual(readDockerLog(sandbox), []);
});

test("hosted deployment rejects ambiguous trusted-proxy configuration", (t) => {
  const sandbox = createSandbox(t);
  writeFileSync(
    join(sandbox.directory, ".env.production"),
    "TRUST_CF_CONNECTING_IP=true\nTRUSTED_PROXY_IP_HEADER=x-forwarded-for\n",
  );

  const result = runScript(
    sandbox,
    "deploy-production.sh",
    [image("c"), revision("3")],
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not combine Cloudflare and generic proxy header trust/);
  assert.deepEqual(readDockerLog(sandbox), []);
});

test("manual rollback swaps current and previous release slots", (t) => {
  const sandbox = createSandbox(t);
  const previousImage = image("a");
  const currentImage = image("b");

  writeState(sandbox, ".current-production-image", currentImage);
  writeState(sandbox, ".current-production-revision", revision("2"));
  writeState(sandbox, ".previous-production-image", previousImage);
  writeState(sandbox, ".previous-production-revision", revision("1"));

  const result = runScript(sandbox, "rollback-production.sh");

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readState(sandbox, ".current-production-image"), previousImage);
  assert.equal(readState(sandbox, ".previous-production-image"), currentImage);
  assert.equal(readState(sandbox, ".current-production-revision"), revision("1"));
  assert.equal(readState(sandbox, ".previous-production-revision"), revision("2"));
});

test("rollback rehearsal restores the release active at the start", (t) => {
  const sandbox = createSandbox(t);
  const previousImage = image("a");
  const currentImage = image("b");

  writeState(sandbox, ".current-production-image", currentImage);
  writeState(sandbox, ".current-production-revision", revision("2"));
  writeState(sandbox, ".previous-production-image", previousImage);
  writeState(sandbox, ".previous-production-revision", revision("1"));

  const result = runScript(sandbox, "rehearse-production-rollback.sh");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /completed and restored/);
  assert.deepEqual(readDockerLog(sandbox), [`up:${previousImage}`, `up:${currentImage}`]);
  assert.equal(readState(sandbox, ".current-production-image"), currentImage);
  assert.equal(readState(sandbox, ".previous-production-image"), previousImage);
});

test("Tunnel restart rehearsal waits for origin recovery", (t) => {
  const sandbox = createSandbox(t);

  const result = runScript(sandbox, "rehearse-production-tunnel-restart.sh");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Tunnel restart rehearsal completed/);
  assert.deepEqual(readDockerLog(sandbox), ["restart:cloudflared"]);
});

test("Tunnel restart rehearsal fails when health does not recover", (t) => {
  const sandbox = createSandbox(t);

  const result = runScript(
    sandbox,
    "rehearse-production-tunnel-restart.sh",
    [],
    { FAIL_TUNNEL_HEALTH: "true" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /failed health checks/);
});

function createSandbox(t) {
  const directory = mkdtempSync(join(tmpdir(), "maillume-deploy-test-"));
  const scriptsDirectory = join(directory, "scripts");
  const binDirectory = join(directory, "bin");
  mkdirSync(scriptsDirectory);
  mkdirSync(binDirectory);

  for (const script of [
    "deploy-production.sh",
    "rollback-production.sh",
    "rehearse-production-rollback.sh",
    "rehearse-production-tunnel-restart.sh",
  ]) {
    const target = join(scriptsDirectory, script);
    copyFileSync(join(repositoryRoot, "scripts", script), target);
    chmodSync(target, 0o750);
  }

  writeFileSync(
    join(directory, ".env.production"),
    "ANALYSIS_MODE=heuristic\nTRUST_CF_CONNECTING_IP=true\n",
  );
  writeFileSync(join(directory, ".env.infrastructure"), "CLOUDFLARE_TUNNEL_TOKEN=test\n");
  writeFileSync(join(directory, "docker-compose.production.yml"), "services: {}\n");
  writeFileSync(join(directory, "docker.log"), "");

  const fakeDocker = join(binDirectory, "docker");
  writeFileSync(
    fakeDocker,
    `#!/bin/sh
set -eu

if [ "$1" = "compose" ]; then
  shift
  action=""
  for argument in "$@"; do
    case "$argument" in
      config|up|exec|restart|ps) action="$argument"; break ;;
    esac
  done
  case "$action" in
    config)
      echo "cloudflare/cloudflared@sha256:${"d".repeat(64)}"
      ;;
    up)
      printf 'up:%s\\n' "$MAILLUME_IMAGE" >> "$DOCKER_LOG"
      ;;
    exec)
      if { [ -n "\${FAIL_HEALTH_IMAGE:-}" ] && \
           [ "\${FAIL_HEALTH_IMAGE:-}" = "\${MAILLUME_IMAGE:-}" ]; } || \
         [ "\${FAIL_TUNNEL_HEALTH:-}" = "true" ]; then
        exit 1
      fi
      ;;
    restart)
      printf 'restart:cloudflared\\n' >> "$DOCKER_LOG"
      ;;
    ps)
      echo "cloudflared-container"
      ;;
  esac
  exit 0
fi

case "$1" in
  pull|image) exit 0 ;;
  inspect)
    echo "true"
    exit 0
    ;;
esac

echo "Unexpected fake Docker invocation: $*" >&2
exit 1
`,
  );
  chmodSync(fakeDocker, 0o750);

  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, binDirectory };
}

function runScript(sandbox, script, args = [], extraEnv = {}) {
  return spawnSync(join(sandbox.directory, "scripts", script), args, {
    cwd: sandbox.directory,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
      PATH: `${sandbox.binDirectory}:${process.env.PATH}`,
      DOCKER_LOG: join(sandbox.directory, "docker.log"),
      DEPLOY_HEALTH_ATTEMPTS: "1",
      DEPLOY_HEALTH_DELAY_SECONDS: "0",
      RESTART_HEALTH_ATTEMPTS: "1",
      RESTART_HEALTH_DELAY_SECONDS: "0",
    },
  });
}

function writeState(sandbox, name, value) {
  writeFileSync(join(sandbox.directory, name), `${value}\n`);
}

function readState(sandbox, name) {
  return readFileSync(join(sandbox.directory, name), "utf8").trim();
}

function readDockerLog(sandbox) {
  return readFileSync(join(sandbox.directory, "docker.log"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);
}
