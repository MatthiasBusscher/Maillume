import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Check,
  Database,
  Eye,
  FileSearch,
  Github,
  LockKeyhole,
  ScanSearch,
  ServerCog,
  ShieldQuestion,
} from "lucide-react";

import { ScannerPreview } from "@/components/scanner-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAppHref, SOURCE_REPOSITORY_URL } from "@/lib/site";
import { homeNl } from "@/lib/i18n/marketing-pages";
import { translateMarketingTree } from "@/lib/i18n/marketing-translate";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";

const capabilityRows = [
  {
    icon: FileSearch,
    label: "Three input options",
    title: "Check the message in front of you.",
    description:
      "Paste the text, read a screenshot, or open an exported .eml file. Source files stay in your browser; normalized text is sent once for the assessment and is not retained.",
  },
  {
    icon: Eye,
    label: "Explainable assessment",
    title: "See the evidence behind the score.",
    description:
      "Maillume shows the signals it found, how they affected the risk score, which links were detected, and what to do next.",
  },
  {
    icon: Database,
    label: "No scan history",
    title: "Processed for this check, not kept as history.",
    description:
      "Email text, sender details, links, screenshots, .eml files, and completed results are not written to application storage.",
  },
];

export default async function MarketingHomePage() {
  const appHref = getAppHref();
  const locale = await getRequestSiteLocale();
  const copy = locale === "nl" ? homeNl : {};

  return translateMarketingTree((
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-black bg-[#111711] text-white">
        <div className="pointer-events-none absolute inset-y-0 left-[8%] w-px bg-white/10" />
        <div className="pointer-events-none absolute inset-y-0 right-[13%] w-px bg-white/10" />
        <div className="pointer-events-none absolute inset-x-0 top-[30%] h-px bg-white/10" />
        <div className="pointer-events-none absolute -top-24 left-[42%] hidden h-[900px] w-[34%] -skew-x-12 border-x border-[#dfff52]/15 bg-[#dfff52]/[0.04] lg:block" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-7rem)] max-w-[1440px] gap-12 px-5 pb-0 pt-14 sm:px-6 sm:pt-16 lg:min-h-[660px] lg:grid-cols-[minmax(340px,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-12 lg:px-8 lg:py-16 xl:grid-cols-[minmax(420px,0.78fr)_minmax(0,1.22fr)] xl:gap-16">
          <div className="max-w-[680px] lg:max-w-[520px] lg:self-center">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase text-[#dfff52]">
              <span className="h-px w-8 bg-[#dfff52]" aria-hidden="true" />
              Shine a light on suspicious email
            </div>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl">
              See the risk before you act.
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={appHref}
                className="inline-flex h-12 items-center gap-2 bg-[#dfff52] px-5 text-sm font-bold text-[#111711] transition hover:bg-white"
              >
                Check an email
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={SOURCE_REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 border border-white/35 px-5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                View source
              </a>
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase leading-5 text-[#93a091]">
              Free built-in checks. No account required. No scan history.
            </p>
          </div>

          <div className="min-w-0 self-end lg:self-center">
            <ScannerPreview locale={locale} />
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-[#dfff52]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-[#111711]/25 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          <StatusItem icon={LockKeyhole} label="Uploaded files stay in your browser" />
          <StatusItem icon={ShieldQuestion} label="Signals you can inspect" />
          <StatusItem icon={Braces} label="AGPL-3.0 open source" />
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div>
              <p className="font-mono text-[11px] uppercase text-[#087b72]">A clearer risk assessment</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">
                Suspicious emails rarely look suspicious everywhere.
              </h2>
            </div>
            <p className="max-w-3xl text-xl leading-8 text-[#4f5b50] sm:text-2xl sm:leading-9">
              Maillume brings the small clues together, explains them in plain language, and helps you choose a safer next step. The score supports your decision; it never guarantees that a message is safe or malicious.
            </p>
          </div>

          <div className="mt-16 border-t border-[#aeb6ac]">
            {capabilityRows.map((item, index) => (
              <div key={item.title} className="grid gap-5 border-b border-[#cbd0c5] py-8 md:grid-cols-[80px_0.55fr_1fr] md:items-start md:gap-8">
                <span className="font-mono text-xs text-[#5f695f]">0{index + 1}</span>
                <div>
                  <item.icon className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
                  <p className="mt-3 font-mono text-[10px] uppercase text-[#687268]">{item.label}</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#111711]">{item.title}</h3>
                </div>
                <p className="max-w-2xl text-base leading-7 text-[#59655a]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#087b72] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase text-[#dfff52]">What leaves the browser</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Your file stays local. The analysis text is processed once.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#eaf5f2]">
              Screenshot OCR and .eml parsing happen in your browser. Only the normalized text needed for this assessment is sent to the selected Maillume deployment, and it is discarded when the request ends.
            </p>
          </div>

          <div className="border-y border-white/35">
            <FlowRow number="01" title="Your browser" detail="Parses files and extracts readable text." />
            <FlowRow number="02" title="Maillume analysis" detail="Weighs risk signals and returns an explainable assessment." />
            <FlowRow number="03" title="Request ends" detail="Email content and results are not written to application storage." last />
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-0">
            <div className="border-b border-[#aeb6ac] pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-14">
              <ScanSearch className="h-6 w-6 text-[#ff705f]" aria-hidden="true" />
              <p className="mt-5 font-mono text-[10px] uppercase text-[#687268]">Hosted by us</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#111711]">Check an email without setting anything up.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
                The hosted scanner uses built-in checks based on visible warning signs. Anonymous scans need no account; an optional account lets you manage API keys without creating scan history.
              </p>
              <a href={appHref} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#087b72] hover:text-[#111711]">
                Open Maillume <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="pt-10 lg:pl-14 lg:pt-0">
              <ServerCog className="h-6 w-6 text-[#087b72]" aria-hidden="true" />
              <p className="mt-5 font-mono text-[10px] uppercase text-[#687268]">Hosted by you</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#111711]">Keep the complete scanner under your control.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
                Deploy the AGPL application on your own infrastructure. Keep the predictable heuristic mode, or connect an AI provider with a server-side key you own.
              </p>
              <Link href="/self-hosted" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#087b72] hover:text-[#111711]">
                Explore self-hosting <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#eef1eb]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">Incident notes · February 2026</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#111711]">When phishing moves from email to phone.</h2>
          </div>
          <div>
            <p className="max-w-3xl text-base leading-7 text-[#59655a]">
              NOS reported that the Odido attack combined credential phishing, impersonation of internal IT, and fraudulent login approval. The case shows why email checks are only one layer of a safer verification process.
            </p>
            <Link href={localizePath("/resources/odido-phishing-incident", locale)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#087b72] hover:text-[#111711]">
              Read the incident notes <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#dfff52]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#455045]">Open development</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">
              Read the code, challenge the scoring, and help make suspicious email easier to understand.
            </h2>
          </div>
          <a
            href={SOURCE_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 flex-none items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            Follow on GitHub
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  ), copy);
}

function StatusItem({ icon: Icon, label }: { icon: typeof Check; label: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 py-4 sm:px-5 first:pl-0 last:pr-0">
      <Icon className="h-4 w-4 flex-none" strokeWidth={2.25} aria-hidden="true" />
      <span className="text-sm font-semibold text-[#111711]">{label}</span>
    </div>
  );
}

function FlowRow({ detail, last = false, number, title }: { detail: string; last?: boolean; number: string; title: string }) {
  return (
    <div className={`grid gap-2 py-6 sm:grid-cols-[52px_0.7fr_1.3fr] sm:items-center ${last ? "" : "border-b border-white/25"}`}>
      <span className="font-mono text-[10px] text-[#dfff52]">{number}</span>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm leading-6 text-[#eaf5f2]">{detail}</p>
    </div>
  );
}
