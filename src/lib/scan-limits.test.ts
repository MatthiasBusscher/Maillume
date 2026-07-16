import assert from "node:assert/strict";

import {
  DEFAULT_ANALYSIS_MAX_REQUEST_BYTES,
  EML_ACCEPT,
  getSerializedRequestSize,
  hasSupportedScreenshotSignature,
  isSupportedEmlFile,
  isSupportedScreenshotFile,
  isWithinScreenshotDimensionLimit,
  isWithinFileSizeLimit,
  MAX_EML_SIZE_BYTES,
  MAX_SCREENSHOT_DIMENSION,
  MAX_SCREENSHOT_PIXELS,
  MAX_SCREENSHOT_SIZE_BYTES,
  SCREENSHOT_ACCEPT,
  SUPPORTED_SCREENSHOT_MIME_TYPES,
} from "./scan-limits";

function main() {
  assert.equal(MAX_SCREENSHOT_SIZE_BYTES, 5 * 1024 * 1024);
  assert.equal(MAX_SCREENSHOT_PIXELS, 20_000_000);
  assert.equal(MAX_SCREENSHOT_DIMENSION, 8_000);
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
  assert.equal(
    hasSupportedScreenshotSignature(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      { type: "image/png" },
    ),
    true,
  );
  assert.equal(
    hasSupportedScreenshotSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xdb]), { type: "image/jpeg" }),
    true,
  );
  assert.equal(
    hasSupportedScreenshotSignature(new TextEncoder().encode("GIF89a"), { type: "image/gif" }),
    true,
  );
  assert.equal(
    hasSupportedScreenshotSignature(new TextEncoder().encode("RIFF0000WEBP"), { type: "image/webp" }),
    true,
  );
  assert.equal(
    hasSupportedScreenshotSignature(new TextEncoder().encode("<svg"), { type: "image/png" }),
    false,
  );
  assert.equal(isWithinScreenshotDimensionLimit(4_000, 5_000), true);
  assert.equal(isWithinScreenshotDimensionLimit(8_001, 1), false);
  assert.equal(isWithinScreenshotDimensionLimit(5_000, 5_000), false);
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
