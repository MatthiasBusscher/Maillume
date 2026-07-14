"use client";

import { AlertTriangle, CheckCircle2, KeyRound, ScanSearch, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { EmailAnalysisResult } from "@/lib/types";
import type { AccountDictionary } from "@/lib/i18n/account-en";
import type { SiteLocale } from "@/lib/i18n/site-locale";

type OfficeAsyncResult = { status: string; value?: string; error?: { message?: string } };
type OutlookItem = {
  body: { getAsync: (coercion: string, callback: (result: OfficeAsyncResult) => void) => void };
  from?: { emailAddress?: string };
  sender?: { emailAddress?: string };
  subject?: string;
};
type OfficeApi = {
  AsyncResultStatus: { Succeeded: string };
  CoercionType: { Text: string };
  context: { mailbox?: { item?: OutlookItem } };
  onReady: (callback: (info: { host?: string }) => void) => void;
};

declare global { interface Window { Office?: OfficeApi } }

export function OutlookIntegration({ labels, locale }: { labels: AccountDictionary["outlook"]; locale: SiteLocale }) {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string>(labels.connecting);
  const [result, setResult] = useState<EmailAnalysisResult>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setApiKey(window.sessionStorage.getItem("maillume-outlook-api-key") ?? "");
    let attempts = 0;
    const connect = () => {
      if (window.Office) {
        window.Office.onReady(() => {
          const hasMessage = Boolean(window.Office?.context.mailbox?.item);
          setReady(hasMessage);
          setStatus(hasMessage ? labels.ready : labels.openFromMessage);
        });
      } else if (attempts < 40) {
        attempts += 1;
        window.setTimeout(connect, 100);
      } else {
        setStatus(labels.initializationFailed);
      }
    };
    connect();
  }, [labels]);

  function saveKey() {
    if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(apiKey.trim())) return setStatus(labels.invalidKey);
    window.sessionStorage.setItem("maillume-outlook-api-key", apiKey.trim());
    setStatus(labels.keySaved);
  }

  function removeKey() {
    window.sessionStorage.removeItem("maillume-outlook-api-key");
    setApiKey("");
    setResult(undefined);
    setStatus(labels.keyRemoved);
  }

  async function analyzeMessage() {
    const office = window.Office;
    const item = office?.context.mailbox?.item;
    const key = apiKey.trim();
    if (!office || !item || !key) return setStatus(labels.configureFirst);

    setBusy(true); setResult(undefined); setStatus(labels.reading);
    try {
      const body = await new Promise<string>((resolve, reject) => {
        item.body.getAsync(office.CoercionType.Text, (response) => {
          if (response.status === office.AsyncResultStatus.Succeeded && typeof response.value === "string") resolve(response.value);
          else reject(new Error(response.error?.message || labels.readFailed));
        });
      });

      setStatus(labels.sending);
      const response = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "paste",
          subject: item.subject?.slice(0, 300),
          senderEmail: (item.from?.emailAddress ?? item.sender?.emailAddress)?.slice(0, 320),
          body: body.slice(0, 20000),
          locale,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || labels.analysisFailed);
      if (!isAnalysisResult(payload.result)) throw new Error(labels.invalidResponse);
      setResult(payload.result);
      setStatus(labels.complete);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.analysisFailed);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <header className="flex items-center gap-3 border border-[#111711] bg-[#111711] p-4 text-white">
        <span className="grid h-10 w-10 place-items-center border-2 border-[#dfff52] font-bold text-[#dfff52]">M</span>
        <div><h1 className="font-semibold">{labels.productTitle}</h1><p className="mt-1 font-mono text-[9px] uppercase text-[#bac4b8]">{labels.subtitle}</p></div>
      </header>

      <section className="border-x border-b border-[#aeb6ac] bg-white p-5">
        <p className="text-sm leading-6 text-[#59655a]">{labels.privacy}</p>
        <details className="mt-5 border-y border-[#d8dcd3] py-4">
          <summary className="cursor-pointer text-sm font-semibold"><KeyRound className="mr-2 inline h-4 w-4" /> {labels.apiKey}</summary>
          <div className="mt-4 flex flex-wrap gap-2"><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="mlm_..." aria-label={labels.apiKey} className="h-10 min-w-0 flex-1 border border-[#aeb6ac] px-3 text-sm" /><button type="button" onClick={saveKey} className="h-10 bg-[#111711] px-3 text-sm font-semibold text-white">{labels.save}</button><button type="button" onClick={removeKey} className="inline-flex h-10 items-center gap-2 border border-[#aeb6ac] px-3 text-sm font-semibold text-[#374238]"><Trash2 className="h-4 w-4" aria-hidden="true" />{labels.remove}</button></div>
        </details>
        <button type="button" onClick={analyzeMessage} disabled={!ready || !apiKey || busy} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#dfff52] px-4 text-sm font-bold text-[#111711] disabled:opacity-50"><ScanSearch className="h-4 w-4" /> {busy ? labels.analyzing : labels.analyze}</button>
        <p role="status" className="mt-3 min-h-6 text-xs leading-5 text-[#59655a]">{status}</p>
      </section>

      {result ? <section className="border-x border-b border-[#111711] bg-white p-5">
        <div className="flex items-end justify-between border-b border-[#aeb6ac] pb-4"><div><p className="font-mono text-[9px] uppercase text-[#687268]">{labels.riskScore}</p><p className="font-mono text-5xl font-semibold">{result.risk_score}</p></div><span className="border border-[#d84c3c] bg-[#ffe2dd] px-2 py-1 text-[10px] font-bold uppercase text-[#8f251b]">{labels.riskLevels[result.risk_level]}</span></div>
        <p className="mt-4 text-sm font-semibold text-[#111711]">{labels.classifications[result.classification]}</p>
        <p className="mt-4 text-sm leading-6 text-[#4f5b50]">{result.short_explanation}</p>
        <h2 className="mt-5 text-sm font-semibold">{labels.howScoreWorks}</h2>
        <p className="mt-2 text-xs leading-5 text-[#59655a]">{labels.scoreMeaning}</p>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-[#59655a]">{result.score_factors.map((factor) => <li key={factor.id}>{factor.label}: +{factor.contribution} {labels.points}</li>)}</ul>
        <h2 className="mt-5 text-sm font-semibold"><AlertTriangle className="mr-2 inline h-4 w-4 text-[#ff705f]" /> {labels.suspiciousSignals}</h2>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-[#59655a]">{result.suspicious_signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
        <h2 className="mt-5 text-sm font-semibold"><CheckCircle2 className="mr-2 inline h-4 w-4 text-[#087b72]" /> {labels.recommendedAction}</h2><p className="mt-2 text-xs leading-5 text-[#59655a]">{result.recommended_action}</p>
        <p className="mt-5 border-t border-[#aeb6ac] pt-4 text-[10px] leading-4 text-[#687268]">{labels.disclaimer}</p>
      </section> : null}
    </div>
  );
}

function isAnalysisResult(value: unknown): value is EmailAnalysisResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<EmailAnalysisResult>;
  return typeof result.risk_score === "number"
    && Number.isFinite(result.risk_score)
    && result.risk_score >= 0
    && result.risk_score <= 100
    && ["low", "medium", "high"].includes(result.risk_level ?? "")
    && ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"].includes(result.classification ?? "")
    && Array.isArray(result.score_factors)
    && result.score_factors.every((factor) => factor
      && typeof factor.id === "string"
      && ["identity", "destination", "intent", "delivery", "style"].includes(factor.family)
      && Number.isFinite(factor.contribution)
      && factor.contribution > 0
      && typeof factor.label === "string")
    && result.score_factors.reduce((total, factor) => total + factor.contribution, 0) === result.risk_score
    && Array.isArray(result.suspicious_signals) && result.suspicious_signals.every((signal) => typeof signal === "string")
    && Array.isArray(result.detected_links) && result.detected_links.every(isHttpUrl)
    && typeof result.short_explanation === "string"
    && typeof result.recommended_action === "string";
}

function isHttpUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
