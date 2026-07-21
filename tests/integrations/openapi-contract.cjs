/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const specification = JSON.parse(fs.readFileSync(path.resolve("public/openapi.json"), "utf8"));
const request = specification.components.schemas.AnalyzeRequest;
const response = specification.components.schemas.AnalyzeResponse;

assert.equal(request.properties.body.maxLength, 20_000);
assert.equal(request.properties.links.type, "array");
assert.equal(request.properties.links.maxItems, 20);
assert.equal(request.properties.links.items.maxLength, 2_048);
assert.equal(request.properties.links.items.pattern, "^[Hh][Tt][Tt][Pp][Ss]?://");
assert.equal(request.properties.linkPairs.maxItems, 20);
assert.equal(request.properties.linkPairs.items.properties.displayedUrl.maxLength, 2_048);
assert.equal(request.properties.linkPairs.items.properties.destinationUrl.maxLength, 2_048);
assert.deepEqual(response.required, [
  "result",
  "analysis_mode",
  "analysis_provider",
  "analysis_version",
  "disclaimer",
  "privacy",
]);
assert.equal(response.properties.analysis_version.const, "analysis-v4");
assert.equal(response.properties.privacy.properties.stored.const, false);

console.log("OpenAPI integration request limits and analysis privacy envelope passed.");
