import { ImageResponse } from "next/og";

export const alt = "Maillume open-source email risk assessment";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#111711",
        color: "white",
        display: "flex",
        height: "100%",
        padding: "68px 76px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#dfff52",
          height: 18,
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />
      <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
        <div style={{ alignItems: "center", display: "flex" }}>
          <div
            style={{
              alignItems: "center",
              background: "#dfff52",
              color: "#111711",
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              height: 58,
              justifyContent: "center",
              width: 58,
            }}
          >
            ML
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginLeft: 18 }}>Maillume</div>
        </div>

        <div style={{ color: "#dfff52", fontSize: 19, fontWeight: 700, marginTop: 62 }}>
          OPEN-SOURCE EMAIL RISK ASSESSMENT
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.08,
            marginTop: 18,
            maxWidth: 760,
          }}
        >
          A second opinion before you trust an email.
        </div>
        <div
          style={{
            color: "#c8d1c6",
            fontSize: 23,
            lineHeight: 1.45,
            marginTop: 26,
            maxWidth: 750,
          }}
        >
          Paste text, inspect a screenshot, or parse an .eml file without creating scan history.
        </div>
      </div>

      <div
        style={{
          alignItems: "center",
          border: "1px solid #70806f",
          display: "flex",
          flexDirection: "column",
          height: 300,
          justifyContent: "center",
          marginLeft: 48,
          marginTop: 105,
          width: 270,
        }}
      >
        <div style={{ color: "#ff705f", fontSize: 18, fontWeight: 700 }}>RISK REPORT</div>
        <div style={{ color: "white", fontSize: 70, fontWeight: 700, marginTop: 20 }}>78</div>
        <div style={{ background: "#dfff52", color: "#111711", fontSize: 17, fontWeight: 700, marginTop: 15, padding: "8px 18px" }}>
          EXPLAINED
        </div>
      </div>
    </div>,
    size,
  );
}
