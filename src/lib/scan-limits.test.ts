import assert from "node:assert/strict";

import {
  DEFAULT_ANALYSIS_MAX_REQUEST_BYTES,
  EML_ACCEPT,
  getSerializedRequestSize,
  isSupportedEmlFile,
  isSupportedScreenshotFile,
  isWithinFileSizeLimit,
  MAX_EML_SIZE_BYTES,
  MAX_SCREENSHOT_SIZE_BYTES,
  SCREENSHOT_ACCEPT,
  SUPPORTED_SCREENSHOT_MIME_TYPES,
} from "./scan-limits";

function main() {
  assert.equal(MAX_SCREENSHOT_SIZE_BYTES, 5 * 1024 * 1024);
  assert.equal(MAX_EML_SIZE_BYTES, 2 * 1024 * 1024);
  assert.equal(DEFAULT_ANALYSIS_MAX_REQUEST_BYTES, 32 * 1024);
  assert.equal(getSerializedRequestSize({ body: "test" }), 15);
  assert.equal(getSerializedRequestSize({ body: "veilig" }), 17);
  assert.equal(SCREENSHOT_ACCEPT, "image/png,image/jpeg,image/webp,image/gif");
  assert.equal(EML_ACCEPT, ".eml,message/rfc822");

  for (const type of SUPPORTED_SCREENSHOT_MIME_TYPES) {
    assert.equal(
      isSupportedScreenshotFile({ type }),
      true,
      `${type} should be accepted for screenshot OCR`,
    );
  }

  assert.equal(isSupportedScreenshotFile({ type: "image/svg+xml" }), false);
  assert.equal(isSupportedScreenshotFile({ type: "" }), false);
  assert.equal(isSupportedEmlFile({ name: "message.eml", type: "" }), true);
  assert.equal(isSupportedEmlFile({ name: "message.txt", type: "message/rfc822" }), true);
  assert.equal(isSupportedEmlFile({ name: "message.txt", type: "text/plain" }), false);
  assert.equal(isSupportedEmlFile({ name: "message.eml.exe", type: "" }), false);
  assert.equal(isWithinFileSizeLimit({ size: 1 }, MAX_EML_SIZE_BYTES), true);
  assert.equal(isWithinFileSizeLimit({ size: MAX_EML_SIZE_BYTES }, MAX_EML_SIZE_BYTES), true);
  assert.equal(isWithinFileSizeLimit({ size: 0 }, MAX_EML_SIZE_BYTES), false);
  assert.equal(isWithinFileSizeLimit({ size: MAX_EML_SIZE_BYTES + 1 }, MAX_EML_SIZE_BYTES), false);

  console.log("Checked upload validation limits.");
}

main();
