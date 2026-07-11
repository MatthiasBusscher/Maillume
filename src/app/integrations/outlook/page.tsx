import type { Metadata } from "next";
import Script from "next/script";

import { OutlookIntegration } from "@/components/outlook-integration";
import { accountEn } from "@/lib/i18n/account-en";
import { accountNl } from "@/lib/i18n/account-nl";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = (await getRequestSiteLocale()) === "nl" ? accountNl : accountEn;
  return { title: dictionary.metadata.outlookTitle, robots: { index: false, follow: false } };
}

export default async function OutlookIntegrationPage() {
  const locale = await getRequestSiteLocale();
  const dictionary = locale === "nl" ? accountNl : accountEn;
  return (
    <main className="min-h-screen bg-[#eef1eb]">
      <Script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" strategy="afterInteractive" />
      <OutlookIntegration labels={dictionary.outlook} locale={locale} />
    </main>
  );
}
