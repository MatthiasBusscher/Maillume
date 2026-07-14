import { Mail, SunMedium } from "lucide-react";

type BrandMarkProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-3" aria-label="Maillume">
      <span
        className={`relative flex h-10 w-10 flex-none items-center justify-center border ${
          inverse
            ? "border-white/35 bg-[#dfff52] text-[#111711]"
            : "border-[#111711] bg-[#111711] text-[#dfff52]"
        }`}
        aria-hidden="true"
      >
        <Mail className="h-5 w-5" strokeWidth={2.25} />
        <span className={`absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center border-2 ${inverse ? "border-[#111711] bg-[#ff705f]" : "border-[#f7f8f4] bg-[#ff705f] text-[#111711]"}`}>
          <SunMedium className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </span>
      {!compact ? (
        <span className={`text-lg font-semibold ${inverse ? "text-white" : "text-[#111711]"}`}>
          Maillume
        </span>
      ) : null}
    </span>
  );
}
