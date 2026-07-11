import { MailSearch } from "lucide-react";

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
        <MailSearch className="h-5 w-5" strokeWidth={2.25} />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 border-2 border-current bg-[#ff705f]" />
      </span>
      {!compact ? (
        <span className={`text-lg font-semibold ${inverse ? "text-white" : "text-[#111711]"}`}>
          Maillume
        </span>
      ) : null}
    </span>
  );
}
