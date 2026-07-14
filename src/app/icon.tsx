import { ImageResponse } from "next/og";

import { SatoriBrandGlyph } from "@/components/satori-brand-glyph";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#111711",
        display: "flex",
        height: "100%",
        width: "100%",
      }}
    >
      <SatoriBrandGlyph
        accentOffset={5}
        background="#111711"
        foreground="#dfff52"
        size={64}
      />
    </div>,
    size,
  );
}
