import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  ClipboardPaste,
  DatabaseZap,
  FileText,
  ImageUp,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

import { MAX_SCAN_BODY_LENGTH, type WebScanSource } from "@/lib/types";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { EML_ACCEPT, SCREENSHOT_ACCEPT } from "@/lib/scan-limits";
import { UploadPanel } from "./upload-panel";

type ScanInputFormProps = {
  activeMode: WebScanSource;
  body: string;
  bodyIsTooLong: boolean;
  dictionary: Dictionary;
  error: string;
  fileName: string;
  fileStatus: string;
  inputLimitError: string;
  isAnalyzing: boolean;
  isExtracting: boolean;
  locale: Locale;
  maxRequestBytes: number;
  onBodyChange: (body: string) => void;
  onEmlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSample: () => void;
  onScreenshotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSenderEmailChange: (senderEmail: string) => void;
  onSubjectChange: (subject: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchMode: (mode: WebScanSource) => void;
  requestIsTooLarge: boolean;
  requestSize: number;
  senderEmail: string;
  subject: string;
};

export function ScanInputForm({
  activeMode,
  body,
  bodyIsTooLong,
  dictionary,
  error,
  fileName,
  fileStatus,
  inputLimitError,
  isAnalyzing,
  isExtracting,
  locale,
  maxRequestBytes,
  onBodyChange,
  onEmlChange,
  onLoadSample,
  onScreenshotChange,
  onSenderEmailChange,
  onSubjectChange,
  onSubmit,
  onSwitchMode,
  requestIsTooLarge,
  requestSize,
  senderEmail,
  subject,
}: ScanInputFormProps) {
  return (
    <form onSubmit={onSubmit} className="min-w-0 border-b border-[#aeb6bf] p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-[#d5d9de] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase text-[#087b72]">{dictionary.form.eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111711] sm:text-2xl">{dictionary.form.title}</h2>
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex h-9 items-center gap-2 border border-[#aeb6bf] bg-white px-3 text-sm font-semibold text-[#37414b] transition hover:border-[#111711] hover:bg-[#f2f4f5]"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {dictionary.form.useSample}
        </button>
      </div>

      <div className="mb-6">
        <p className="mb-2 font-mono text-[11px] uppercase text-[#58636e]">{dictionary.form.inputModeLabel}</p>
        <div
          role="group"
          aria-label={dictionary.form.inputModeLabel}
          className="grid grid-cols-3 divide-x divide-[#aeb6bf] border border-[#aeb6bf]"
        >
          <ModeButton
            active={activeMode === "paste"}
            icon={<ClipboardPaste className="h-4 w-4" aria-hidden="true" />}
            label={dictionary.form.modes.paste}
            onClick={() => onSwitchMode("paste")}
          />
          <ModeButton
            active={activeMode === "screenshot"}
            icon={<ImageUp className="h-4 w-4" aria-hidden="true" />}
            label={dictionary.form.modes.screenshot}
            onClick={() => onSwitchMode("screenshot")}
          />
          <ModeButton
            active={activeMode === "eml"}
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            label={dictionary.form.modes.eml}
            onClick={() => onSwitchMode("eml")}
          />
        </div>
      </div>

      {activeMode === "screenshot" ? (
        <UploadPanel
          accept={SCREENSHOT_ACCEPT}
          description={dictionary.form.screenshotHelp}
          dictionary={dictionary}
          disabled={isExtracting}
          fileName={fileName}
          fileStatus={fileStatus}
          icon={<ImageUp className="h-5 w-5" aria-hidden="true" />}
          label={dictionary.form.chooseScreenshot}
          onChange={onScreenshotChange}
          title={dictionary.form.screenshotPrompt}
        />
      ) : null}

      {activeMode === "eml" ? (
        <UploadPanel
          accept={EML_ACCEPT}
          description={dictionary.form.emlHelp}
          dictionary={dictionary}
          disabled={isExtracting}
          fileName={fileName}
          fileStatus={fileStatus}
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          label={dictionary.form.chooseEml}
          onChange={onEmlChange}
          title={dictionary.form.emlPrompt}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 font-mono text-[11px] uppercase text-[#58636e]">
          {dictionary.form.subject}
          <input
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            maxLength={300}
            placeholder={dictionary.form.subjectPlaceholder}
            className="h-11 border border-[#b7bec5] bg-[#fafbfb] px-3 font-sans text-sm normal-case text-[#111711] outline-none transition placeholder:text-[#99a2ab] focus:border-[#087b72] focus:ring-2 focus:ring-[#bdebf0]"
          />
        </label>

        <label className="grid gap-2 font-mono text-[11px] uppercase text-[#58636e]">
          {dictionary.form.senderEmail}
          <input
            value={senderEmail}
            onChange={(event) => onSenderEmailChange(event.target.value)}
            maxLength={320}
            placeholder={dictionary.form.senderPlaceholder}
            className="h-11 border border-[#b7bec5] bg-[#fafbfb] px-3 font-sans text-sm normal-case text-[#111711] outline-none transition placeholder:text-[#99a2ab] focus:border-[#087b72] focus:ring-2 focus:ring-[#bdebf0]"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2 font-mono text-[11px] uppercase text-[#58636e]">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>{dictionary.form.emailContent}</span>
          <span className={bodyIsTooLong ? "text-[#b2382b]" : "text-[#6a747e]"}>
            {body.length.toLocaleString(locale)} / {MAX_SCAN_BODY_LENGTH.toLocaleString(locale)} {dictionary.form.characters}
          </span>
        </span>
        <textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder={dictionary.form.bodyPlaceholder}
          rows={13}
          required
          readOnly={isExtracting}
          aria-invalid={Boolean(inputLimitError)}
          aria-describedby="scan-request-size"
          className="min-h-72 resize-y border border-[#b7bec5] bg-[#fafbfb] px-3 py-3 font-sans text-sm leading-6 normal-case text-[#111711] outline-none transition placeholder:text-[#99a2ab] focus:border-[#087b72] focus:ring-2 focus:ring-[#bdebf0]"
        />
      </label>

      <div
        id="scan-request-size"
        className={`mt-1 flex flex-wrap justify-between gap-2 font-mono text-[10px] uppercase ${
          requestIsTooLarge ? "text-[#b2382b]" : "text-[#6a747e]"
        }`}
      >
        <span>{dictionary.form.requestSize}</span>
        <span>{formatBytes(requestSize)} / {formatBytes(maxRequestBytes)}</span>
      </div>

      {error || inputLimitError ? (
        <div role="alert" className="mt-4 border-l-4 border-[#e84f3d] bg-[#fff1ef] px-4 py-3 text-sm leading-6 text-[#8f251b]">
          {error || inputLimitError}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 border-t border-[#d5d9de] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-[#5d6670]">
          <DatabaseZap className="mt-0.5 h-4 w-4 flex-none text-[#087b72]" aria-hidden="true" />
          <span>{dictionary.form.privacyNote}</span>
        </p>
        <button
          type="submit"
          disabled={!body.trim() || isAnalyzing || isExtracting || Boolean(inputLimitError)}
          className="inline-flex h-11 min-w-40 flex-none items-center justify-center gap-2 whitespace-nowrap border-l-4 border-[#dfff52] bg-[#111711] px-4 text-sm font-semibold text-white transition hover:bg-[#087b72] disabled:cursor-not-allowed disabled:border-[#cbd1d6] disabled:bg-[#cbd1d6] disabled:text-[#77818b]"
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
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 px-1.5 py-2 text-center text-xs font-semibold leading-4 transition sm:gap-2 sm:px-3 sm:text-sm ${
        active
          ? "bg-[#111711] text-white shadow-[inset_0_3px_0_#dfff52]"
          : "bg-white text-[#4e5965] hover:bg-[#eef2f3] hover:text-[#111711]"
      }`}
      aria-pressed={active}
    >
      <span className="flex-none">{icon}</span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
    </button>
  );
}

function formatBytes(bytes: number): string {
  return `${Math.ceil(bytes / 1024)} KB`;
}
