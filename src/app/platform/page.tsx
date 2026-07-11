import type { Metadata } from "next";
import { ArrowRight, Blocks, Braces, Check, Github, MailCheck, PlugZap, ShieldCheck } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SOURCE_REPOSITORY_URL } from "@/lib/site";
import { platformNl } from "@/lib/i18n/marketing-pages";
import { translateMarketingTree } from "@/lib/i18n/marketing-translate";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestSiteLocale(); return { title: locale === "nl" ? "Platform" : "Platform", description: locale === "nl" ? "Gehoste Maillume-API, browserextensie, Gmail-add-on en Outlook-invoegtoepassing." : "Maillume hosted API, browser extension, Gmail add-on, and Outlook add-in." }; }

const roadmap = [
  { status: "Available", title: "Hosted API access", description: "Authenticated, revocable keys with a 100-call monthly beta quota and aggregate-only usage counters." },
  { status: "Source beta", title: "Browser extension", description: "A Manifest V3 side panel that sends only text the user explicitly selects to a chosen deployment." },
  { status: "Source beta", title: "Gmail add-on", description: "A current-message-only Workspace add-on that reads content after the user presses Analyze." },
  { status: "Source beta", title: "Outlook add-in", description: "A ReadItem task pane for the open message, with no read/write mailbox permission or background scan." },
];

export default async function PlatformPage() {
  const copy = (await getRequestSiteLocale()) === "nl" ? platformNl : {};
  return translateMarketingTree((
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />
      <PageIntro
        eyebrow="Maillume Platform"
        title="Bring a clear email risk report into the tools people already use."
        description="The platform now includes a quota-aware API and source-available integrations for Chrome, Gmail, and Outlook. Marketplace publication remains a release operation, not unfinished product design."
        actions={
          <>
            <a href="#today" className="inline-flex h-12 items-center gap-2 bg-[#dfff52] px-5 text-sm font-bold text-[#111711] hover:bg-white">See what works today <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 border border-white/35 px-5 text-sm font-semibold text-white hover:border-white hover:bg-white/10"><Github className="h-4 w-4" aria-hidden="true" /> Follow development</a>
          </>
        }
      />

      <section className="border-b border-[#cbd0c5] bg-white py-20 sm:py-24" id="today">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">Available today</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">A predictable, quota-aware JSON contract.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
              Integrations post normalized message content to `/api/v1/analyze` with a revocable account key and receive the same structured assessment as the scanner.
            </p>
            <ul className="mt-7 space-y-3">
              <PlatformCheck>Strict request size and field validation</PlatformCheck>
              <PlatformCheck>Structured response shared by heuristic and AI modes</PlatformCheck>
              <PlatformCheck>No-store response headers</PlatformCheck>
              <PlatformCheck>Automated-assessment disclaimer in every result</PlatformCheck>
            </ul>
            <a href="/openapi.json" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#087b72] hover:text-[#111711]">OpenAPI specification <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>

          <div className="overflow-hidden border border-[#111711] bg-[#111711] text-white">
            <div className="flex h-11 items-center justify-between border-b border-white/20 px-4">
              <span className="font-mono text-[10px] uppercase text-[#dfff52]">POST /api/v1/analyze</span>
              <span className="font-mono text-[9px] text-[#849083]">authenticated beta</span>
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-6 text-[#d8e0d6]"><code>{`Authorization: Bearer mlm_...

{
  "source": "paste",
  "subject": "Action required",
  "senderEmail": "notice@example.test",
  "body": "Review this synthetic message..."
}

// response
{
  "result": {
    "risk_level": "high",
    "risk_score": 82,
    "suspicious_signals": ["..."],
    "recommended_action": "..."
  },
  "privacy": { "stored": false }
}`}</code></pre>
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#087b72] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#dfff52]">Integration principles</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Convenient without becoming invisible.</h2>
            </div>
            <p className="max-w-3xl text-xl leading-8 text-[#d2e6e2]">
              Every integration analyzes only after a clear user action, requests the smallest practical permission scope, and shows or fixes the exact deployment receiving the content.
            </p>
          </div>

          <div className="mt-14 grid border-y border-white/35 md:grid-cols-3 md:divide-x md:divide-white/25">
            <Principle icon={MailCheck} title="User initiated" description="No background mailbox harvesting or silent scanning." />
            <Principle icon={ShieldCheck} title="Explicit boundary" description="Users know whether analysis is local, official cloud, or self-hosted." />
            <Principle icon={Braces} title="Portable contract" description="Integrations consume the same structured result shape." />
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#087b72]">Implemented surfaces</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#111711]">From endpoint to inbox.</h2>
            </div>
            <div className="border-t border-[#aeb6ac]">
              {roadmap.map((item, index) => (
                <div key={item.title} className="grid gap-3 border-b border-[#cbd0c5] py-6 sm:grid-cols-[54px_120px_0.7fr_1fr] sm:items-start sm:gap-5">
                  <span className="font-mono text-[10px] text-[#778177]">0{index + 1}</span>
                  <span className={`w-fit border px-2 py-1 font-mono text-[9px] uppercase ${item.status === "Available" ? "border-[#087b72] bg-[#e2f4ef] text-[#165f57]" : "border-[#111711] bg-[#eef1eb] text-[#374238]"}`}>{item.status}</span>
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
            <p className="font-mono text-[10px] uppercase text-[#59655a]">Build in the open</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-[#111711]">Integration decisions belong in public issues before they reach an inbox.</h2>
          </div>
          <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 flex-none items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]"><Blocks className="h-4 w-4" aria-hidden="true" /> View the roadmap</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  ), copy);
}

function PlatformCheck({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-3 text-sm leading-6 text-[#4f5b50]"><Check className="mt-1 h-4 w-4 flex-none text-[#087b72]" aria-hidden="true" />{children}</li>;
}

function Principle({ description, icon: Icon, title }: { description: string; icon: typeof PlugZap; title: string }) {
  return <div className="py-7 md:px-6 first:pl-0 last:pr-0"><Icon className="h-5 w-5 text-[#dfff52]" aria-hidden="true" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#d2e6e2]">{description}</p></div>;
}
