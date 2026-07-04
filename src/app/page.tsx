import { ShieldCheck } from "lucide-react";

import { EmailScanForm } from "@/components/email-scan-form";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-white/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">Inbox Risk Scanner</p>
              <p className="text-xs font-medium uppercase text-slate-500">Prototype</p>
            </div>
          </div>
          <a
            href="#scanner"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Start scan
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex w-fit rounded-md bg-white px-3 py-1 text-sm font-semibold text-sky-800 ring-1 ring-sky-100">
            Built for freelancers and small teams
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Inbox Risk Scanner
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
            Paste a suspicious email and get a clear, structured risk assessment before clicking,
            replying, or forwarding sensitive details.
          </p>
        </div>
      </section>

      <section id="scanner" className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8">
        <EmailScanForm />
      </section>
    </main>
  );
}
