import {
  AlertTriangle,
  DatabaseZap,
  Info,
  Link2,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import type { EmailAnalysisResult, WebScanSource } from "@/lib/types";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { AnalysisFeedback } from "../analysis-feedback";
import { RiskMeter } from "../risk-meter";

type ResultPanelProps = {
  analysisVersion: string;
  dictionary: Dictionary;
  feedbackEnabled: boolean;
  locale: Locale;
  result: EmailAnalysisResult | null;
  source: WebScanSource;
};

export function ResultPanel({
  analysisVersion,
  dictionary,
  feedbackEnabled,
  locale,
  result,
  source,
}: ResultPanelProps) {
  return result ? (
    <AnalysisResult
      analysisVersion={analysisVersion}
      dictionary={dictionary}
      feedbackEnabled={feedbackEnabled}
      locale={locale}
      result={result}
      source={source}
    />
  ) : (
    <EmptyResult dictionary={dictionary} />
  );
}

function EmptyResult({ dictionary }: { dictionary: Dictionary }) {
  return (
    <div className="flex h-full min-h-[34rem] flex-col">
      <div className="border-b border-[#d5d9de] pb-4">
        <p className="font-mono text-[11px] uppercase text-[#087b72]">
          {dictionary.result.title}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#111711] sm:text-2xl">
          {dictionary.empty.title}
        </h2>
      </div>

      <div className="border-b border-[#d5d9de] py-8">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#59646f]">
              {dictionary.empty.status}
            </p>
            <p className="mt-2 font-mono text-6xl font-semibold text-[#aeb6bf]">--</p>
          </div>
          <ScanLine className="h-14 w-14 text-[#aeb6bf]" strokeWidth={1.25} aria-hidden="true" />
        </div>
        <div className="mt-6 grid h-3 grid-cols-3 gap-1" aria-hidden="true">
          <span className="bg-[#bfc7c2]" />
          <span className="bg-[#d4c9ae]" />
          <span className="bg-[#d6bbb7]" />
        </div>
        <p className="mt-5 max-w-lg text-sm leading-6 text-[#59646f]">
          {dictionary.empty.description}
        </p>
      </div>

      <div className="my-6 border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-4 text-sm leading-6 text-[#204e51]">
        <div className="mb-2 flex items-center gap-2 font-semibold text-[#173b40]">
          <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          {dictionary.empty.privacyTitle}
        </div>
        {dictionary.empty.privacyBody}
      </div>

      <div className="mt-auto border-t border-[#d5d9de] pt-4 text-xs leading-5 text-[#59646f]">
        {dictionary.result.disclaimer}
      </div>
    </div>
  );
}

function AnalysisResult({
  analysisVersion,
  dictionary,
  feedbackEnabled,
  locale,
  result,
  source,
}: Omit<ResultPanelProps, "result"> & { result: EmailAnalysisResult }) {
  return (
    <div>
      <div className="mb-6 border-b border-[#d5d9de] pb-5">
        <p className="font-mono text-[11px] uppercase text-[#087b72]">
          {dictionary.result.title}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#111711] sm:text-2xl">
          {dictionary.result.summaryTitle}
        </h2>
        <p className="mt-2 font-mono text-[10px] uppercase text-[#59646f]">
          {dictionary.result.classification}: {dictionary.result.classifications[result.classification]}
        </p>
      </div>

      <RiskMeter
        score={result.risk_score}
        level={result.risk_level}
        labels={{
          riskScore: dictionary.result.riskScore,
          levels: dictionary.result.levels,
        }}
      />

      <section aria-labelledby="recommended-action-title" className="my-5 border-l-4 border-[#dfff52] bg-[#111711] px-4 py-5 text-white">
        <h3 id="recommended-action-title" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-[#dfff52]" aria-hidden="true" />
          {dictionary.result.recommendedAction}
        </h3>
        <p className="text-sm leading-6 text-[#d9dfe3]">{result.recommended_action}</p>
      </section>

      <EvidenceCoverageSummary dictionary={dictionary} result={result} />

      <section className="border-b border-[#d5d9de] py-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#26313b]">
          <ScanLine className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
          {dictionary.result.scoreBasisTitle}
        </h3>
        <p className="text-sm leading-6 text-[#59646f]">{dictionary.result.scoreBasisBody}</p>
        {result.score_factors.length > 0 ? (
          <ul className="mt-4 divide-y divide-[#d5d9de] border-y border-[#d5d9de]">
            {result.score_factors.map((factor) => (
              <li key={factor.id} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm leading-5">
                <span className="text-[#414c57]">{factor.label}</span>
                <span className="font-mono text-xs font-semibold text-[#087b72]">
                  +{factor.contribution} {dictionary.result.points}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="border-b border-[#d5d9de] py-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#26313b]">
          <Info className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
          {dictionary.result.explanation}
        </h3>
        <p className="text-sm leading-6 text-[#59646f]">{result.short_explanation}</p>
      </section>

      <section className="border-b border-[#d5d9de] py-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#26313b]">
          <AlertTriangle className="h-4 w-4 text-[#d76b16]" aria-hidden="true" />
          {dictionary.result.suspiciousSignals}
        </h3>
        {result.suspicious_signals.length > 0 ? (
          <ul className="divide-y divide-[#d5d9de] border-y border-[#d5d9de] bg-white">
            {result.suspicious_signals.map((signal) => (
              <li key={signal} className="flex gap-3 px-3 py-3 text-sm leading-6 text-[#414c57]">
                <span className="mt-2 h-2 w-2 flex-none bg-[#ff705f]" aria-hidden="true" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-[#d5d9de] bg-white px-3 py-3 text-sm text-[#59646f]">
            {dictionary.result.noSignals}
          </p>
        )}
      </section>

      <section className="border-b border-[#d5d9de] py-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#26313b]">
          <Link2 className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
          {dictionary.result.detectedLinks}
        </h3>
        {result.detected_links.length > 0 ? (
          <ul className="divide-y divide-[#d5d9de] border-y border-[#d5d9de] bg-white">
            {result.detected_links.map((link) => (
              <li key={link} className="break-all px-3 py-3 font-mono text-xs leading-5 text-[#245b61]">
                {link}
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-[#d5d9de] bg-white px-3 py-3 text-sm text-[#59646f]">
            {dictionary.result.noLinks}
          </p>
        )}
      </section>

      {feedbackEnabled && analysisVersion ? (
        <AnalysisFeedback
          analyzerVersion={analysisVersion}
          dictionary={dictionary}
          locale={locale}
          scoreBand={result.risk_level}
          source={source}
        />
      ) : null}

      <p className="border-t border-[#d5d9de] pt-4 text-xs leading-5 text-[#59646f]">
        {dictionary.result.disclaimer}
      </p>
    </div>
  );
}

function EvidenceCoverageSummary({ dictionary, result }: { dictionary: Dictionary; result: EmailAnalysisResult }) {
  const coverage = result.evidence_coverage;
  const materiallyLimited = !coverage.sender_available
    || !coverage.full_content_available
    || !coverage.link_destinations_available;
  const summary = coverage.extraction_type === "ocr"
    ? dictionary.result.coverageOcr
    : !coverage.full_content_available
      ? dictionary.result.coveragePartial
      : materiallyLimited
        ? dictionary.result.coverageLimited
        : dictionary.result.coverageComplete;
  const items = [
    [dictionary.result.coverageLabels.subject, coverage.subject_available],
    [dictionary.result.coverageLabels.sender, coverage.sender_available],
    [dictionary.result.coverageLabels.fullContent, coverage.full_content_available],
    [dictionary.result.coverageLabels.linkDestinations, coverage.link_destinations_available],
    [dictionary.result.coverageLabels.authentication, coverage.authentication_results_available],
    [dictionary.result.coverageLabels.attachments, coverage.attachment_evidence_available],
  ] as const;

  return (
    <section className="border-b border-[#d5d9de] py-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#26313b]">
        <Info className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
        {dictionary.result.coverageTitle}
      </h3>
      <p
        className={`border-l-4 px-3 py-3 text-sm leading-6 ${
          materiallyLimited || coverage.extraction_type === "ocr"
            ? "border-[#d76b16] bg-[#fff6e7] text-[#714812]"
            : "border-[#087b72] bg-[#eaf6f5] text-[#204e51]"
        }`}
      >
        {summary}
      </p>
      <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        {items.map(([label, available]) => (
          <div key={label} className="flex items-center justify-between gap-3 border-b border-[#d5d9de] py-2">
            <dt className="text-[#59646f]">{label}</dt>
            <dd className={available ? "font-semibold text-[#087b72]" : "font-semibold text-[#8b5b17]"}>
              {available ? dictionary.result.coverageStates.available : dictionary.result.coverageStates.unavailable}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-b border-[#d5d9de] py-2">
          <dt className="text-[#59646f]">{dictionary.result.coverageLabels.extraction}</dt>
          <dd className="font-semibold text-[#26313b]">
            {dictionary.result.extractionTypes[coverage.extraction_type]}
          </dd>
        </div>
      </dl>
    </section>
  );
}
