import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole, ScanSearch } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getAppHref, getMarketingHref } from "@/lib/site";
import { getSupabaseAdminConfig } from "@/lib/supabase/admin";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Maillume with Google.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  const configured =
    getPublicSupabaseConfig() !== null && getSupabaseAdminConfig() !== null;
  const marketingHref = getMarketingHref();

  return (
    <main className="grid min-h-screen bg-[#eef1eb] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-[360px] flex-col justify-between bg-[#111711] p-6 text-white sm:p-10 lg:min-h-screen lg:p-14">
        <a href={marketingHref} aria-label="Maillume home"><BrandMark inverse /></a>
        <div className="max-w-xl py-12 lg:py-0">
          <p className="font-mono text-[10px] uppercase text-[#dfff52]">Optional account</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Sign in for the services around the scanner.</h1>
          <p className="mt-5 text-base leading-7 text-[#c8d1c6]">
            Anonymous email checks remain available without an account. Sign-in is the foundation for future preferences, managed allowances, and integrations, not scan history.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-white/20 pt-5 text-xs text-[#93a091]">
          <LockKeyhole className="h-4 w-4 text-[#dfff52]" aria-hidden="true" />
          Google authentication is handled by Supabase when configured.
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md border border-[#aeb6ac] bg-[#f9faf7] p-6 shadow-[0_24px_70px_rgba(17,23,17,0.12)] sm:p-8">
          <p className="font-mono text-[10px] uppercase text-[#087b72]">Maillume account</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#111711]">Continue securely</h2>
          <p className="mt-3 text-sm leading-6 text-[#59655a]">
            Use your Google account. Maillume never receives your Google password.
          </p>
          <div className="mt-7">
            <GoogleSignInButton configured={configured} />
          </div>
          <div className="my-7 flex items-center gap-3 text-[10px] uppercase text-[#778177]">
            <span className="h-px flex-1 bg-[#cbd0c5]" />
            or continue without an account
            <span className="h-px flex-1 bg-[#cbd0c5]" />
          </div>
          <a href={getAppHref()} className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]">
            <ScanSearch className="h-4 w-4 text-[#dfff52]" aria-hidden="true" /> Open scanner
          </a>
          <a href={marketingHref} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#59655a] hover:text-[#087b72]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to Maillume
          </a>
        </div>
      </section>
    </main>
  );
}
