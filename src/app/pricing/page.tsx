import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Github, ServerCog } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAppHref, SOURCE_REPOSITORY_URL } from "@/lib/site";
import { pricingNl } from "@/lib/i18n/marketing-pages";
import { translateMarketingTree } from "@/lib/i18n/marketing-translate";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizeHref, localizePath } from "@/lib/i18n/site-locale";

export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestSiteLocale(); return { title: locale === "nl" ? "Prijzen" : "Pricing", description: locale === "nl" ? pricingNl["Simple, honest pricing for Maillume Cloud and the open-source self-hosted scanner."] : "Simple, honest pricing for Maillume Cloud and the open-source self-hosted scanner." }; }

const plans = [
  {
    name: "Cloud Free",
    price: "EUR 0",
    cadence: "free, no subscriptions",
    description: "A clear second opinion for suspicious email.",
    status: "Available now",
    accent: true,
    features: [
      "No account required",
      "Built-in checks based on visible warning signs",
      "Paste, screenshot, and .eml inputs",
      "English and Dutch interface",
      "Official Chrome extension, no account needed",
      "No scan history",
    ],
    cta: "Check an email",
    href: getAppHref(),
  },
  {
    name: "Self-hosted",
    price: "EUR 0",
    cadence: "AGPL-3.0",
    description: "Run the complete scanner core on infrastructure you control.",
    status: "Available from source",
    features: [
      "Complete heuristic scanner",
      "Bring your own supported AI key",
      "No fee or limit imposed by Maillume",
      "Modify and deploy the source",
      "Community support through GitHub",
    ],
    cta: "Self-host Maillume",
    href: "/self-hosted",
  },
];

export default async function PricingPage() {
  const locale = await getRequestSiteLocale();
  const copy = locale === "nl" ? pricingNl : {};
  return translateMarketingTree((
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />
      <PageIntro
        eyebrow="Pricing"
        title="The safety workflow stays free."
        description="Maillume is a free, open-source project. Built-in checks need no account, nothing is for sale, and Maillume does not sell certainty."
      />

      <section className="border-b border-[#cbd0c5] py-16 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`flex min-h-[520px] flex-col border p-6 sm:p-7 ${
                  plan.accent
                    ? "border-[#111711] bg-[#dfff52]"
                    : "border-[#aeb6ac] bg-white"
                }`}
              >
                <p className="font-mono text-[10px] uppercase text-[#59655a]">{plan.status}</p>
                <h2 className="mt-5 text-2xl font-semibold text-[#111711]">{plan.name}</h2>
                <div className="mt-7 border-b border-[#111711]/25 pb-7">
                  <p className="text-4xl font-semibold text-[#111711]">{plan.price}</p>
                  <p className="mt-2 text-sm text-[#59655a]">{plan.cadence}</p>
                </div>
                <p className="mt-6 min-h-14 text-sm leading-6 text-[#4f5b50]">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-[#374238]">
                      <Check className="mt-1 h-4 w-4 flex-none text-[#087b72]" strokeWidth={2.5} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={localizeHref(plan.href, locale)}
                  className={`mt-8 inline-flex h-11 items-center justify-center gap-2 px-4 text-sm font-bold transition ${
                    plan.accent
                      ? "bg-[#111711] text-white hover:bg-[#087b72]"
                      : "border border-[#111711] text-[#111711] hover:bg-[#111711] hover:text-white"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">Common questions</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#111711]">No small print hidden in the score.</h2>
          </div>
          <div className="border-t border-[#aeb6ac]">
            <PricingQuestion question="Do I need an account?">
              No. The web scanner and the Chrome extension both work anonymously. Maillume has no accounts, so there is no profile, password, or scan history to keep.
            </PricingQuestion>
            <PricingQuestion question="Will there be a paid plan?">
              No paid plan is planned. Maillume is a free, open-source project. Fair-use limits per connection keep the hosted scanner available for everyone.
            </PricingQuestion>
            <PricingQuestion question="Who pays for AI in a self-hosted deployment?">
              The operator supplies and pays for their own provider key. Maillume does not place a maintainer-owned key in the open-source application.
            </PricingQuestion>
            <PricingQuestion question="Can I use the source commercially?">
              The code is available under AGPL-3.0-only. Review the license and its network source-availability requirements for your deployment. This page is not legal advice.
            </PricingQuestion>
          </div>
        </div>
      </section>

      <section className="bg-[#111711] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="flex gap-4">
            <ServerCog className="h-5 w-5 flex-none text-[#dfff52]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Need full infrastructure control?</h2>
              <Link href={localizePath("/self-hosted", locale)} className="mt-2 inline-flex items-center gap-2 text-sm text-[#b8c4b6] hover:text-white">
                Compare the self-hosted setup <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="flex gap-4 md:border-l md:border-white/20 md:pl-8">
            <Github className="h-5 w-5 flex-none text-[#dfff52]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Want to contribute?</h2>
              <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-[#b8c4b6] hover:text-white">
                Open the project on GitHub <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  ), copy);
}

function PricingQuestion({ children, question }: { children: React.ReactNode; question: string }) {
  return (
    <details className="group border-b border-[#cbd0c5] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-[#111711] [&::-webkit-details-marker]:hidden">
        {question}
        <span className="font-mono text-lg text-[#087b72] group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <p className="max-w-3xl pt-4 text-sm leading-7 text-[#59655a]">{children}</p>
    </details>
  );
}
