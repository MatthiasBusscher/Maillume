import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCircle2, PhoneCall, ShieldAlert } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAppHref } from "@/lib/site";
import { incidentNl } from "@/lib/i18n/marketing-pages";
import { translateMarketingTree } from "@/lib/i18n/marketing-translate";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";

const NOS_REPORT_URL =
  "https://nos.nl/artikel/2602283-odido-hackers-kwamen-binnen-via-phishing-deden-zich-voor-als-ict-afdeling";

export async function generateMetadata(): Promise<Metadata> { const locale = await getRequestSiteLocale(); return { title: locale === "nl" ? incidentNl["What the Odido phishing incident teaches us"] : "What the Odido phishing incident teaches us", description: locale === "nl" ? incidentNl["How email phishing, internal IT impersonation, and MFA manipulation can form one attack."] : "How email phishing, internal IT impersonation, and MFA manipulation can form one attack." }; }

export default async function OdidoIncidentPage() {
  const copy = (await getRequestSiteLocale()) === "nl" ? incidentNl : {};
  return translateMarketingTree((
    <main className="min-h-screen bg-[#f7f8f4] text-[#111711]">
      <SiteHeader />
      <article>
        <header className="border-b border-[#111711] bg-[#111711] text-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-24 lg:px-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#dfff52] hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Maillume
            </Link>
            <p className="mt-12 font-mono text-[11px] uppercase text-[#dfff52]">Incident notes · February 2026</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">
              A phishing email can be the first step, not the whole attack.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#d9e0d7]">
              Reporting about the Odido breach shows how stolen credentials, a convincing phone call, and approval of a fraudulent login can work together.
            </p>
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_260px] lg:px-8 lg:py-24">
          <div className="space-y-12 text-base leading-8 text-[#4f5b50]">
            <section>
              <h2 className="text-2xl font-semibold text-[#111711]">What was reported</h2>
              <p className="mt-4">
                NOS reported that attackers obtained customer-service employees&apos; passwords through phishing emails. They then called employees while posing as Odido&apos;s IT department and persuaded them to approve fraudulent login attempts, bypassing an additional security step. Multiple accounts were reportedly compromised and customer data was then collected automatically.
              </p>
              <a href={NOS_REPORT_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#087b72] underline underline-offset-4">
                Read the original NOS report <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </section>

            <section className="border-y border-[#aeb6ac] py-10">
              <h2 className="text-2xl font-semibold text-[#111711]">Why layered social engineering works</h2>
              <div className="mt-7 grid gap-7 sm:grid-cols-3">
                <IncidentStep number="01" title="Email" text="A message creates a believable reason to surrender credentials." />
                <IncidentStep number="02" title="Phone call" text="A second channel and an internal identity create confidence and urgency." />
                <IncidentStep number="03" title="Approval" text="The victim is guided into approving an action they did not initiate." />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#111711]">A practical pause</h2>
              <p className="mt-4">
                Treat unexpected requests for passwords, login approvals, payments, or sensitive information as a reason to stop. Contact the organization through a known number or internal channel, independently verify the request, and never approve an MFA prompt you did not initiate.
              </p>
            </section>

            <section className="border border-[#111711] bg-white p-6 sm:p-8">
              <ShieldAlert className="h-6 w-6 text-[#ff705f]" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-[#111711]">Where Maillume fits</h2>
              <p className="mt-3">
                Maillume can provide a second opinion on the email portion and make suspicious signals easier to see. It cannot verify a caller&apos;s identity, inspect an organization&apos;s internal systems, or guarantee that an email is safe. It should be one part of a broader verification process.
              </p>
              <a href={getAppHref()} className="mt-6 inline-flex h-11 items-center bg-[#dfff52] px-4 text-sm font-bold text-[#111711] hover:bg-[#ccea42]">
                Check an email
              </a>
            </section>
          </div>

          <aside className="h-fit border-t-4 border-[#087b72] bg-white p-6 lg:sticky lg:top-24">
            <PhoneCall className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">Remember</h2>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-[#59655a]">
              {["Use a known contact channel.", "Do not share passwords by email or phone.", "Reject unexpected login approvals.", "Report the attempt internally."].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-[#087b72]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </article>
      <SiteFooter />
    </main>
  ), copy);
}

function IncidentStep({ number, text, title }: { number: string; text: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[#087b72]">{number}</p>
      <h3 className="mt-2 font-semibold text-[#111711]">{title}</h3>
      <p className="mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}
