import type { Metadata } from "next";
import Link from "next/link";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { trustPrivacyCopy } from "@/lib/i18n/trust-privacy";
import { getPublicBetaOperatorProfile } from "@/lib/operator";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return trustPrivacyCopy[await getRequestSiteLocale()].metadata;
}

export default async function PrivacyPage() {
  const locale = await getRequestSiteLocale();
  const copy = trustPrivacyCopy[locale];
  const sections = copy.sections;
  const operator = getPublicBetaOperatorProfile();

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
        <p>
          {locale === "nl" ? "Deze publieke beta wordt beheerd door " : "This public beta is operated by "}
          <strong>{operator.legalName}</strong>
          {operator.address ? <>{locale === "nl" ? ", gevestigd op " : ", registered at "}{operator.address}</> : null}.{" "}
          {locale === "nl" ? "KvK " : "Dutch Chamber of Commerce "}{operator.kvkNumber}; {locale === "nl" ? "btw-id " : "VAT ID "}{operator.vatId}.
        </p>
        <p>
          {locale === "nl" ? "Privacycontact: " : "Privacy contact: "}
          <a className="font-semibold text-[#087b72] underline" href={`mailto:${operator.privacyEmail}`}>{operator.privacyEmail}</a>.
        </p>
        <p>{sections.contact.linkPrefix} <Link href="/security" className="font-semibold text-[#087b72] underline">{sections.contact.linkText}</Link>, {sections.contact.linkSuffix}</p>
      </TrustSection>
    </TrustPage>
  );
}
