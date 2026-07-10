import { ImageResponse } from "next/og";

export const alt = "Inbox Risk Scanner privacy-first email assessment";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#f8fafc",
        color: "#020617",
        display: "flex",
        height: "100%",
        padding: "72px 80px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
        <div style={{ alignItems: "center", display: "flex" }}>
          <div
            style={{
              alignItems: "center",
              background: "#020617",
              color: "white",
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              height: 64,
              justifyContent: "center",
              width: 64,
            }}
          >
            IR
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginLeft: 20 }}>
            Inbox Risk Scanner
          </div>
        </div>

        <div style={{ color: "#0369a1", fontSize: 22, fontWeight: 700, marginTop: 64 }}>
          PRIVACY-FIRST EMAIL SAFETY
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.08,
            marginTop: 18,
            maxWidth: 750,
          }}
        >
          Check suspicious emails before you act.
        </div>
        <div
          style={{
            color: "#475569",
            fontSize: 25,
            lineHeight: 1.45,
            marginTop: 28,
            maxWidth: 760,
          }}
        >
          Paste text, scan a screenshot, or inspect an .eml file without storing the source file.
        </div>

        <div style={{ display: "flex", marginTop: 42 }}>
          {["Paste", "Screenshot", ".eml"].map((label) => (
            <div
              key={label}
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                color: "#334155",
                display: "flex",
                fontSize: 20,
                fontWeight: 600,
                marginRight: 14,
                padding: "12px 20px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          alignItems: "center",
          background: "#e0f2fe",
          border: "1px solid #7dd3fc",
          display: "flex",
          flexDirection: "column",
          height: 310,
          justifyContent: "center",
          marginLeft: 42,
          marginTop: 82,
          width: 280,
        }}
      >
        <div style={{ color: "#0369a1", fontSize: 22, fontWeight: 700 }}>NO SCAN HISTORY</div>
        <div style={{ color: "#0c4a6e", fontSize: 72, fontWeight: 700, marginTop: 22 }}>0</div>
        <div
          style={{
            color: "#0c4a6e",
            fontSize: 21,
            lineHeight: 1.35,
            marginTop: 12,
            padding: "0 28px",
            textAlign: "center",
          }}
        >
          files stored after scoring
        </div>
      </div>
    </div>,
    size,
  );
}
