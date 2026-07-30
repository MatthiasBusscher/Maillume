import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(".github/workflows/release.yml", "utf8");

test("production deployment requires every managed migration confirmation", () => {
  for (const input of [
    "feedback_summary_migration_applied",
    "extension_pairing_migration_applied",
    "browser_connections_migration_applied",
  ]) {
    assert.match(workflow, new RegExp(`^      ${input}:$`, "m"));
    assert.match(workflow, new RegExp(`inputs\\.${input}`));
  }

  assert.match(
    workflow,
    /Apply and verify the production browser-connections migration before deployment\./,
  );
});
