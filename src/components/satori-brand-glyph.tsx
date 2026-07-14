type SatoriBrandGlyphProps = {
  accentOffset: number;
  background: string;
  foreground: string;
  size: number;
};

export function SatoriBrandGlyph({
  accentOffset,
  background,
  foreground,
  size,
}: SatoriBrandGlyphProps) {
  const accentSize = Math.round(size * 0.34);
  const mailSize = Math.round(size * 0.52);

  return (
    <div
      style={{
        alignItems: "center",
        background,
        display: "flex",
        height: size,
        justifyContent: "center",
        position: "relative",
        width: size,
      }}
    >
      <svg
        fill="none"
        height={mailSize}
        stroke={foreground}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
        viewBox="0 0 24 24"
        width={mailSize}
      >
        <rect height="16" rx="2" width="20" x="2" y="4" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      <div
        style={{
          alignItems: "center",
          background: "#ff705f",
          border: `2px solid ${background}`,
          display: "flex",
          height: accentSize,
          justifyContent: "center",
          position: "absolute",
          right: accentOffset,
          top: accentOffset,
          width: accentSize,
        }}
      >
        <svg
          fill="none"
          height={Math.round(accentSize * 0.65)}
          stroke="#111711"
          strokeLinecap="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          width={Math.round(accentSize * 0.65)}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.364 5.636l-.707.707M6.343 17.657l-.707.707M5.636 5.636l.707.707M17.657 17.657l.707.707" />
        </svg>
      </div>
    </div>
  );
}
