import assert from "node:assert/strict";

import { decodeQrHttpLinks, normalizeQrHttpLink, type QrDecoder } from "./extract-qr-links";

assert.equal(
  normalizeQrHttpLink(" https://review.example.test/account#token "),
  "https://review.example.test/account",
);
assert.equal(normalizeQrHttpLink("javascript:alert(1)"), null);
assert.equal(normalizeQrHttpLink("mailto:help@example.test"), null);
assert.equal(normalizeQrHttpLink("not a URL"), null);
assert.equal(normalizeQrHttpLink(`https://example.test/${"x".repeat(2_100)}`), null);

const image = {
  data: new Uint8ClampedArray(16),
  width: 2,
  height: 2,
} as ImageData;
const decoder: QrDecoder = () => ({ data: "https://qr.example.test/continue#tracking" }) as never;
assert.deepEqual(decodeQrHttpLinks(image, decoder), ["https://qr.example.test/continue"]);
assert.deepEqual(decodeQrHttpLinks(image, () => null), []);

console.log("Checked local QR destination normalization.");
