import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#020617",
        color: "white",
        display: "flex",
        fontSize: 21,
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        letterSpacing: 0,
        width: "100%",
      }}
    >
      IR
    </div>,
    size,
  );
}
