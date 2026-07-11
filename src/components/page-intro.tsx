import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, actions }: { actions?: ReactNode; description: string; eyebrow: string; title: string }) {
  return (
    <section className="relative overflow-hidden border-b border-black bg-[#111711] text-white">
      <div className="pointer-events-none absolute inset-y-0 right-[16%] w-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/10" />
      <div className="relative mx-auto max-w-[1440px] px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
        <p className="font-mono text-[11px] uppercase text-[#dfff52]">{eyebrow}</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#c8d1c6]">{description}</p>
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
