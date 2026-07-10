import type { RiskLevel } from "@/lib/types";

type RiskMeterProps = {
  score: number;
  level: RiskLevel;
  labels: {
    riskScore: string;
    levels: Readonly<Record<RiskLevel, string>>;
  };
};

const levelStyles: Record<RiskLevel, { bar: string; text: string; bg: string }> = {
  low: {
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 ring-emerald-200",
  },
  medium: {
    bar: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50 ring-amber-200",
  },
  high: {
    bar: "bg-rose-600",
    text: "text-rose-700",
    bg: "bg-rose-50 ring-rose-200",
  },
};

export function RiskMeter({ score, level, labels }: RiskMeterProps) {
  const styles = levelStyles[level];

  return (
    <div
      role="meter"
      aria-label={`${labels.riskScore}: ${score}, ${labels.levels[level]}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="space-y-3"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{labels.riskScore}</p>
          <p className="text-5xl font-semibold text-slate-950">{score}</p>
        </div>
        <span
          className={`rounded-md px-3 py-1.5 text-sm font-semibold uppercase ring-1 ${styles.bg} ${styles.text}`}
        >
          {labels.levels[level]}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-medium text-slate-500">
        <span>{labels.levels.low}</span>
        <span>{labels.levels.medium}</span>
        <span>{labels.levels.high}</span>
      </div>
    </div>
  );
}
