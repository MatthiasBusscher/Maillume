import type { EmailAnalysisInput, RiskLevel } from "../types";

export type HeuristicCalibrationFixture = {
  id: string;
  title: string;
  input: EmailAnalysisInput;
  expectedRiskLevel: RiskLevel;
  minScore?: number;
  maxScore?: number;
  minSignals?: number;
  requiredSignalSnippets?: string[];
};

export const heuristicCalibrationFixtures: HeuristicCalibrationFixture[] = [
  {
    id: "en_microsoft_credential_phish",
    title: "English credential phishing with brand impersonation and short link",
    input: {
      subject: "URGENT: Microsoft account suspended",
      senderEmail: "security@microsoft-login-alert.top",
      body: [
        "Dear customer,",
        "Your Microsoft account has been suspended after multiple failed login attempts.",
        "Verify your password and 2FA immediately to restore access.",
        "Act now: https://bit.ly/secure-office-review",
      ].join("\n"),
    },
    expectedRiskLevel: "high",
    minScore: 70,
    minSignals: 5,
    requiredSignalSnippets: ["urgent language", "account credentials", "shortened URL"],
  },
  {
    id: "nl_antivirus_subscription_phish",
    title: "Dutch antivirus subscription phishing with payment pressure",
    input: {
      subject: "Laatste waarschuwing: uw McAfee abonnement verloopt vandaag",
      senderEmail: "service@mcafee-veiligheid-4096.xyz",
      body: [
        "Beste klant,",
        "Uw account is geblokkeerd totdat u de betaalmethode bijwerkt.",
        "Voltooi uw verlenging voor middernacht om uw beveiliging te garanderen.",
        "Er is 75% loyaliteitskorting toegepast. Klik hier: https://mcafee-veiligheid-check.xyz/betaal",
      ].join("\n"),
    },
    expectedRiskLevel: "high",
    minScore: 70,
    minSignals: 6,
    requiredSignalSnippets: ["subscription will expire", "fake security", "brand"],
  },
  {
    id: "eml_hidden_link_phish",
    title: "Hidden link phishing commonly surfaced by .eml parsing",
    input: {
      subject: "PayPal account update required",
      senderEmail: "alerts@paypal-service.click",
      body: [
        "Dear customer,",
        "We detected unusual activity. Verify your account today.",
        '<a href="https://paypa1-reset.click/session">https://paypal.com/security</a>',
      ].join("\n"),
    },
    expectedRiskLevel: "high",
    minScore: 70,
    minSignals: 5,
    requiredSignalSnippets: ["different domain", "known brand", "external links"],
  },
  {
    id: "en_unsolicited_sales_spam",
    title: "Unsolicited sales outreach should be medium risk, not clean",
    input: {
      subject: "Quick SEO proposal for your website",
      senderEmail: "alex@lead-growth.example",
      body: [
        "Hello,",
        "We can help your website rank higher on Google and increase qualified leads this month.",
        "Our web design and backlink package is available here: https://lead-growth.example/audit",
      ].join("\n"),
    },
    expectedRiskLevel: "medium",
    minScore: 35,
    maxScore: 69,
    minSignals: 2,
    requiredSignalSnippets: ["sales or lead-generation"],
  },
  {
    id: "en_legitimate_project_update",
    title: "Normal English project update should stay low risk",
    input: {
      subject: "Project notes for Friday",
      senderEmail: "sam@design-studio.example",
      body: [
        "Hi Matthias,",
        "Here are the notes from today's design review. I moved the export task to Friday",
        "and left comments on the pricing page copy. No action needed tonight.",
      ].join("\n"),
    },
    expectedRiskLevel: "low",
    maxScore: 34,
  },
  {
    id: "en_legitimate_invoice_notice",
    title: "A plain invoice notice from a normal sender should not jump to high risk",
    input: {
      subject: "Invoice INV-1042 from Bright Studio",
      senderEmail: "billing@bright-studio.example",
      body: [
        "Hi Matthias,",
        "Your invoice for the June design work is ready.",
        "You can review the invoice in the client portal: https://billing.bright-studio.example/invoices/1042",
        "Thanks again for the project.",
      ].join("\n"),
    },
    expectedRiskLevel: "low",
    maxScore: 34,
  },
  {
    id: "nl_legitimate_meeting_notes",
    title: "Normal Dutch meeting notes should stay low risk",
    input: {
      subject: "Aantekeningen overleg website",
      senderEmail: "lotte@bureau-example.nl",
      body: [
        "Hoi Matthias,",
        "Dank voor het overleg van vanmiddag. Ik heb de taken verdeeld en stuur morgen",
        "de bijgewerkte planning voor de homepage door.",
      ].join("\n"),
    },
    expectedRiskLevel: "low",
    maxScore: 34,
  },
];
