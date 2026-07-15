import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import { verifyPublicDeployment } from "../../scripts/verify-public-deployment.mjs";

const revision = "1".repeat(40);

test("waits until the public route serves the approved revision", async (t) => {
  let healthRequests = 0;
  const server = await createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (request.url?.startsWith("/api/health")) {
      healthRequests += 1;
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({
        status: "ok",
        revision: healthRequests === 1 ? "0".repeat(40) : revision,
        analysis_version: "analysis-v2.1",
      }));
      return;
    }
    response.end("ok");
  });
  t.after(() => server.close());

  const origin = `http://127.0.0.1:${server.address().port}`;
  const result = await verifyPublicDeployment({
    appUrl: origin,
    marketingUrl: origin,
    expectedRevision: revision,
    attempts: 2,
    delayMs: 0,
  });

  assert.equal(healthRequests, 2);
  assert.equal(result.revision, revision);
});

test("rejects unexpected public health fields", async (t) => {
  const server = await createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
      status: "ok",
      revision,
      analysis_version: "analysis-v2.1",
      database: "connected",
    }));
  });
  t.after(() => server.close());

  const origin = `http://127.0.0.1:${server.address().port}`;
  await assert.rejects(
    verifyPublicDeployment({
      appUrl: origin,
      marketingUrl: origin,
      expectedRevision: revision,
      attempts: 1,
      delayMs: 0,
    }),
    /outside its release-safe contract/,
  );
});

function createServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}
