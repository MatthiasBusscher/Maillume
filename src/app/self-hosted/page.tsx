import type { Metadata } from "next";
import { ArrowRight, Braces, Check, Cloud, Github, KeyRound, ServerCog, ShieldCheck } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SOURCE_REPOSITORY_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Self-hosted",
  description: "Run the complete Maillume email risk scanner on infrastructure you control.",
};

export default function SelfHostedPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />
      <PageIntro
        eyebrow="Self-hosted Maillume"
        title="Your infrastructure. Your provider key. The complete scanner core."
        description="Deploy Maillume for your own users, keep analysis heuristic-only, or connect a supported AI provider without sending that key to a project maintainer."
        actions={
          <>
            <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 bg-[#dfff52] px-5 text-sm font-bold text-[#111711] hover:bg-white">
              <Github className="h-4 w-4" aria-hidden="true" /> View repository
            </a>
            <a href="#quickstart" className="inline-flex h-12 items-center gap-2 border border-white/35 px-5 text-sm font-semibold text-white hover:border-white hover:bg-white/10">
              Read quickstart <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </>
        }
      />

      <section className="border-b border-[#cbd0c5] bg-white">
        <div className="mx-auto grid max-w-[1440px] divide-y divide-[#cbd0c5] px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4 lg:px-8">
          <SelfHostedBenefit icon={ServerCog} title="Data boundary" description="Operate the application in your own environment." />
          <SelfHostedBenefit icon={KeyRound} title="Bring your key" description="Choose a supported AI or compatible endpoint." />
          <SelfHostedBenefit icon={Braces} title="Open source" description="Inspect and modify the AGPL-3.0 codebase." />
          <SelfHostedBenefit icon={ShieldCheck} title="Same guardrails" description="Keep no-store responses, limits, and disclaimers." />
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] py-20 sm:py-24" id="quickstart">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">Community quickstart</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">From clone to local scanner.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
              Heuristic mode needs no AI account. Add a server-side provider configuration only when your deployment needs it.
            </p>
            <ol className="mt-8 border-t border-[#aeb6ac]">
              <QuickStep number="01" text="Clone the repository and install dependencies." />
              <QuickStep number="02" text="Copy the environment example and select heuristic or AI mode." />
              <QuickStep number="03" text="Run the checks, then deploy to your preferred Next.js host." />
            </ol>
          </div>

          <div className="overflow-hidden border border-[#111711] bg-[#111711] text-white">
            <div className="flex h-11 items-center justify-between border-b border-white/20 px-4">
              <span className="font-mono text-[10px] uppercase text-[#dfff52]">Terminal</span>
              <span className="font-mono text-[9px] text-[#849083]">heuristic mode</span>
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-7 text-[#d8e0d6]"><code>{`git clone ${SOURCE_REPOSITORY_URL}.git
cd inbox-risk-scanner
npm install

cp .env.example .env.local
# ANALYSIS_MODE=heuristic

npm run dev`}</code></pre>
            <div className="border-t border-white/20 bg-[#182018] px-5 py-4 text-xs leading-5 text-[#aab5a8]">
              Public AI deployments also need provider-side budgets and deployment-level abuse controls.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#087b72] text-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#dfff52]">Choose the analysis boundary</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Two modes, one result contract.</h2>
            </div>
            <div className="overflow-x-auto border border-white/35">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/30 bg-white/10">
                    <th className="p-4 font-mono text-[10px] uppercase text-[#dfff52]">Mode</th>
                    <th className="p-4 font-mono text-[10px] uppercase text-[#dfff52]">External provider</th>
                    <th className="p-4 font-mono text-[10px] uppercase text-[#dfff52]">Best for</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/20">
                    <td className="p-4 font-semibold">Heuristic</td>
                    <td className="p-4 text-[#d2e6e2]">None</td>
                    <td className="p-4 text-[#d2e6e2]">Simple, predictable, zero-provider-cost deployments</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">AI</td>
                    <td className="p-4 text-[#d2e6e2]">Your configured provider</td>
                    <td className="p-4 text-[#d2e6e2]">Operators who accept provider processing and manage their own costs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-white py-20">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Cloud className="h-6 w-6 text-[#ff705f]" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold text-[#111711]">What the project provides</h2>
            <ul className="mt-6 space-y-3">
              {[
                "Next.js application and analysis API",
                "Paste, screenshot OCR, and .eml workflows",
                "Heuristic and provider adapter architecture",
                "Synthetic evaluation fixtures and security checks",
                "Deployment and privacy documentation",
              ].map((item) => <CheckItem key={item}>{item}</CheckItem>)}
            </ul>
          </div>
          <div className="lg:border-l lg:border-[#cbd0c5] lg:pl-12">
            <ServerCog className="h-6 w-6 text-[#087b72]" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold text-[#111711]">What the operator owns</h2>
            <ul className="mt-6 space-y-3">
              {[
                "Infrastructure, monitoring, and incident response",
                "AI provider account, terms, budgets, and retention review",
                "User disclosures and legal compliance",
                "Rate limits and abuse prevention at the edge",
                "AGPL source-availability obligations",
              ].map((item) => <CheckItem key={item}>{item}</CheckItem>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#dfff52]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#59655a]">Community edition</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#111711]">Start with the same scanner core.</h2>
          </div>
          <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]">
            <Github className="h-4 w-4" aria-hidden="true" /> Open the repository
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function SelfHostedBenefit({ description, icon: Icon, title }: { description: string; icon: typeof ServerCog; title: string }) {
  return (
    <div className="py-7 sm:px-5 first:pl-0 last:pr-0">
      <Icon className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
      <h2 className="mt-4 font-semibold text-[#111711]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#59655a]">{description}</p>
    </div>
  );
}

function QuickStep({ number, text }: { number: string; text: string }) {
  return <li className="grid grid-cols-[42px_1fr] gap-4 border-b border-[#cbd0c5] py-4 text-sm leading-6 text-[#4f5b50]"><span className="font-mono text-[10px] text-[#087b72]">{number}</span>{text}</li>;
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-3 text-sm leading-6 text-[#4f5b50]"><Check className="mt-1 h-4 w-4 flex-none text-[#087b72]" aria-hidden="true" />{children}</li>;
}
