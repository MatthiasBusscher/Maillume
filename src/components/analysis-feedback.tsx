"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check, DatabaseZap, Send, ThumbsDown, ThumbsUp } from "lucide-react";

import {
  feedbackSignalCategories,
  type DetectionFeedbackErrorResponse,
  type DetectionFeedbackResponse,
  type FeedbackClassification,
  type FeedbackKind,
  type FeedbackSignalCategory,
} from "@/lib/feedback/types";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import type { RiskLevel, ScanSource } from "@/lib/types";

type AnalysisFeedbackProps = {
  analyzerVersion: string;
  dictionary: Dictionary;
  locale: Locale;
  scoreBand: RiskLevel;
  source: ScanSource;
};

const classifications: FeedbackClassification[] = [
  "phishing",
  "spam",
  "legitimate",
  "unsure",
];
const incorrectKinds: FeedbackKind[] = ["false_positive", "false_negative", "unsure"];

export function AnalysisFeedback({
  analyzerVersion,
  dictionary,
  locale,
  scoreBand,
  source,
}: AnalysisFeedbackProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [expectedClassification, setExpectedClassification] =
    useState<FeedbackClassification | null>(null);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind | null>(null);
  const [signalCategories, setSignalCategories] = useState<FeedbackSignalCategory[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");

  function chooseHelpfulness(value: boolean) {
    setHelpful(value);
    setFeedbackKind(value ? "accurate" : null);
    setStatus("idle");
    setError("");
  }

  function toggleCategory(category: FeedbackSignalCategory) {
    setSignalCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (helpful === null || !expectedClassification || !feedbackKind) {
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          helpful,
          expectedClassification,
          feedbackKind,
          locale,
          source,
          analyzerVersion,
          scoreBand,
          signalCategories,
        }),
      });
      const payload = (await response.json()) as
        | DetectionFeedbackResponse
        | DetectionFeedbackErrorResponse;

      if (!response.ok || "error" in payload) {
        setError(dictionary.feedback.error);
        setStatus("idle");
        return;
      }

      setStatus("success");
    } catch {
      setError(dictionary.feedback.error);
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <section
        className="border-t border-[#d5d9de] py-5"
        aria-live="polite"
        aria-labelledby="feedback-success-title"
      >
        <div className="border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-4 text-[#204e51]">
          <h3 id="feedback-success-title" className="flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4" aria-hidden="true" />
            {dictionary.feedback.successTitle}
          </h3>
          <p className="mt-2 text-sm leading-6">{dictionary.feedback.successBody}</p>
        </div>
      </section>
    );
  }

  const canSubmit = helpful !== null && expectedClassification !== null && feedbackKind !== null;

  return (
    <section className="border-t border-[#d5d9de] py-5" aria-labelledby="feedback-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase text-[#087b72]">
            {dictionary.feedback.eyebrow}
          </p>
          <h3 id="feedback-title" className="mt-1 text-base font-semibold text-[#26313b]">
            {dictionary.feedback.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#59646f]">{dictionary.feedback.question}</p>
        </div>
        <div
          role="group"
          aria-label={dictionary.feedback.question}
          className="grid w-full grid-cols-2 divide-x divide-[#aeb6bf] border border-[#aeb6bf] sm:w-auto"
        >
          <FeedbackChoice
            active={helpful === true}
            icon={<ThumbsUp className="h-4 w-4" aria-hidden="true" />}
            label={dictionary.feedback.helpful}
            onClick={() => chooseHelpfulness(true)}
          />
          <FeedbackChoice
            active={helpful === false}
            icon={<ThumbsDown className="h-4 w-4" aria-hidden="true" />}
            label={dictionary.feedback.notHelpful}
            onClick={() => chooseHelpfulness(false)}
          />
        </div>
      </div>

      {helpful !== null ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <fieldset>
            <legend className="font-mono text-[10px] uppercase text-[#58636e]">
              {dictionary.feedback.expectedLabel}
            </legend>
            <div className="mt-2 grid grid-cols-2 divide-x divide-y divide-[#aeb6bf] border border-[#aeb6bf] sm:grid-cols-4 sm:divide-y-0">
              {classifications.map((classification) => (
                <FeedbackChoice
                  key={classification}
                  active={expectedClassification === classification}
                  label={dictionary.feedback.classifications[classification]}
                  onClick={() => setExpectedClassification(classification)}
                />
              ))}
            </div>
          </fieldset>

          {!helpful ? (
            <fieldset>
              <legend className="font-mono text-[10px] uppercase text-[#58636e]">
                {dictionary.feedback.kindLabel}
              </legend>
              <div className="mt-2 grid divide-y divide-[#aeb6bf] border border-[#aeb6bf] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {incorrectKinds.map((kind) => (
                  <FeedbackChoice
                    key={kind}
                    active={feedbackKind === kind}
                    label={dictionary.feedback.kinds[kind]}
                    onClick={() => setFeedbackKind(kind)}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend className="font-mono text-[10px] uppercase text-[#58636e]">
              {dictionary.feedback.signalsLabel}
            </legend>
            <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {feedbackSignalCategories.map((category) => (
                <label
                  key={category}
                  className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-[#414c57]"
                >
                  <input
                    type="checkbox"
                    checked={signalCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 accent-[#087b72]"
                  />
                  {dictionary.feedback.categories[category]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-3 text-xs leading-5 text-[#315c60]">
            <p className="flex items-center gap-2 font-semibold text-[#173b40]">
              <DatabaseZap className="h-4 w-4" aria-hidden="true" />
              {dictionary.feedback.disclosureTitle}
            </p>
            <p className="mt-1">{dictionary.feedback.disclosure}</p>
          </div>

          {error ? (
            <p role="alert" className="border-l-4 border-[#e84f3d] bg-[#fff1ef] px-3 py-2 text-sm text-[#8f251b]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || status === "submitting"}
            className="inline-flex h-10 items-center gap-2 border border-[#111711] bg-[#111711] px-4 text-sm font-semibold text-white transition hover:bg-[#087b72] disabled:cursor-not-allowed disabled:border-[#cbd1d6] disabled:bg-[#cbd1d6] disabled:text-[#77818b]"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {status === "submitting" ? dictionary.feedback.submitting : dictionary.feedback.submit}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function FeedbackChoice({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 px-3 py-2 text-xs font-semibold leading-4 transition sm:text-sm ${
        active
          ? "bg-[#111711] text-white shadow-[inset_0_3px_0_#dfff52]"
          : "bg-white text-[#4e5965] hover:bg-[#eef2f3] hover:text-[#111711]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
