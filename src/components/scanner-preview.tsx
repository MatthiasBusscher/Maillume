import { AlertTriangle, Check, Link2, Mail, ScanSearch } from "lucide-react";

type ScannerPreviewProps = {
  locale: "en" | "nl";
};

const previewCopy = {
  en: {
    eyebrow: "Email analysis",
    title: "Check a suspicious email",
    subject: "Subject",
    subjectValue: "Invoice overdue: action required",
    sender: "Sender",
    senderValue: "billing@vendor-check.example",
    content: "Email content",
    message: "We could not process your latest payment. Review the invoice immediately to avoid account suspension.",
    link: "https://vendor-check.example/review",
    analyze: "Analyze email",
    riskScore: "Risk score",
    riskLevel: "High",
    urgency: "Creates urgency around an account problem.",
    mismatch: "Link destination does not match the claimed sender.",
    action: "Verify through a known contact channel before acting.",
    disclaimer: "Automated risk assessment. This result is not a guarantee.",
  },
  nl: {
    eyebrow: "E-mailanalyse",
    title: "Controleer een verdachte e-mail",
    subject: "Onderwerp",
    subjectValue: "Factuur verlopen: actie vereist",
    sender: "Afzender",
    senderValue: "facturatie@leverancier-controle.example",
    content: "E-mailinhoud",
    message: "We konden je laatste betaling niet verwerken. Controleer de factuur direct om blokkering van je account te voorkomen.",
    link: "https://leverancier-controle.example/bekijken",
    analyze: "E-mail analyseren",
    riskScore: "Risicoscore",
    riskLevel: "Hoog",
    urgency: "Creëert urgentie rond een probleem met je account.",
    mismatch: "De linkbestemming past niet bij de beweerde afzender.",
    action: "Controleer dit via een bekend contactkanaal voordat je handelt.",
    disclaimer: "Geautomatiseerde risicobeoordeling. Dit resultaat is geen garantie.",
  },
} as const;

export function ScannerPreview({ locale }: ScannerPreviewProps) {
  const copy = previewCopy[locale];

  return (
    <div data-testid="scanner-preview" className="overflow-hidden border border-white/30 bg-[#eef1eb] text-[#111711] shadow-[0_32px_90px_rgba(0,0,0,0.42)]">
      <div className="flex h-11 items-center justify-between border-b border-[#aeb6ac] bg-white px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-[#ff705f]" />
          <span className="h-2.5 w-2.5 bg-[#dfff52]" />
          <span className="h-2.5 w-2.5 bg-[#087b72]" />
        </div>
        <span className="font-mono text-[9px] uppercase text-[#687268]">app.maillume.io</span>
      </div>
      <div className="grid sm:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-[#bfc5bc] bg-white p-4 sm:min-h-[360px] sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-center justify-between border-b border-[#d6dad3] pb-4">
            <div>
              <p className="font-mono text-[9px] uppercase text-[#087b72]">{copy.eyebrow}</p>
              <p className="mt-1 text-base font-semibold">{copy.title}</p>
            </div>
            <Mail className="h-5 w-5 text-[#536053]" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-3 min-[440px]:grid-cols-2">
            <PreviewField label={copy.subject} value={copy.subjectValue} />
            <PreviewField label={copy.sender} value={copy.senderValue} />
          </div>
          <div className="mt-3">
            <p className="font-mono text-[8px] uppercase text-[#667066]">{copy.content}</p>
            <div className="mt-2 h-28 border border-[#cbd0c7] bg-[#f8f9f6] p-3 text-[10px] leading-5 text-[#4d584e]">
              {copy.message}
              <span className="mt-2 block text-[#087b72]">{copy.link}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <span className="inline-flex h-9 items-center gap-2 bg-[#111711] px-4 text-[10px] font-semibold text-white">
              <ScanSearch className="h-3.5 w-3.5 text-[#dfff52]" aria-hidden="true" /> {copy.analyze}
            </span>
          </div>
        </div>
        <div data-testid="scanner-preview-result" className="bg-[#f5f7f2] p-4 sm:p-5">
          <div className="flex items-end justify-between border-b border-[#cbd0c7] pb-4">
            <div>
              <p className="font-mono text-[9px] uppercase text-[#687268]">{copy.riskScore}</p>
              <p className="mt-1 font-mono text-5xl font-semibold">78</p>
            </div>
            <span className="border border-[#d84c3c] bg-[#ffe2dd] px-2.5 py-1 text-[9px] font-bold uppercase text-[#8f251b]">{copy.riskLevel}</span>
          </div>
          <div className="mt-5 space-y-3">
            <PreviewSignal icon={<AlertTriangle className="h-3.5 w-3.5" />} label={copy.urgency} />
            <PreviewSignal icon={<Link2 className="h-3.5 w-3.5" />} label={copy.mismatch} />
            <PreviewSignal icon={<Check className="h-3.5 w-3.5" />} label={copy.action} accent />
          </div>
          <p className="mt-5 border-t border-[#cbd0c7] pt-4 text-[9px] leading-4 text-[#687268]">
            {copy.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase text-[#667066]">{label}</p>
      <div className="mt-2 truncate border border-[#cbd0c7] bg-[#f8f9f6] px-2.5 py-2 text-[9px] text-[#424d43]">{value}</div>
    </div>
  );
}

function PreviewSignal({ accent = false, icon, label }: { accent?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className={`flex gap-2.5 border p-3 text-[9px] leading-4 ${accent ? "border-[#86bfb5] bg-[#e2f4ef] text-[#165f57]" : "border-[#cbd0c7] bg-white text-[#4d584e]"}`}>
      <span className={accent ? "text-[#087b72]" : "text-[#ff705f]"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
