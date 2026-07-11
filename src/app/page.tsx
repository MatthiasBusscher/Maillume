import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Maillume",
  description:
    "Get a clear, privacy-first risk assessment for suspicious email text, screenshots, and .eml files.",
};

const capabilityRows = [
  {
    icon: FileSearch,
    label: "Flexible input",
    title: "Bring the email you actually received.",
    description:
      "Paste the message, extract text from a screenshot, or parse an exported .eml file. The file itself stays in your browser.",
  },
  {
    icon: Eye,
    label: "Explainable output",
    title: "See the signals, not just a scary label.",
    description:
      "Maillume shows a risk score, suspicious patterns, detected links, and a practical next action so you can make the final call.",
  },
  {
    icon: Database,
    label: "No scan history",
    title: "The assessment ends when the request does.",
    description:
      "The hosted beta does not save email text, sender details, screenshots, .eml files, links, or completed scan results.",
  },
];

export default function MarketingHomePage() {
  const appHref = getAppHref();

  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />

      <section className="relative h-[calc(100svh-7rem)] min-h-[560px] max-h-[760px] overflow-hidden border-b border-black bg-[#111711] text-white">
        <div className="pointer-events-none absolute inset-y-0 left-[8%] w-px bg-white/10" />
        <div className="pointer-events-none absolute inset-y-0 right-[13%] w-px bg-white/10" />
        <div className="pointer-events-none absolute inset-x-0 top-[30%] h-px bg-white/10" />

        <div className="absolute left-5 top-[500px] w-[720px] sm:left-[36%] sm:top-[330px] lg:left-auto lg:right-[-110px] lg:top-16 lg:w-[780px] xl:right-[-40px] xl:w-[820px]">
          <ScannerPreview />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] items-start px-5 pt-14 sm:px-6 sm:pt-16 lg:px-8 lg:pt-24">
          <div className="max-w-[680px] lg:max-w-[430px] xl:max-w-[520px]">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase text-[#dfff52]">
              <span className="h-px w-8 bg-[#dfff52]" aria-hidden="true" />
              Open-source email risk assessment
            </div>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl">
              Maillume
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-[#d9e0d7] sm:text-xl sm:leading-8">
              A calm second opinion for suspicious email, before you click, reply, or pay.
            </p>
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
              Free heuristic checks. No account required. No scan history.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-[#dfff52]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-[#111711]/25 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          <StatusItem icon={LockKeyhole} label="Files parsed in your browser" />
          <StatusItem icon={ShieldQuestion} label="Evidence, never certainty theater" />
          <StatusItem icon={Braces} label="AGPL-3.0 open source" />
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div>
              <p className="font-mono text-[11px] uppercase text-[#087b72]">A useful second opinion</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">
                Email safety should feel understandable.
              </h2>
            </div>
            <p className="max-w-3xl text-xl leading-8 text-[#4f5b50] sm:text-2xl sm:leading-9">
              Maillume turns the pressure tactics, mismatched domains, suspicious links, and identity clues in an email into a report a non-technical person can act on.
            </p>
          </div>

          <div className="mt-16 border-t border-[#aeb6ac]">
            {capabilityRows.map((item, index) => (
              <div key={item.title} className="grid gap-5 border-b border-[#cbd0c5] py-8 md:grid-cols-[80px_0.55fr_1fr] md:items-start md:gap-8">
                <span className="font-mono text-xs text-[#778177]">0{index + 1}</span>
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
              Only the text needed for this assessment.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#d2e6e2]">
              Screenshot OCR and .eml parsing happen locally. The normalized text is sent to the analysis route for the current score and is not added to a scan database.
            </p>
          </div>

          <div className="border-y border-white/35">
            <FlowRow number="01" title="Your browser" detail="Parses files and extracts readable text." />
            <FlowRow number="02" title="Maillume analysis" detail="Checks risk patterns and returns structured JSON." />
            <FlowRow number="03" title="Request ends" detail="No email content or result is written to scan history." last />
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-0">
            <div className="border-b border-[#aeb6ac] pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-14">
              <ScanSearch className="h-6 w-6 text-[#ff705f]" aria-hidden="true" />
              <p className="mt-5 font-mono text-[10px] uppercase text-[#687268]">Hosted by us</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#111711]">Use the scanner in seconds.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
                The official cloud runs the local heuristic analyzer without a maintainer-funded AI key. Anonymous checks remain the default.
              </p>
              <a href={appHref} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#087b72] hover:text-[#111711]">
                Open Maillume <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="pt-10 lg:pl-14 lg:pt-0">
              <ServerCog className="h-6 w-6 text-[#087b72]" aria-hidden="true" />
              <p className="mt-5 font-mono text-[10px] uppercase text-[#687268]">Hosted by you</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#111711]">Run the complete core yourself.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#59655a]">
                Deploy the AGPL application on your infrastructure, keep heuristic mode, or connect your own supported AI provider key.
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
              The reported Odido attack combined credential phishing, impersonation of internal IT, and fraudulent login approval. See what that sequence teaches us without claiming any single tool can guarantee prevention.
            </p>
            <Link href="/resources/odido-phishing-incident" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#087b72] hover:text-[#111711]">
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
              Inspect the code. Improve the checks. Run your own copy.
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
  );
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
      <p className="text-sm leading-6 text-[#d2e6e2]">{detail}</p>
    </div>
  );
}
