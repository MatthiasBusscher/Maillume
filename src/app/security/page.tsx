import type { Metadata } from "next";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";
import { SOURCE_REPOSITORY_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "Security reporting and data-handling guidance for Maillume.",
};

export default function SecurityPage() {
  return (
    <TrustPage
      eyebrow="Trust center"
      title="Security"
      description="Maillume handles content people already consider suspicious. Security reports should protect that content, use synthetic reproduction data, and follow coordinated disclosure."
    >
      <TrustSection title="Report a vulnerability">
        <p>Do not open a public issue with a vulnerability, credential, private email, screenshot, or raw .eml file.</p>
        <p>Follow the private reporting instructions in the repository&apos;s <a href={`${SOURCE_REPOSITORY_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer" className="font-semibold text-[#087b72] underline">SECURITY.md</a>. If private GitHub reporting is unavailable, use the security contact published with the production domain.</p>
      </TrustSection>

      <TrustSection title="Security boundaries">
        <TrustList items={[
          "Provider and Supabase secret keys are server-only and must never use a NEXT_PUBLIC_ prefix.",
          "Uploaded screenshot and .eml files are parsed in the browser rather than uploaded as source files.",
          "Analysis inputs are size-limited and validated before processing.",
          "Public traffic reaches the production container through a protected Cloudflare Tunnel rather than an exposed web port.",
          "Application and edge rate limits reject abusive analysis traffic before provider invocation.",
          "Analysis and feedback responses use no-store caching behavior.",
          "Optional feedback uses an allowlist that rejects email-content fields.",
          "Integration API keys are shown once and stored only as SHA-256 hashes with revocable, atomic quotas.",
          "Gmail uses temporary current-message scope, Outlook uses ReadItem, and the browser extension uses activeTab selection access.",
          "Public hosted analysis remains heuristic-only until explicit AI privacy and cost gates pass.",
        ]} />
      </TrustSection>

      <TrustSection title="Safe testing">
        <p>Use invented identities, reserved domains such as `.example` or `.test`, and non-functional links. Do not test with a third party&apos;s inbox, account, or infrastructure without authorization.</p>
      </TrustSection>

      <TrustSection title="Supported version">
        <p>Security fixes target the latest version on the main branch and the current public-beta release. Self-hosted operators are responsible for applying updates to their deployments.</p>
      </TrustSection>
    </TrustPage>
  );
}
