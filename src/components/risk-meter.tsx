import type { RiskLevel } from "@/lib/types";

type RiskMeterProps = {
  score: number;
  level: RiskLevel;
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

export function RiskMeter({ score, level }: RiskMeterProps) {
  const styles = levelStyles[level];

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Risk score</p>
          <p className="text-5xl font-semibold text-slate-950">{score}</p>
        </div>
        <span
          className={`rounded-md px-3 py-1.5 text-sm font-semibold uppercase ring-1 ${styles.bg} ${styles.text}`}
        >
          {level}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-medium text-slate-500">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}

