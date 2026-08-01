import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, actions }: { actions?: ReactNode; description: string; eyebrow: string; title: string }) {
  return (
    <section className="relative overflow-hidden border-b border-black bg-[#111711] text-white">
      <div className="pointer-events-none absolute inset-y-0 left-[9%] w-px bg-white/10" />
      <div className="pointer-events-none absolute inset-y-0 right-[16%] w-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/10" />
      <div className="pointer-events-none absolute -right-8 top-[-20%] hidden h-[150%] w-[22rem] -skew-x-12 border-x border-[#dfff52]/15 bg-[#dfff52]/[0.035] lg:block" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase text-[#dfff52]">
            <span className="h-px w-8 bg-[#dfff52]" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#c8d1c6]">{description}</p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        <div className="hidden border-y border-white/20 py-5 lg:block" aria-hidden="true">
          <div className="flex items-center justify-between border-b border-white/20 pb-4 font-mono text-[10px] uppercase text-[#dfff52]">
            <span>Maillume</span>
            <span className="h-2 w-2 bg-[#dfff52]" />
          </div>
          <div className="space-y-3 pt-5">
            <span className="block h-2 w-full bg-white/70" />
            <span className="block h-2 w-4/5 bg-white/30" />
            <span className="block h-2 w-3/5 bg-[#dfff52]" />
          </div>
        </div>
      </div>
    </section>
  );
}
