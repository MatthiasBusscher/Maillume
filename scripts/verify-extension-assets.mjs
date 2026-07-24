import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const extensionDirectory = path.join(root, "integrations/browser-extension");
const manifest = JSON.parse(await readFile(path.join(extensionDirectory, "manifest.json"), "utf8"));

for (const [declaredSize, relativePath] of Object.entries(manifest.icons)) {
  const expectedSize = Number(declaredSize);
  const iconPath = path.join(extensionDirectory, relativePath);
  await access(iconPath);
  const metadata = await sharp(iconPath).metadata();
  assert.equal(metadata.format, "png", `${relativePath} must be a PNG`);
  assert.equal(metadata.width, expectedSize, `${relativePath} must be ${expectedSize}px wide`);
  assert.equal(metadata.height, expectedSize, `${relativePath} must be ${expectedSize}px high`);
}

const storeIconPath = path.join(extensionDirectory, manifest.icons["128"]);
const { data, info } = await sharp(storeIconPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let minX = info.width;
let minY = info.height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const alpha = data[(y * info.width + x) * info.channels + 3];
    if (alpha === 0) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
}

assert.deepEqual(
  { minX, minY, maxX, maxY },
  { minX: 16, minY: 16, maxX: 111, maxY: 111 },
  "the 128px Chrome Web Store icon must contain a centered 96px square mark with 16px transparent padding",
);

console.log("Verified extension icon dimensions and Chrome Web Store padding.");
