import type { Metadata } from "next";

import { TrustList, TrustPage, TrustSection } from "@/components/trust-page";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { trustSecurityCopy } from "@/lib/i18n/trust-security";
import { SOURCE_REPOSITORY_URL } from "@/lib/site";
import { getPublicBetaOperatorProfile } from "@/lib/operator";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return trustSecurityCopy[await getRequestSiteLocale()].metadata;
}

export default async function SecurityPage() {
  const locale = await getRequestSiteLocale();
  const copy = trustSecurityCopy[locale];
  const sections = copy.sections;
  const operator = getPublicBetaOperatorProfile();
  return (
    <TrustPage eyebrow={copy.eyebrow} title={copy.title} description={copy.description} updatedLabel={copy.updatedLabel} updatedDate={copy.updatedDate}>
      <TrustSection title={sections.report.title}>
        <p>{sections.report.warning}</p>
        <p>{sections.report.prefix} <a href={`${SOURCE_REPOSITORY_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer" className="font-semibold text-[#087b72] underline">{sections.report.linkText}</a>. {sections.report.suffix} <a href={`mailto:${operator.securityEmail}`} className="font-semibold text-[#087b72] underline">{operator.securityEmail}</a>.</p>
      </TrustSection>
      <TrustSection title={sections.boundaries.title}><TrustList items={[...sections.boundaries.items]} /></TrustSection>
      <TrustSection title={sections.testing.title}><p>{sections.testing.paragraph}</p></TrustSection>
      <TrustSection title={sections.version.title}><p>{sections.version.paragraph}</p></TrustSection>
    </TrustPage>
  );
}
