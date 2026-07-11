import { AlertTriangle, Check, Link2, Mail, ScanSearch } from "lucide-react";

export function ScannerPreview() {
  return (
    <div className="overflow-hidden border border-white/30 bg-[#eef1eb] text-[#111711] shadow-[0_32px_90px_rgba(0,0,0,0.42)]">
      <div className="flex h-11 items-center justify-between border-b border-[#aeb6ac] bg-white px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-[#ff705f]" />
          <span className="h-2.5 w-2.5 bg-[#dfff52]" />
          <span className="h-2.5 w-2.5 bg-[#087b72]" />
        </div>
        <span className="font-mono text-[9px] uppercase text-[#687268]">app.maillume.io</span>
      </div>
      <div className="grid min-h-[360px] grid-cols-[1.05fr_0.95fr]">
        <div className="border-r border-[#bfc5bc] bg-white p-5">
          <div className="flex items-center justify-between border-b border-[#d6dad3] pb-4">
            <div>
              <p className="font-mono text-[9px] uppercase text-[#087b72]">Email analysis</p>
              <p className="mt-1 text-base font-semibold">Check a suspicious email</p>
            </div>
            <Mail className="h-5 w-5 text-[#536053]" aria-hidden="true" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <PreviewField label="Subject" value="Invoice overdue: action required" />
            <PreviewField label="Sender" value="billing@vendor-check.example" />
          </div>
          <div className="mt-3">
            <p className="font-mono text-[8px] uppercase text-[#667066]">Email content</p>
            <div className="mt-2 h-28 border border-[#cbd0c7] bg-[#f8f9f6] p-3 text-[10px] leading-5 text-[#4d584e]">
              We could not process your latest payment. Review the invoice immediately to avoid account suspension.
              <span className="mt-2 block text-[#087b72]">https://vendor-check.example/review</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <span className="inline-flex h-9 items-center gap-2 bg-[#111711] px-4 text-[10px] font-semibold text-white">
              <ScanSearch className="h-3.5 w-3.5 text-[#dfff52]" aria-hidden="true" /> Analyze email
            </span>
          </div>
        </div>
        <div className="bg-[#f5f7f2] p-5">
          <div className="flex items-end justify-between border-b border-[#cbd0c7] pb-4">
            <div>
              <p className="font-mono text-[9px] uppercase text-[#687268]">Risk score</p>
              <p className="mt-1 font-mono text-5xl font-semibold">78</p>
            </div>
            <span className="border border-[#d84c3c] bg-[#ffe2dd] px-2.5 py-1 text-[9px] font-bold uppercase text-[#8f251b]">High</span>
          </div>
          <div className="mt-5 space-y-3">
            <PreviewSignal icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Creates urgency around an account problem." />
            <PreviewSignal icon={<Link2 className="h-3.5 w-3.5" />} label="Link destination does not match the claimed sender." />
            <PreviewSignal icon={<Check className="h-3.5 w-3.5" />} label="Verify through a known contact channel before acting." accent />
          </div>
          <p className="mt-5 border-t border-[#cbd0c7] pt-4 text-[9px] leading-4 text-[#687268]">
            Automated risk assessment. This result is not a guarantee.
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
