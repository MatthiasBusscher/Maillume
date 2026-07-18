import type { Metadata } from "next";
import { ArrowRight, Check, Github, MailCheck, PlugZap, ShieldCheck } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SOURCE_REPOSITORY_URL } from "@/lib/site";
import { platformNl } from "@/lib/i18n/marketing-pages";
import { translateMarketingTree } from "@/lib/i18n/marketing-translate";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestSiteLocale(); return { title: "Platform", description: locale === "nl" ? "Bekijk wat beschikbaar is in de publieke Maillume-webbèta en wat later volgt." : "See what is available in the Maillume public web beta and what follows later." }; }

const roadmap = [
  { status: "Source beta", title: "Chrome extension", description: "The extension is available for source testing while capture behavior, permissions, and the Chrome Web Store submission are reviewed." },
  { status: "Later", title: "Hosted AI and paid plans", description: "Managed AI and paid plans remain unavailable until costs, privacy, abuse controls, billing, and real demand have been validated." },
];

export default async function PlatformPage() {
  const copy = (await getRequestSiteLocale()) === "nl" ? platformNl : {};
  return translateMarketingTree((
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />
      <PageIntro
        eyebrow="Maillume Platform"
        title="The web scanner comes first."
        description="The public beta starts with anonymous heuristic checks. Accounts are optional for managing revocable API keys; hosted AI and scan history remain off."
        actions={
          <>
            <a href="#today" className="inline-flex h-12 items-center gap-2 bg-[#dfff52] px-5 text-sm font-bold text-[#111711] hover:bg-white">See the beta boundary <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 border border-white/35 px-5 text-sm font-semibold text-white hover:border-white hover:bg-white/10"><Github className="h-4 w-4" aria-hidden="true" /> Follow development</a>
          </>
        }
      />

      <section className="border-b border-[#cbd0c5] bg-white py-20 sm:py-24" id="today">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">Current public beta</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">A focused check before you act.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
              Paste an email, use a screenshot, or open an exported .eml file. Maillume applies the same explainable, versioned risk index to each input and returns a practical next step.
            </p>
            <p className="mt-4 border-l-4 border-[#c78c32] bg-[#fff0cf] px-4 py-3 text-sm leading-6 text-[#714812]">
              Email and Google sign-in, TOTP protection, and quota-limited API keys are available. They never create scan history. Maintainer-hosted AI remains unavailable.
            </p>
            <ul className="mt-7 space-y-3">
              <PlatformCheck>Anonymous paste, screenshot, and .eml checks</PlatformCheck>
              <PlatformCheck>Heuristic analysis with no maintainer-owned provider key</PlatformCheck>
              <PlatformCheck>Optional accounts with TOTP and revocable API keys</PlatformCheck>
              <PlatformCheck>No scan history or retained source files</PlatformCheck>
              <PlatformCheck>Automated-assessment disclaimer in every result</PlatformCheck>
            </ul>
          </div>

          <div className="overflow-hidden border border-[#111711] bg-[#111711] text-white">
            <div className="flex h-11 items-center justify-between border-b border-white/20 px-4">
              <span className="font-mono text-[10px] uppercase text-[#dfff52]">Public beta boundary</span>
              <span className="font-mono text-[9px] text-[#849083]">web + API</span>
            </div>
            <dl className="divide-y divide-white/15 p-5 text-sm">
              <BetaBoundary label="Scanner" value="Available anonymously" />
              <BetaBoundary label="Analysis" value="Heuristic only" />
              <BetaBoundary label="Retention" value="No scan history" />
              <BetaBoundary label="Accounts and API" value="Optional" />
              <BetaBoundary label="Chrome extension" value="Source beta" />
            </dl>
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#087b72] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#dfff52]">A deliberate privacy boundary</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Nothing scans a mailbox in the background.</h2>
            </div>
            <p className="max-w-3xl text-xl leading-8 text-[#d2e6e2]">
              Maillume does not crawl a mailbox, silently score incoming email, or use a maintainer-owned AI key in the hosted beta. You choose the message, start the check, and receive an automated risk indicator rather than a guarantee.
            </p>
          </div>

          <div className="mt-14 grid border-y border-white/35 md:grid-cols-3 md:divide-x md:divide-white/25">
            <Principle icon={MailCheck} title="User initiated" description="No background mailbox harvesting or silent scanning." />
            <Principle icon={ShieldCheck} title="Explicit boundary" description="The public service accepts only the current web request and stores no scan history." />
            <Principle icon={PlugZap} title="Future integrations" description="Browser integration waits for web-beta validation and Chrome Web Store review." />
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#087b72]">What comes next</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#111711]">Add reach without weakening the boundary.</h2>
            </div>
            <div className="border-t border-[#aeb6ac]">
              {roadmap.map((item, index) => (
                <div key={item.title} className="grid gap-3 border-b border-[#cbd0c5] py-6 sm:grid-cols-[54px_120px_0.7fr_1fr] sm:items-start sm:gap-5">
                  <span className="font-mono text-[10px] text-[#5f695f]">0{index + 1}</span>
                  <span className="w-fit border border-[#111711] bg-[#eef1eb] px-2 py-1 font-mono text-[9px] uppercase text-[#374238]">{item.status}</span>
                  <h3 className="font-semibold text-[#111711]">{item.title}</h3>
                  <p className="text-sm leading-6 text-[#59655a]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#dfff52]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#59655a]">Follow the public beta</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-[#111711]">Early feedback should improve the web scanner before Maillume asks for more access.</h2>
          </div>
          <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 flex-none items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]"><Github className="h-4 w-4" aria-hidden="true" /> View the roadmap</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  ), copy);
}

function PlatformCheck({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-3 text-sm leading-6 text-[#4f5b50]"><Check className="mt-1 h-4 w-4 flex-none text-[#087b72]" aria-hidden="true" />{children}</li>;
}

function BetaBoundary({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[1fr_auto] gap-4 py-3 first:pt-0 last:pb-0"><dt className="text-[#b8c4b6]">{label}</dt><dd className="font-mono text-xs text-[#dfff52]">{value}</dd></div>;
}

function Principle({ description, icon: Icon, title }: { description: string; icon: typeof PlugZap; title: string }) {
  return <div className="py-7 md:px-6 first:pl-0 last:pr-0"><Icon className="h-5 w-5 text-[#dfff52]" aria-hidden="true" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#eaf5f2]">{description}</p></div>;
}
