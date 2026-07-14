import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og.js";
import React from "react";

const h = React.createElement;
const root = process.cwd();
const targets = new Map([
  [16, ["public/integration-icons/icon-16.png", "integrations/browser-extension/icons/icon-16.png"]],
  [32, ["public/integration-icons/icon-32.png", "integrations/browser-extension/icons/icon-32.png"]],
  [48, ["integrations/browser-extension/icons/icon-48.png"]],
  [64, ["public/integration-icons/icon-64.png"]],
  [80, ["public/integration-icons/icon-80.png"]],
  [128, ["public/integration-icons/icon-128.png", "integrations/browser-extension/icons/icon-128.png"]],
]);

function glyph(size) {
  const accentSize = Math.round(size * 0.34);
  const mailSize = Math.round(size * 0.52);
  const inset = Math.max(1, Math.round(size * 0.08));
  const border = size >= 48 ? 2 : 1;

  return h("div", {
    style: {
      alignItems: "center",
      background: "#111711",
      display: "flex",
      height: size,
      justifyContent: "center",
      position: "relative",
      width: size,
    },
  },
  h("svg", {
    fill: "none",
    height: mailSize,
    stroke: "#dfff52",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2.25",
    viewBox: "0 0 24 24",
    width: mailSize,
  },
  h("rect", { height: "16", rx: "2", width: "20", x: "2", y: "4" }),
  h("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" })),
  h("div", {
    style: {
      alignItems: "center",
      background: "#ff705f",
      border: `${border}px solid #111711`,
      display: "flex",
      height: accentSize,
      justifyContent: "center",
      position: "absolute",
      right: inset,
      top: inset,
      width: accentSize,
    },
  },
  h("svg", {
    fill: "none",
    height: Math.round(accentSize * 0.65),
    stroke: "#111711",
    strokeLinecap: "round",
    strokeWidth: "2.5",
    viewBox: "0 0 24 24",
    width: Math.round(accentSize * 0.65),
  },
  h("circle", { cx: "12", cy: "12", r: "4" }),
  h("path", { d: "M12 3v1M12 20v1M3 12h1M20 12h1M18.364 5.636l-.707.707M6.343 17.657l-.707.707M5.636 5.636l.707.707M17.657 17.657l.707.707" }))));
}

for (const [size, outputs] of targets) {
  const response = new ImageResponse(glyph(size), { height: size, width: size });
  const image = Buffer.from(await response.arrayBuffer());
  for (const output of outputs) {
    const destination = path.join(root, output);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, image);
  }
}

console.log("Generated Maillume integration icons.");
