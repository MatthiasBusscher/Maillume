import type { Metadata } from "next";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Public-beta terms for the Maillume hosted email risk scanner.",
};

export default function TermsPage() {
  return (
    <TrustPage
      eyebrow="Trust center"
      title="Public-beta terms"
      description="These plain-language terms describe the current Maillume beta. They are not a substitute for the completed operator-specific terms required before a commercial launch."
    >
      <TrustSection title="Automated assessment">
        <p>Maillume provides an automated risk assessment based on available message text and technical patterns. It does not guarantee that an email is safe, malicious, authentic, or fraudulent.</p>
        <p>You remain responsible for deciding whether to click, reply, pay, disclose information, report a message, or contact the apparent sender through a trusted channel.</p>
      </TrustSection>

      <TrustSection title="Acceptable use">
        <TrustList items={[
          "Do not use Maillume to facilitate phishing, spam, fraud, harassment, malware delivery, or unauthorized access.",
          "Do not submit content you are not permitted to process.",
          "Do not attempt to bypass rate limits, overload the service, or probe other users' sessions.",
          "Use synthetic or fully sanitized examples in public issues and contributions.",
        ]} />
      </TrustSection>

      <TrustSection title="Accounts">
        <p>An account is not required for the free scanner. If you use Google sign-in, you are responsible for maintaining control of that Google account and for activity performed through your session. Production deployments must provide self-service deletion of the authentication identity.</p>
      </TrustSection>

      <TrustSection title="Availability and changes">
        <p>The beta may change, experience interruptions, enforce reasonable usage limits, or remove unfinished features. Maillume does not currently offer a service-level agreement.</p>
      </TrustSection>

      <TrustSection title="Open-source software">
        <p>The source code is provided under GNU AGPL-3.0-only and without warranty under the terms of that license. Self-hosted use is governed by the license and by the operator&apos;s own terms.</p>
      </TrustSection>

      <TrustSection title="Production completion">
        <p>Before public commercial launch, these terms must be completed with the operator&apos;s legal identity, governing law, liability terms, contact details, paid-plan terms, cancellation rights, and any consumer disclosures that apply.</p>
      </TrustSection>
    </TrustPage>
  );
}
