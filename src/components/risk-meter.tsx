import type { RiskLevel } from "@/lib/types";

type RiskMeterProps = {
  score: number;
  level: RiskLevel;
  labels: {
    riskScore: string;
    levels: Readonly<Record<RiskLevel, string>>;
  };
};

const levelStyles: Record<RiskLevel, { badge: string; marker: string; label: string }> = {
  low: {
    badge: "border-[#2c8b65] bg-[#daf3e7] text-[#14563d]",
    marker: "bg-[#2c8b65]",
    label: "font-semibold text-[#14563d]",
  },
  medium: {
    badge: "border-[#c38122] bg-[#fff0cf] text-[#714812]",
    marker: "bg-[#c38122]",
    label: "font-semibold text-[#714812]",
  },
  high: {
    badge: "border-[#d94b3b] bg-[#ffe3df] text-[#8f251b]",
    marker: "bg-[#d94b3b]",
    label: "font-semibold text-[#8f251b]",
  },
};

const levels: RiskLevel[] = ["low", "medium", "high"];

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
      data-risk-level={level}
      className="border-b border-[#d5d9de] pb-6"
    >
      <div className="grid gap-5 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase text-[#59646f]">{labels.riskScore}</p>
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
          <div className="relative mt-5 h-3 bg-[#d9ded9]" aria-hidden="true">
            <span
              data-testid="risk-score-fill"
              className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${styles.marker}`}
              style={{ width: `${score}%` }}
            />
            <span
              className="absolute -top-2 h-7 w-0.5 -translate-x-1/2 bg-[#111711] transition-[left] duration-500"
              style={{ left: `${markerPosition}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 font-mono text-[10px] uppercase text-[#59646f]">
            {levels.map((candidate, index) => (
              <span
                key={candidate}
                className={`${index === 1 ? "text-center" : index === 2 ? "text-right" : ""} ${
                  candidate === level ? levelStyles[candidate].label : ""
                }`}
              >
                {labels.levels[candidate]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
