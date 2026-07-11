import type { Metadata } from "next";
import Link from "next/link";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { trustPrivacyCopy } from "@/lib/i18n/trust-privacy";

export async function generateMetadata(): Promise<Metadata> {
  return trustPrivacyCopy[await getRequestSiteLocale()].metadata;
}

export default async function PrivacyPage() {
  const copy = trustPrivacyCopy[await getRequestSiteLocale()];
  const sections = copy.sections;

  return (
    <TrustPage eyebrow={copy.eyebrow} title={copy.title} description={copy.description} updatedLabel={copy.updatedLabel} updatedDate={copy.updatedDate}>
      <TrustSection title={sections.assessments.title}>
        <p>{sections.assessments.intro}</p>
        <TrustList items={[...sections.assessments.items]} />
      </TrustSection>
      <TrustSection title={sections.feedback.title}>{sections.feedback.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</TrustSection>
      <TrustSection title={sections.accounts.title}>{sections.accounts.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</TrustSection>
      <TrustSection title={sections.integrations.title}>{sections.integrations.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</TrustSection>
      <TrustSection title={sections.providers.title}>{sections.providers.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</TrustSection>
      <TrustSection title={sections.selfHosting.title}><p>{sections.selfHosting.paragraph}</p></TrustSection>
      <TrustSection title={sections.contact.title}>
        <p>{sections.contact.intro}</p>
        <p>{sections.contact.linkPrefix} <Link href="/security" className="font-semibold text-[#087b72] underline">{sections.contact.linkText}</Link>, {sections.contact.linkSuffix}</p>
      </TrustSection>
    </TrustPage>
  );
}
