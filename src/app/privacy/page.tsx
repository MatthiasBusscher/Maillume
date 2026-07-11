import type { Metadata } from "next";
import Link from "next/link";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How the Maillume public beta processes email scans, feedback, and account data.",
};

export default function PrivacyPage() {
  return (
    <TrustPage
      eyebrow="Trust center"
      title="Privacy notice"
      description="Maillume is designed to assess one email at a time without creating a history of the message or result. This notice describes the official public-beta data flow; self-hosted operators are responsible for their own deployment notices."
    >
      <TrustSection title="Email assessments">
        <p>The official scanner processes the subject, sender address, and normalized message text only to produce the requested assessment.</p>
        <TrustList items={[
          "The application does not write email text, sender details, screenshots, .eml files, detected links, or completed results to a scan database.",
          "Screenshot OCR and .eml parsing run in the browser before normalized text is submitted.",
          "Analysis and feedback routes send Cache-Control: no-store responses and do not log request bodies in application code.",
          "The public beta uses local heuristic analysis and does not send scan text to an AI model provider.",
        ]} />
      </TrustSection>

      <TrustSection title="Optional feedback">
        <p>If feedback is enabled and you choose to submit it, Maillume receives only your selected accuracy label, expected classification, high-level signal categories, language, input mode, analyzer version, and score band.</p>
        <p>Feedback excludes email text, sender, subject, links, attachments, screenshots, and .eml files. Detailed feedback records are configured to expire after no more than 90 days.</p>
      </TrustSection>

      <TrustSection title="Optional accounts">
        <p>Google sign-in is optional and is provided through Supabase when enabled. The account may include your email address, display name, provider identifier, session cookies, and basic authentication metadata.</p>
        <p>Signing in does not create scan history. Authentication cookies are used to maintain the signed-in session. When production authentication is enabled, the account page provides confirmation-gated deletion of the Supabase identity.</p>
      </TrustSection>

      <TrustSection title="Service providers">
        <p>The official deployment may use Hostinger for application hosting, Cloudflare for DNS, protected ingress, and abuse prevention, Supabase for authentication and non-content feedback, GitHub for source development and releases, and a privacy-configured monitoring service for operational errors.</p>
        <p>If the hosted service enables an external AI provider in the future, normalized message text will be sent to that configured provider for the requested assessment. The provider and its processing terms must be disclosed before that mode is enabled.</p>
        <p>Production monitoring must exclude scan and feedback payloads. A provider is only active when it has been configured for the deployed service.</p>
      </TrustSection>

      <TrustSection title="Open source and self-hosting">
        <p>Anyone can run a separate Maillume deployment. Those operators choose their own infrastructure, analytics, authentication, AI providers, and retention settings. Their privacy practices may differ from the official service.</p>
      </TrustSection>

      <TrustSection title="Contact and launch status">
        <p>This is a public-beta technical notice. The final production notice must add the operator&apos;s legal identity, privacy contact, jurisdiction, and verified processor retention terms before launch.</p>
        <p>Security issues should be reported through the process on the <Link href="/security" className="font-semibold text-[#087b72] underline">security page</Link>, never through a public issue containing private email data.</p>
      </TrustSection>
    </TrustPage>
  );
}
