import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getAnalyticsConfig } from "@/lib/analytics";
import { getRequestPathname, getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";

const title = "Maillume";
const pageTitles = {
  en: "Maillume — Explainable email risk checks",
  nl: "Maillume — Uitlegbare controle van e-mailrisico",
};
const descriptions = {
  en: "Shine a light on suspicious email with an explainable risk score, warning signals, and a safer next step.",
  nl: "Werpt licht op verdachte e-mail met een uitlegbare risicoscore, waarschuwingssignalen en een veiligere vervolgstap.",
};

export async function generateMetadata(): Promise<Metadata> {
  const [locale, pathname] = await Promise.all([getRequestSiteLocale(), getRequestPathname()]);
  const description = descriptions[locale];
  const pageTitle = pageTitles[locale];
  const cleanPath = localizePath(pathname, "en");
  const localizedPath = localizePath(cleanPath, locale);
  return {
    metadataBase: getMetadataBase(),
  title: {
    default: pageTitle,
    template: `%s | ${title}`,
  },
  description,
  applicationName: title,
  keywords: ["email safety", "phishing", "spam", "email risk assessment", "open source"],
  openGraph: {
    title: pageTitle,
    description,
    url: localizedPath,
    type: "website",
    locale: locale === "nl" ? "nl_NL" : "en_US",
    alternateLocale: [locale === "nl" ? "en_US" : "nl_NL"],
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: localizedPath,
    languages: { en: cleanPath, nl: localizePath(cleanPath, "nl"), "x-default": cleanPath },
  },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestSiteLocale();
  const analytics = getAnalyticsConfig();
  const nonce = analytics ? (await headers()).get("x-nonce") ?? undefined : undefined;

  return (
    <html lang={locale}>
      <body className="antialiased">
        {children}
        {analytics ? (
          // Cookieless page views only. Query strings and hashes are never sent, and Do Not Track is respected.
          <script
            async
            src={analytics.scriptUrl}
            nonce={nonce}
            data-website-id={analytics.websiteId}
            data-exclude-search="true"
            data-exclude-hash="true"
            data-do-not-track="true"
          />
        ) : null}
      </body>
    </html>
  );
}

function getMetadataBase(): URL {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  const configuredUrl = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();

  return new URL(
    configuredUrl || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000"),
  );
}
