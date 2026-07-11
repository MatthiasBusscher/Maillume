import type { Metadata } from "next";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { trustTermsCopy } from "@/lib/i18n/trust-terms";

export async function generateMetadata(): Promise<Metadata> {
  return trustTermsCopy[await getRequestSiteLocale()].metadata;
}

export default async function TermsPage() {
  const copy = trustTermsCopy[await getRequestSiteLocale()];
  const sections = copy.sections;
  return (
    <TrustPage eyebrow={copy.eyebrow} title={copy.title} description={copy.description} updatedLabel={copy.updatedLabel} updatedDate={copy.updatedDate}>
      <TrustSection title={sections.assessment.title}>{sections.assessment.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</TrustSection>
      <TrustSection title={sections.use.title}><TrustList items={[...sections.use.items]} /></TrustSection>
      <TrustSection title={sections.accounts.title}>{sections.accounts.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</TrustSection>
      <TrustSection title={sections.availability.title}><p>{sections.availability.paragraph}</p></TrustSection>
      <TrustSection title={sections.openSource.title}><p>{sections.openSource.paragraph}</p></TrustSection>
      <TrustSection title={sections.completion.title}><p>{sections.completion.paragraph}</p></TrustSection>
    </TrustPage>
  );
}
