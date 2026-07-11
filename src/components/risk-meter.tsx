import type { RiskLevel } from "@/lib/types";

type RiskMeterProps = {
  score: number;
  level: RiskLevel;
  labels: {
    riskScore: string;
    levels: Readonly<Record<RiskLevel, string>>;
  };
};

const levelStyles: Record<RiskLevel, { badge: string; marker: string }> = {
  low: {
    badge: "border-[#2c8b65] bg-[#daf3e7] text-[#14563d]",
    marker: "bg-[#2c8b65]",
  },
  medium: {
    badge: "border-[#c38122] bg-[#fff0cf] text-[#714812]",
    marker: "bg-[#c38122]",
  },
  high: {
    badge: "border-[#d94b3b] bg-[#ffe3df] text-[#8f251b]",
    marker: "bg-[#d94b3b]",
  },
};

export function RiskMeter({ score, level, labels }: RiskMeterProps) {
  const styles = levelStyles[level];
  const markerPosition = Math.min(99, Math.max(1, score));

  return (
    <div
      role="meter"
      aria-label={`${labels.riskScore}: ${score}, ${labels.levels[level]}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="border-b border-[#d5d9de] pb-6"
    >
      <div className="grid gap-5 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase text-[#69737d]">{labels.riskScore}</p>
          <p className="mt-1 font-mono text-6xl font-semibold leading-none text-[#111711]">
            {score}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className={`border px-3 py-1.5 text-xs font-bold uppercase ${styles.badge}`}>
              {labels.levels[level]}
            </span>
            <span className={`h-3 w-3 ${styles.marker}`} aria-hidden="true" />
          </div>
          <div className="relative mt-5">
            <div className="grid h-3 grid-cols-3 gap-1" aria-hidden="true">
              <span className="bg-[#42a87d]" />
              <span className="bg-[#e0a13f]" />
              <span className="bg-[#e05a4a]" />
            </div>
            <span
              className="absolute -top-2 h-7 w-0.5 -translate-x-1/2 bg-[#111711] transition-[left] duration-500"
              style={{ left: `${markerPosition}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] uppercase text-[#69737d]">
            <span>{labels.levels.low}</span>
            <span>{labels.levels.medium}</span>
            <span>{labels.levels.high}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
