"use client";

import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Info,
  Link2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
  type EmailAnalysisResult,
} from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { RiskMeter } from "./risk-meter";

const sampleEmail = `Hi,

Your Microsoft 365 account will be suspended today unless you verify your password immediately.

Open this secure link to keep access:
https://bit.ly/account-verify-now

Thank you,
IT Administrator`;

type EmailScanFormProps = {
  dictionary: Dictionary;
};

export function EmailScanForm({ dictionary }: EmailScanFormProps) {
  const [subject, setSubject] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "paste",
          subject,
          senderEmail,
          body,
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse | AnalyzeErrorResponse;

      if (!response.ok || "error" in payload) {
        setResult(null);
        setError(dictionary.form.analysisFailed);
        return;
      }

      setResult(payload.result);
    } catch {
      setResult(null);
      setError(dictionary.form.analysisFailed);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function loadSample() {
    setSubject("Action required: mailbox access expiring");
    setSenderEmail("security-alert@microsoft-support-login.click");
    setBody(sampleEmail);
    setResult(null);
    setError("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">
              {dictionary.form.eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {dictionary.form.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {dictionary.form.useSample}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {dictionary.form.subject}
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={dictionary.form.subjectPlaceholder}
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {dictionary.form.senderEmail}
            <input
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value)}
              placeholder={dictionary.form.senderPlaceholder}
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
          {dictionary.form.emailContent}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={dictionary.form.bodyPlaceholder}
            rows={13}
            required
            className="min-h-72 resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{dictionary.form.privacyNote}</p>
          <button
            type="submit"
            disabled={!body.trim() || isAnalyzing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAnalyzing ? (
              <>
                <ShieldCheck className="h-4 w-4 animate-pulse" aria-hidden="true" />
                {dictionary.form.analyzing}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                {dictionary.form.analyze}
              </>
            )}
          </button>
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        {result ? (
          <AnalysisResult dictionary={dictionary} result={result} />
        ) : (
          <EmptyResult dictionary={dictionary} />
        )}
      </section>
    </div>
  );
}

function EmptyResult({ dictionary }: { dictionary: Dictionary }) {
  return (
    <div className="flex h-full min-h-96 flex-col justify-between gap-8">
      <div>
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-950">{dictionary.empty.title}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
          {dictionary.empty.description}
        </p>
      </div>

      <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          {dictionary.empty.privacyTitle}
        </div>
        {dictionary.empty.privacyBody}
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {dictionary.result.disclaimer}
      </div>
    </div>
  );
}

function AnalysisResult({
  dictionary,
  result,
}: {
  dictionary: Dictionary;
  result: EmailAnalysisResult;
}) {
  return (
    <div className="space-y-6">
      <RiskMeter
        score={result.risk_score}
        level={result.risk_level}
        labels={{
          riskScore: dictionary.result.riskScore,
          levels: dictionary.result.levels,
        }}
      />

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Info className="h-4 w-4 text-sky-700" aria-hidden="true" />
          {dictionary.result.explanation}
        </div>
        <p className="text-sm leading-6 text-slate-600">{result.short_explanation}</p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          {dictionary.result.suspiciousSignals}
        </div>
        {result.suspicious_signals.length > 0 ? (
          <ul className="space-y-2">
            {result.suspicious_signals.map((signal) => (
              <li
                key={signal}
                className="flex gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700"
              >
                <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-sky-700" aria-hidden="true" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {dictionary.result.noSignals}
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Link2 className="h-4 w-4 text-sky-700" aria-hidden="true" />
          {dictionary.result.detectedLinks}
        </div>
        {result.detected_links.length > 0 ? (
          <ul className="space-y-2">
            {result.detected_links.map((link) => (
              <li
                key={link}
                className="break-all rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {link}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {dictionary.result.noLinks}
          </p>
        )}
      </div>

      <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-950">
          <ShieldCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
          {dictionary.result.recommendedAction}
        </div>
        <p className="text-sm leading-6 text-sky-900">{result.recommended_action}</p>
      </div>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-500">
        {dictionary.result.disclaimer}
      </p>
    </div>
  );
}
