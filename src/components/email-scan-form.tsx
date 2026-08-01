"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import {
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
  type AttachmentRiskType,
  type EmailAnalysisResult,
  type EmailAuthenticationSummary,
  type EmailLinkPair,
  MAX_SCAN_BODY_LENGTH,
  type WebScanSource,
} from "@/lib/types";
import { parseEml } from "@/lib/eml/parse-eml";
import { isAnalyzeErrorResponse, isAnalyzeResponse } from "@/lib/analysis/result-schema";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { extractTextFromImage } from "@/lib/ocr/extract-text";
import { extractScreenshotEmailFields } from "@/lib/ocr/extract-email-fields";
import { extractQrHttpLinksFromImage } from "@/lib/qr/extract-qr-links";
import {
  getScreenshotDimensions,
  getSerializedRequestSize,
  hasSupportedScreenshotSignature,
  isSupportedEmlFile,
  isSupportedScreenshotFile,
  isWithinScreenshotDimensionLimit,
  isWithinFileSizeLimit,
  MAX_EML_SIZE_BYTES,
  MAX_SCREENSHOT_SIZE_BYTES,
} from "@/lib/scan-limits";
import { ScanInputForm } from "./email-scan/scan-input-form";
import { ResultPanel } from "./email-scan/scan-result";

const sampleEmails = {
  en: {
    subject: "Action required: mailbox access expiring",
    senderEmail: "security-alert@microsoft-support-login.click",
    body: `Hi,

Your Microsoft 365 account will be suspended today unless you verify your password immediately.

Open this secure link to keep access:
https://bit.ly/account-verify-now

Thank you,
IT Administrator`,
  },
  nl: {
    subject: "Actie vereist: toegang tot mailbox verloopt",
    senderEmail: "beveiligingsmelding@microsoft-ondersteuning-inloggen.click",
    body: `Hoi,

Je Microsoft 365-account wordt vandaag geblokkeerd tenzij je onmiddellijk je wachtwoord verifieert.

Open deze beveiligde link om toegang te behouden:
https://bit.ly/account-verificatie-nu

Bedankt,
IT-beheerder`,
  },
} as const;

type EmailScanFormProps = {
  dictionary: Dictionary;
  feedbackEnabled: boolean;
  locale: Locale;
  maxRequestBytes: number;
};

export function EmailScanForm({ dictionary, feedbackEnabled, locale, maxRequestBytes }: EmailScanFormProps) {
  const [activeMode, setActiveMode] = useState<WebScanSource>("paste");
  const [subject, setSubject] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [body, setBody] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [linkPairs, setLinkPairs] = useState<EmailLinkPair[]>([]);
  const [attachmentRiskTypes, setAttachmentRiskTypes] = useState<AttachmentRiskType[]>([]);
  const [emailAuthentication, setEmailAuthentication] = useState<EmailAuthenticationSummary>();
  const [evidenceTruncated, setEvidenceTruncated] = useState(false);
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [analysisVersion, setAnalysisVersion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileStatus, setFileStatus] = useState("");
  const resultPanelRef = useRef<HTMLElement>(null);
  const requestPayload = useMemo(
    () => ({
      source: activeMode,
      subject,
      senderEmail,
      body,
      locale,
      links,
      linkPairs,
      attachmentRiskTypes,
      // Only an .eml scan may carry authentication verdicts, so stale state from a
      // previous file can never travel with a pasted or screenshot message.
      ...(activeMode === "eml" && emailAuthentication ? { emailAuthentication } : {}),
      evidenceTruncated,
    }),
    [activeMode, attachmentRiskTypes, body, emailAuthentication, evidenceTruncated, linkPairs, links, locale, senderEmail, subject],
  );
  const requestSize = getSerializedRequestSize(requestPayload);
  const bodyIsTooLong = body.length > MAX_SCAN_BODY_LENGTH;
  const requestIsTooLarge = requestSize > maxRequestBytes;
  const inputLimitError = bodyIsTooLong
    ? dictionary.form.contentTooLong
    : requestIsTooLarge
      ? dictionary.form.requestTooLarge
      : "";

  useEffect(() => {
    if (!result || !window.matchMedia("(max-width: 1023px)").matches) return;

    resultPanelRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    if (inputLimitError) {
      setError(inputLimitError);
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const payload = await readAnalyzeResponse(response);

      if (!response.ok || !payload || "error" in payload) {
        setResult(null);
        setError(getAnalysisErrorMessage(response.status, dictionary));
        return;
      }

      setResult(payload.result);
      setAnalysisVersion(payload.analysis_version);
    } catch {
      setResult(null);
      setError(dictionary.form.analysisFailed);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function resetScanFields() {
    setSubject("");
    setSenderEmail("");
    setBody("");
    setLinks([]);
    setLinkPairs([]);
    setAttachmentRiskTypes([]);
    setEmailAuthentication(undefined);
    setEvidenceTruncated(false);
    setResult(null);
    setError("");
    setFileName("");
    setFileStatus("");
  }

  function loadSample() {
    const sample = sampleEmails[locale];
    setActiveMode("paste");
    setSubject(sample.subject);
    setSenderEmail(sample.senderEmail);
    setBody(sample.body);
    setLinks([]);
    setLinkPairs([]);
    setAttachmentRiskTypes([]);
    setEmailAuthentication(undefined);
    setEvidenceTruncated(false);
    setResult(null);
    setError("");
    setFileName("");
    setFileStatus("");
  }

  function switchMode(mode: WebScanSource) {
    setActiveMode(mode);
    resetScanFields();
  }

  function handleBodyChange(nextBody: string) {
    setBody(nextBody);
    setLinks([]);
    setLinkPairs([]);
  }

  async function handleScreenshotChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isExtracting) {
      return;
    }

    setActiveMode("screenshot");
    setLinks([]);
    setLinkPairs([]);
    setAttachmentRiskTypes([]);
    setEmailAuthentication(undefined);
    setEvidenceTruncated(false);
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
    if (!(await isSafeScreenshotForOcr(file))) {
      setError(dictionary.form.unsupportedFile);
      return;
    }

    setIsExtracting(true);
    setFileStatus(dictionary.form.extracting);

    try {
      const qrLinks = await extractQrHttpLinksFromImage(file).catch(() => []);
      const extractedText = await extractTextFromImage(file);
      if (!extractedText && qrLinks.length === 0) {
        setError(dictionary.form.noTextFound);
        setFileStatus("");
        return;
      }

      const extracted = extractScreenshotEmailFields(
        extractedText || (locale === "nl" ? "Er is een QR-code in de screenshot gevonden." : "A QR code was detected in the screenshot."),
      );
      setSubject(extracted.subject ?? "");
      setSenderEmail(extracted.senderEmail ?? "");
      setBody(extracted.body);
      setLinks(qrLinks);
      setLinkPairs([]);
      setAttachmentRiskTypes([]);
      setEmailAuthentication(undefined);
      setEvidenceTruncated(false);
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

    if (!file || isExtracting) {
      return;
    }

    setActiveMode("eml");
    setLinks([]);
    setLinkPairs([]);
    setAttachmentRiskTypes([]);
    setEmailAuthentication(undefined);
    setEvidenceTruncated(false);
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
      const rawEml = bytesToBinaryString(new Uint8Array(await file.arrayBuffer()));
      const parsed = parseEml(rawEml);
      if (!parsed.body) {
        setError(dictionary.form.noTextFound);
        setFileStatus("");
        return;
      }

      setSubject(parsed.subject ?? "");
      setSenderEmail(parsed.senderEmail ?? "");
      setBody(parsed.body);
      setLinks(parsed.links);
      setLinkPairs(parsed.linkPairs);
      setAttachmentRiskTypes(parsed.attachmentRiskTypes);
      setEmailAuthentication(parsed.emailAuthentication);
      setEvidenceTruncated(parsed.evidenceTruncated);
      setFileStatus(dictionary.form.parsedEmlReady);
    } catch {
      setError(dictionary.form.extractionFailed);
      setFileStatus("");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div data-testid="scanner-workspace" className="overflow-hidden border border-[#aeb6bf] bg-white shadow-[0_20px_55px_rgba(17,23,17,0.08)] lg:grid lg:grid-cols-[minmax(0,1.06fr)_minmax(400px,0.94fr)]">
      <ScanInputForm
        activeMode={activeMode}
        body={body}
        bodyIsTooLong={bodyIsTooLong}
        dictionary={dictionary}
        error={error}
        fileName={fileName}
        fileStatus={fileStatus}
        inputLimitError={inputLimitError}
        isAnalyzing={isAnalyzing}
        isExtracting={isExtracting}
        locale={locale}
        maxRequestBytes={maxRequestBytes}
        onBodyChange={handleBodyChange}
        onEmlChange={handleEmlChange}
        onLoadSample={loadSample}
        onScreenshotChange={handleScreenshotChange}
        onSenderEmailChange={setSenderEmail}
        onSubjectChange={setSubject}
        onSubmit={handleSubmit}
        onSwitchMode={switchMode}
        requestIsTooLarge={requestIsTooLarge}
        requestSize={requestSize}
        senderEmail={senderEmail}
        subject={subject}
      />

      <section
        ref={resultPanelRef}
        id="scan-result"
        aria-label={dictionary.result.title}
        aria-live="polite"
        aria-busy={isAnalyzing}
        className="min-w-0 scroll-mt-4 bg-[#f5f7f2] p-5 sm:p-7 lg:p-8"
      >
        <ResultPanel
          analysisVersion={analysisVersion}
          dictionary={dictionary}
          feedbackEnabled={feedbackEnabled}
          locale={locale}
          result={result}
          source={activeMode}
        />
      </section>
    </div>
  );
}

function bytesToBinaryString(bytes: Uint8Array): string {
  const chunkSize = 8_192;
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return result;
}

function getAnalysisErrorMessage(status: number, dictionary: Dictionary): string {
  if (status === 413) {
    return dictionary.form.requestTooLarge;
  }
  if (status === 429) {
    return dictionary.form.rateLimited;
  }
  if (status >= 500) {
    return dictionary.form.serviceUnavailable;
  }
  return dictionary.form.analysisFailed;
}

async function readAnalyzeResponse(response: Response): Promise<AnalyzeResponse | AnalyzeErrorResponse | null> {
  try {
    const payload: unknown = await response.json();
    return isAnalyzeResponse(payload) || isAnalyzeErrorResponse(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function isSafeScreenshotForOcr(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasSupportedScreenshotSignature(bytes, file)) {
    return false;
  }

  const dimensions = getScreenshotDimensions(bytes, file);
  if (!dimensions || !isWithinScreenshotDimensionLimit(dimensions.width, dimensions.height)) {
    return false;
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      return isWithinScreenshotDimensionLimit(bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } catch {
    return false;
  }
}
