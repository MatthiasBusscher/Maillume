import assert from "node:assert/strict";

import { DEFAULT_ANALYSIS_MAX_REQUEST_BYTES } from "../scan-limits";
import { getAnalysisMaxRequestBytes } from "./request-limits";

assert.equal(getAnalysisMaxRequestBytes({}), DEFAULT_ANALYSIS_MAX_REQUEST_BYTES);
assert.equal(
  getAnalysisMaxRequestBytes({ ANALYSIS_MAX_REQUEST_BYTES: "65536" }),
  65_536,
);

for (const invalidValue of ["0", "-1", "not-a-number", "262145"]) {
  assert.equal(
    getAnalysisMaxRequestBytes({ ANALYSIS_MAX_REQUEST_BYTES: invalidValue }),
    DEFAULT_ANALYSIS_MAX_REQUEST_BYTES,
  );
}

console.log("Checked analysis request-size configuration.");
