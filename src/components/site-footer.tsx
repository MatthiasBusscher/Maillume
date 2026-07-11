import Link from "next/link";
import { Github, Scale } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { getAppHref, LICENSE_URL, SOURCE_REPOSITORY_URL } from "@/lib/site";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";

export async function SiteFooter() {
  const locale = await getRequestSiteLocale();
  const nl = locale === "nl";
  const page = (path: string) => localizePath(path, locale);
  return (
    <footer className="border-t border-black bg-[#111711] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(120px,0.6fr))] lg:px-8">
        <div className="max-w-md">
          <BrandMark inverse />
          <p className="mt-5 text-sm leading-6 text-[#bac4b8]">
            {nl ? "Open-source e-mailrisicobeoordeling die signalen uitlegt en geen schijnzekerheid biedt." : "Open-source email risk assessment that explains the signals and keeps certainty in check."}
          </p>
          <p className="mt-5 font-mono text-[10px] uppercase text-[#849083]">
            {nl ? "Dit is een geautomatiseerde risicobeoordeling en biedt geen garantie." : "This is an automated risk assessment and should not be considered a guarantee."}
          </p>
        </div>

        <FooterColumn
          title="Product"
          links={[
            { href: getAppHref(), label: "Scanner", external: true },
            { href: page("/platform"), label: "Platform" },
            { href: page("/pricing"), label: nl ? "Prijzen" : "Pricing" },
            { href: page("/resources/odido-phishing-incident"), label: nl ? "Informatie" : "Resources" },
          ]}
        />
        <FooterColumn
          title="Open source"
          links={[
            { href: page("/self-hosted"), label: nl ? "In eigen beheer" : "Self-hosted" },
            { href: SOURCE_REPOSITORY_URL, label: "GitHub", external: true, newTab: true },
            { href: LICENSE_URL, label: "AGPL-3.0", external: true, newTab: true },
          ]}
        />
        <FooterColumn
          title={nl ? "Vertrouwen" : "Trust"}
          links={[
            { href: page("/privacy"), label: "Privacy" },
            { href: page("/terms"), label: nl ? "Voorwaarden" : "Terms" },
            { href: page("/security"), label: nl ? "Beveiliging" : "Security" },
          ]}
        />
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-5 text-xs text-[#8f9a8e] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>{nl ? "Copyright 2026 Maillume-bijdragers." : "Copyright 2026 Maillume contributors."}</p>
          <div className="flex items-center gap-4">
            <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white">
              <Github className="h-3.5 w-3.5" aria-hidden="true" /> {nl ? "Broncode" : "Source"}
            </a>
            <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white">
              <Scale className="h-3.5 w-3.5" aria-hidden="true" /> {nl ? "Licentie" : "License"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = {
  external?: boolean;
  href: string;
  label: string;
  newTab?: boolean;
};

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="font-mono text-[10px] uppercase text-[#dfff52]">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm text-[#bac4b8]">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            {link.external ? (
              <a href={link.href} className="hover:text-white" target={link.newTab ? "_blank" : undefined} rel={link.newTab ? "noreferrer" : undefined}>
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
