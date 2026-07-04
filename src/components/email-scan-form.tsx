"use client";

import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

import { analyzeEmailMock } from "@/lib/mock-analysis";
import type { EmailAnalysisResult } from "@/lib/types";
import { RiskMeter } from "./risk-meter";

const sampleEmail = `Hi,

Your Microsoft 365 account will be suspended today unless you verify your password immediately.

Open this secure link to keep access:
https://bit.ly/account-verify-now

Thank you,
IT Administrator`;

export function EmailScanForm() {
  const [subject, setSubject] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    setIsAnalyzing(true);
    window.setTimeout(() => {
      setResult(analyzeEmailMock({ subject, senderEmail, body }));
      setIsAnalyzing(false);
    }, 420);
  }

  function loadSample() {
    setSubject("Action required: mailbox access expiring");
    setSenderEmail("security-alert@microsoft-support-login.click");
    setBody(sampleEmail);
    setResult(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">Email analysis</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Check a suspicious email</h2>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Use sample
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Action required"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Sender email
            <input
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value)}
              placeholder="sender@example.com"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
          Email content
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Paste the email body here."
            rows={13}
            required
            className="min-h-72 resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">This prototype uses local mocked analysis only.</p>
          <button
            type="submit"
            disabled={!body.trim() || isAnalyzing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAnalyzing ? (
              <>
                <ShieldCheck className="h-4 w-4 animate-pulse" aria-hidden="true" />
                Analyzing
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Analyze email
              </>
            )}
          </button>
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        {result ? (
          <AnalysisResult result={result} />
        ) : (
          <EmptyResult />
        )}
      </section>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="flex h-full min-h-96 flex-col justify-between gap-8">
      <div>
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-950">Assessment appears here</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
          Results will show risk level, risk score, suspicious signals, detected links, and a
          recommended next action.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        This is an automated risk assessment and should not be considered a guarantee.
      </div>
    </div>
  );
}

function AnalysisResult({ result }: { result: EmailAnalysisResult }) {
  return (
    <div className="space-y-6">
      <RiskMeter score={result.risk_score} level={result.risk_level} />

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Info className="h-4 w-4 text-sky-700" aria-hidden="true" />
          Explanation
        </div>
        <p className="text-sm leading-6 text-slate-600">{result.short_explanation}</p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          Suspicious signals
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
            No obvious suspicious signals were found by the prototype checks.
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Link2 className="h-4 w-4 text-sky-700" aria-hidden="true" />
          Detected links
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
            No links detected.
          </p>
        )}
      </div>

      <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-950">
          <ShieldCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
          Recommended action
        </div>
        <p className="text-sm leading-6 text-sky-900">{result.recommended_action}</p>
      </div>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-500">
        This is an automated risk assessment and should not be considered a guarantee.
      </p>
    </div>
  );
}

