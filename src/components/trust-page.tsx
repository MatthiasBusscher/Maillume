import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function TrustPage({ children, description, eyebrow, title, updatedDate, updatedLabel }: { children: ReactNode; description: string; eyebrow: string; title: string; updatedDate: string; updatedLabel: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />
      <header className="border-b border-[#aeb6ac] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="font-mono text-[10px] uppercase text-[#087b72]">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#111711] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#59655a]">{description}</p>
          <p className="mt-5 font-mono text-[10px] uppercase text-[#778177]">{updatedLabel}: {updatedDate}</p>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="trust-content max-w-3xl space-y-10 text-sm leading-7 text-[#4f5b50]">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}

export function TrustSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border-t border-[#cbd0c5] pt-7">
      <h2 className="text-xl font-semibold text-[#111711]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function TrustList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item) => <li key={item} className="list-square pl-1">{item}</li>)}
    </ul>
  );
}
