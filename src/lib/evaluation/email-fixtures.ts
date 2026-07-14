import type { EmailAnalysisInput, RiskLevel } from "../types";

export type EvaluationCategory = "phishing" | "spam" | "legitimate";
export type EvaluationLanguage = "en" | "nl";

export type EvaluationFixture = {
  id: string;
  title: string;
  category: EvaluationCategory;
  language: EvaluationLanguage;
  input: EmailAnalysisInput;
  expectedRiskLevel: RiskLevel;
  minScore?: number;
  maxScore?: number;
  minSignals?: number;
  requiredSignalSnippets?: string[];
};

export const emailEvaluationFixtures: EvaluationFixture[] = [
  {
    id: "en_microsoft_credential_phish",
    title: "English credential phishing with brand impersonation and short link",
    category: "phishing",
    language: "en",
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
    requiredSignalSnippets: ["credentials", "account blocking", "shortened URL"],
  },
  {
    id: "nl_antivirus_subscription_phish",
    title: "Dutch antivirus subscription phishing with payment pressure",
    category: "phishing",
    language: "nl",
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
    requiredSignalSnippets: ["subscription expiry", "payment", "brand"],
  },
  {
    id: "eml_hidden_link_phish",
    title: "Hidden link phishing commonly surfaced by .eml parsing",
    category: "phishing",
    language: "en",
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
    minSignals: 4,
    requiredSignalSnippets: ["one domain", "known brand", "credentials"],
  },
  {
    id: "nl_delivery_fee_phish",
    title: "Dutch parcel delivery fee phishing",
    category: "phishing",
    language: "nl",
    input: {
      subject: "PostNL bezorging mislukt: betaling vereist",
      senderEmail: "service@postnl-betaal-check.top",
      body: [
        "Beste klant,",
        "Uw pakket staat in de wacht door ontbrekende betaalgegevens.",
        "Bevestig uw gegevens en voltooi de betaling binnen 24 uur om retourzending te voorkomen.",
        "Gebruik de knop: https://postnl-betaal-check.top/kosten",
      ].join("\n"),
    },
    expectedRiskLevel: "high",
    minScore: 70,
    minSignals: 5,
    requiredSignalSnippets: ["payment", "known brand", "external link"],
  },
  {
    id: "en_unsolicited_sales_spam",
    title: "Unsolicited sales outreach should be medium risk, not clean",
    category: "spam",
    language: "en",
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
    id: "nl_unsolicited_seo_spam",
    title: "Dutch unsolicited SEO outreach should be medium risk",
    category: "spam",
    language: "nl",
    input: {
      subject: "SEO voorstel voor uw website",
      senderEmail: "team@ranking-audit.example",
      body: [
        "Hallo,",
        "Wij kunnen met SEO en backlink campagnes snel extra qualified leads leveren.",
        "Bekijk het pakket: https://ranking-audit.example/voorstel",
      ].join("\n"),
    },
    expectedRiskLevel: "medium",
    minScore: 35,
    maxScore: 69,
    minSignals: 2,
    requiredSignalSnippets: ["sales or lead-generation"],
  },
  {
    id: "en_crypto_investment_spam",
    title: "Investment spam should not be treated as clean",
    category: "spam",
    language: "en",
    input: {
      subject: "New passive income investment opportunity",
      senderEmail: "returns@market-growth.example",
      body: [
        "Hello,",
        "This investment opportunity helps freelancers make money with bitcoin market signals.",
        "This limited time starter offer is available here: https://market-growth.example/start",
      ].join("\n"),
    },
    expectedRiskLevel: "medium",
    minScore: 35,
    maxScore: 69,
    minSignals: 2,
    requiredSignalSnippets: ["investment"],
  },
  {
    id: "en_legitimate_project_update",
    title: "Normal English project update should stay low risk",
    category: "legitimate",
    language: "en",
    input: {
      subject: "Project notes for Friday",
      senderEmail: "sam@design-studio.example",
      body: [
        "Hi Jordan,",
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
    category: "legitimate",
    language: "en",
    input: {
      subject: "Invoice INV-1042 from Bright Studio",
      senderEmail: "billing@bright-studio.example",
      body: [
        "Hi Jordan,",
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
    category: "legitimate",
    language: "nl",
    input: {
      subject: "Aantekeningen overleg website",
      senderEmail: "lotte@bureau.example",
      body: [
        "Hoi Sam,",
        "Dank voor het overleg van vanmiddag. Ik heb de taken verdeeld en stuur morgen",
        "de bijgewerkte planning voor de homepage door.",
      ].join("\n"),
    },
    expectedRiskLevel: "low",
    maxScore: 34,
  },
  {
    id: "nl_legitimate_invoice_notice",
    title: "Normal Dutch invoice notice should stay low risk",
    category: "legitimate",
    language: "nl",
    input: {
      subject: "Factuur voor projectwerk juni",
      senderEmail: "administratie@bureau.example",
      body: [
        "Hoi Sam,",
        "De factuur voor het projectwerk van juni staat klaar in het klantportaal.",
        "Je kunt hem bekijken via https://portal.bureau.example/facturen/1042.",
        "Dank voor de fijne samenwerking.",
      ].join("\n"),
    },
    expectedRiskLevel: "low",
    maxScore: 34,
  },
];
