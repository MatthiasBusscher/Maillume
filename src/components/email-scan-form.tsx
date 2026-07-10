"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ClipboardPaste,
  DatabaseZap,
  FileText,
  ImageUp,
  Info,
  Link2,
  Mail,
  ScanLine,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
  type EmailAnalysisResult,
  type ScanSource,
} from "@/lib/types";
import { parseEml } from "@/lib/eml/parse-eml";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { extractTextFromImage } from "@/lib/ocr/extract-text";
import {
  EML_ACCEPT,
  isSupportedEmlFile,
  isSupportedScreenshotFile,
  isWithinFileSizeLimit,
  MAX_EML_SIZE_BYTES,
  MAX_SCREENSHOT_SIZE_BYTES,
  SCREENSHOT_ACCEPT,
} from "@/lib/scan-limits";
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
  const [activeMode, setActiveMode] = useState<ScanSource>("paste");
  const [subject, setSubject] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileStatus, setFileStatus] = useState("");

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
          source: activeMode,
          subject,
          senderEmail,
          body,
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse | AnalyzeErrorResponse;

      if (!response.ok || "error" in payload) {
        setResult(null);
        setError(getAnalysisErrorMessage(response.status, dictionary));
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
    setActiveMode("paste");
    setSubject("Action required: mailbox access expiring");
    setSenderEmail("security-alert@microsoft-support-login.click");
    setBody(sampleEmail);
    setResult(null);
    setError("");
    setFileName("");
    setFileStatus("");
  }

  function switchMode(mode: ScanSource) {
    setActiveMode(mode);
    setSubject("");
    setSenderEmail("");
    setBody("");
    setResult(null);
    setError("");
    setFileName("");
    setFileStatus("");
  }

  async function handleScreenshotChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setActiveMode("screenshot");
    setResult(null);
    setError("");
    setFileName(file.name);
    setFileStatus("");

    if (!isSupportedScreenshotFile(file)) {
      setError(dictionary.form.unsupportedFile);
      return;
    }

    if (!isWithinFileSizeLimit(file, MAX_SCREENSHOT_SIZE_BYTES)) {
      setError(dictionary.form.fileTooLarge);
      return;
    }

    setIsExtracting(true);
    setFileStatus(dictionary.form.extracting);

    try {
      const extractedText = await extractTextFromImage(file);

      if (!extractedText) {
        setError(dictionary.form.noTextFound);
        setFileStatus("");
        return;
      }

      setSubject(file.name.replace(/\.[^.]+$/, ""));
      setSenderEmail("");
      setBody(extractedText);
      setFileStatus(dictionary.form.extractedTextReady);
    } catch {
      setError(dictionary.form.extractionFailed);
      setFileStatus("");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleEmlChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setActiveMode("eml");
    setResult(null);
    setError("");
    setFileName(file.name);
    setFileStatus("");

    if (!isSupportedEmlFile(file)) {
      setError(dictionary.form.unsupportedFile);
      return;
    }

    if (!isWithinFileSizeLimit(file, MAX_EML_SIZE_BYTES)) {
      setError(dictionary.form.fileTooLarge);
      return;
    }

    setIsExtracting(true);
    setFileStatus(dictionary.form.parsing);

    try {
      const rawEml = await file.text();
      const parsed = parseEml(rawEml);

      if (!parsed.body) {
        setError(dictionary.form.noTextFound);
        setFileStatus("");
        return;
      }

      setSubject(parsed.subject ?? file.name.replace(/\.eml$/i, ""));
      setSenderEmail(parsed.senderEmail ?? "");
      setBody(parsed.body);
      setFileStatus(dictionary.form.parsedEmlReady);
    } catch {
      setError(dictionary.form.extractionFailed);
      setFileStatus("");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="overflow-hidden border border-[#aeb6bf] bg-white lg:grid lg:grid-cols-[minmax(0,1.06fr)_minmax(390px,0.94fr)]">
      <form
        onSubmit={handleSubmit}
        className="min-w-0 border-b border-[#aeb6bf] p-5 sm:p-7 lg:border-b-0 lg:border-r"
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#d5d9de] pb-5">
          <div className="flex items-start gap-3">
            <span
              className="flex h-8 w-8 flex-none items-center justify-center bg-[#d8ff3e] font-mono text-xs font-bold text-[#171a1f]"
              aria-hidden="true"
            >
              01
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase text-[#087b87]">
                {dictionary.form.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#171a1f] sm:text-2xl">
                {dictionary.form.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex h-9 items-center gap-2 border border-[#aeb6bf] bg-white px-3 text-sm font-semibold text-[#37414b] transition hover:border-[#171a1f] hover:bg-[#f2f4f5]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {dictionary.form.useSample}
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-2 font-mono text-[11px] uppercase text-[#58636e]">
            {dictionary.form.inputModeLabel}
          </p>
          <div
            role="group"
            aria-label={dictionary.form.inputModeLabel}
            className="grid grid-cols-3 divide-x divide-[#aeb6bf] border border-[#aeb6bf]"
          >
            <ModeButton
              active={activeMode === "paste"}
              icon={<ClipboardPaste className="h-4 w-4" aria-hidden="true" />}
              label={dictionary.form.modes.paste}
              onClick={() => switchMode("paste")}
            />
            <ModeButton
              active={activeMode === "screenshot"}
              icon={<ImageUp className="h-4 w-4" aria-hidden="true" />}
              label={dictionary.form.modes.screenshot}
              onClick={() => switchMode("screenshot")}
            />
            <ModeButton
              active={activeMode === "eml"}
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              label={dictionary.form.modes.eml}
              onClick={() => switchMode("eml")}
            />
          </div>
        </div>

        {activeMode === "screenshot" ? (
          <UploadPanel
            accept={SCREENSHOT_ACCEPT}
            description={dictionary.form.screenshotHelp}
            fileName={fileName}
            fileStatus={fileStatus}
            icon={<ImageUp className="h-5 w-5" aria-hidden="true" />}
            label={dictionary.form.chooseScreenshot}
            onChange={handleScreenshotChange}
            title={dictionary.form.screenshotPrompt}
            dictionary={dictionary}
          />
        ) : null}

        {activeMode === "eml" ? (
          <UploadPanel
            accept={EML_ACCEPT}
            description={dictionary.form.emlHelp}
            fileName={fileName}
            fileStatus={fileStatus}
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            label={dictionary.form.chooseEml}
            onChange={handleEmlChange}
            title={dictionary.form.emlPrompt}
            dictionary={dictionary}
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 font-mono text-[11px] uppercase text-[#58636e]">
            {dictionary.form.subject}
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={dictionary.form.subjectPlaceholder}
              className="h-11 border border-[#b7bec5] bg-[#fafbfb] px-3 font-sans text-sm normal-case text-[#171a1f] outline-none transition placeholder:text-[#99a2ab] focus:border-[#087b87] focus:ring-2 focus:ring-[#bdebf0]"
            />
          </label>

          <label className="grid gap-2 font-mono text-[11px] uppercase text-[#58636e]">
            {dictionary.form.senderEmail}
            <input
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value)}
              placeholder={dictionary.form.senderPlaceholder}
              className="h-11 border border-[#b7bec5] bg-[#fafbfb] px-3 font-sans text-sm normal-case text-[#171a1f] outline-none transition placeholder:text-[#99a2ab] focus:border-[#087b87] focus:ring-2 focus:ring-[#bdebf0]"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-2 font-mono text-[11px] uppercase text-[#58636e]">
          {dictionary.form.emailContent}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={dictionary.form.bodyPlaceholder}
            rows={13}
            required
            readOnly={isExtracting}
            className="min-h-72 resize-y border border-[#b7bec5] bg-[#fafbfb] px-3 py-3 font-sans text-sm leading-6 normal-case text-[#171a1f] outline-none transition placeholder:text-[#99a2ab] focus:border-[#087b87] focus:ring-2 focus:ring-[#bdebf0]"
          />
        </label>

        {error ? (
          <div
            role="alert"
            className="mt-4 border-l-4 border-[#e84f3d] bg-[#fff1ef] px-4 py-3 text-sm leading-6 text-[#8f251b]"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-4 border-t border-[#d5d9de] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-[#5d6670]">
            <DatabaseZap className="mt-0.5 h-4 w-4 flex-none text-[#087b87]" aria-hidden="true" />
            <span>{dictionary.form.privacyNote}</span>
          </p>
          <button
            type="submit"
            disabled={!body.trim() || isAnalyzing || isExtracting}
            className="inline-flex h-11 min-w-40 flex-none items-center justify-center gap-2 whitespace-nowrap border-l-4 border-[#d8ff3e] bg-[#171a1f] px-4 text-sm font-semibold text-white transition hover:bg-[#087b87] disabled:cursor-not-allowed disabled:border-[#cbd1d6] disabled:bg-[#cbd1d6] disabled:text-[#77818b]"
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

      <section
        aria-live="polite"
        aria-busy={isAnalyzing}
        className="min-w-0 bg-[#f7f8f9] p-5 sm:p-7"
      >
        {result ? (
          <AnalysisResult dictionary={dictionary} result={result} />
        ) : (
          <EmptyResult dictionary={dictionary} />
        )}
      </section>
    </div>
  );
}

function getAnalysisErrorMessage(status: number, dictionary: Dictionary): string {
  if (status === 429) {
    return dictionary.form.rateLimited;
  }

  if (status >= 500) {
    return dictionary.form.serviceUnavailable;
  }

  return dictionary.form.analysisFailed;
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-12 min-w-0 items-center justify-center gap-2 px-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
        active
          ? "bg-[#171a1f] text-white shadow-[inset_0_3px_0_#d8ff3e]"
          : "bg-white text-[#4e5965] hover:bg-[#eef2f3] hover:text-[#171a1f]"
      }`}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

function UploadPanel({
  accept,
  description,
  dictionary,
  fileName,
  fileStatus,
  icon,
  label,
  onChange,
  title,
}: {
  accept: string;
  description: string;
  dictionary: Dictionary;
  fileName: string;
  fileStatus: string;
  icon: ReactNode;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  title: string;
}) {
  return (
    <div className="mb-5 border border-dashed border-[#8c969f] bg-[#f3f6f6] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171a1f]">
            <span className="text-[#087b87]">{icon}</span>
            {title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[#4e5965]">{description}</p>
          <p className="mt-2 font-mono text-[10px] uppercase text-[#6a747e]">
            {dictionary.form.fileLimits}
          </p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center border border-[#171a1f] bg-white px-3 text-sm font-semibold text-[#171a1f] transition hover:bg-[#171a1f] hover:text-white">
          {label}
          <input className="sr-only" type="file" accept={accept} onChange={onChange} />
        </label>
      </div>

      {fileName ? (
        <div className="mt-3 border-l-4 border-[#087b87] bg-white px-3 py-2 text-sm text-[#26313b]">
          <span className="font-semibold">{dictionary.form.selectedFile}:</span> {fileName}
          {fileStatus ? <span className="mt-1 block text-[#087b87]">{fileStatus}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function EmptyResult({ dictionary }: { dictionary: Dictionary }) {
  return (
    <div className="flex h-full min-h-[34rem] flex-col">
      <div className="flex items-start gap-3 border-b border-[#d5d9de] pb-5">
        <span
          className="flex h-8 w-8 flex-none items-center justify-center bg-[#bdebf0] font-mono text-xs font-bold text-[#173b40]"
          aria-hidden="true"
        >
          02
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase text-[#087b87]">
            {dictionary.result.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#171a1f] sm:text-2xl">
            {dictionary.empty.title}
          </h2>
        </div>
      </div>

      <div className="border-b border-[#d5d9de] py-8">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#69737d]">
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

      <div className="my-6 border-l-4 border-[#087b87] bg-[#eaf6f5] px-4 py-4 text-sm leading-6 text-[#204e51]">
        <div className="mb-2 flex items-center gap-2 font-semibold text-[#173b40]">
          <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          {dictionary.empty.privacyTitle}
        </div>
        {dictionary.empty.privacyBody}
      </div>

      <div className="mt-auto border-t border-[#d5d9de] pt-4 text-xs leading-5 text-[#69737d]">
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
    <div>
      <div className="mb-6 flex items-start gap-3 border-b border-[#d5d9de] pb-5">
        <span
          className="flex h-8 w-8 flex-none items-center justify-center bg-[#bdebf0] font-mono text-xs font-bold text-[#173b40]"
          aria-hidden="true"
        >
          02
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase text-[#087b87]">
            {dictionary.result.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[#171a1f] sm:text-2xl">
            {dictionary.result.summaryTitle}
          </h2>
        </div>
      </div>

      <RiskMeter
        score={result.risk_score}
        level={result.risk_level}
        labels={{
          riskScore: dictionary.result.riskScore,
          levels: dictionary.result.levels,
        }}
      />

      <section className="border-b border-[#d5d9de] py-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#26313b]">
          <Info className="h-4 w-4 text-[#087b87]" aria-hidden="true" />
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
              <li
                key={signal}
                className="flex gap-3 px-3 py-3 text-sm leading-6 text-[#414c57]"
              >
                <span className="mt-2 h-2 w-2 flex-none bg-[#ff6b57]" aria-hidden="true" />
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
          <Link2 className="h-4 w-4 text-[#087b87]" aria-hidden="true" />
          {dictionary.result.detectedLinks}
        </h3>
        {result.detected_links.length > 0 ? (
          <ul className="divide-y divide-[#d5d9de] border-y border-[#d5d9de] bg-white">
            {result.detected_links.map((link) => (
              <li
                key={link}
                className="break-all px-3 py-3 font-mono text-xs leading-5 text-[#245b61]"
              >
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

      <section className="my-6 border-l-4 border-[#d8ff3e] bg-[#171a1f] px-4 py-5 text-white">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-[#d8ff3e]" aria-hidden="true" />
          {dictionary.result.recommendedAction}
        </h3>
        <p className="text-sm leading-6 text-[#d9dfe3]">{result.recommended_action}</p>
      </section>

      <p className="border-t border-[#d5d9de] pt-4 text-xs leading-5 text-[#69737d]">
        {dictionary.result.disclaimer}
      </p>
    </div>
  );
}
