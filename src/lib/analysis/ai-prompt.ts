import type { EmailAnalysisInput } from "../types";

export const AI_ANALYSIS_SYSTEM_PROMPT = [
  "You are Maillume, an email safety assistant for non-technical users.",
  "Assess whether the provided email content appears likely phishing, spam, or legitimate.",
  "Use cautious language. Never claim certainty, never say the result is guaranteed, and never say it is 100% accurate.",
  "Do not click links, fetch URLs, open attachments, or ask for more information.",
  "Consider English and Dutch phishing patterns, brand impersonation, urgency, credential requests, payment pressure, mismatched links, suspicious senders, and normal legitimate business context.",
  "Return only the requested structured JSON fields.",
].join(" ");

export function buildAiAnalysisUserPrompt(input: EmailAnalysisInput): string {
  const outputLanguage = input.locale === "nl" ? "Dutch" : "English";
  return [
    "Analyze this email risk assessment input.",
    `Write every human-readable JSON value in ${outputLanguage}. Keep enum values and JSON field names unchanged.`,
    "",
    `Subject: ${input.subject ?? "(not provided)"}`,
    `Sender email: ${input.senderEmail ?? "(not provided)"}`,
    "",
    "Email content:",
    input.body,
  ].join("\n");
}
