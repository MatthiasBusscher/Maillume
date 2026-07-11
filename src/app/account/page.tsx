import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ScanSearch, ShieldCheck, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { getAppHref, getMarketingHref } from "@/lib/site";
import { getSupabaseAdminConfig } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Maillume account.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const deletionConfigured = getSupabaseAdminConfig() !== null;

  if (!data.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef1eb] px-5 py-12">
        <div className="w-full max-w-lg border border-[#aeb6ac] bg-white p-7 sm:p-9">
          <BrandMark />
          <h1 className="mt-8 text-3xl font-semibold text-[#111711]">No active account session</h1>
          <p className="mt-4 text-sm leading-7 text-[#59655a]">
            Sign in with Google when authentication is configured, or continue using the scanner without an account.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/auth/sign-in" className="inline-flex h-11 items-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72]"><UserRound className="h-4 w-4" aria-hidden="true" /> Sign in</Link>
            <a href={getAppHref()} className="inline-flex h-11 items-center gap-2 border border-[#111711] px-4 text-sm font-semibold text-[#111711] hover:bg-[#eef1eb]"><ScanSearch className="h-4 w-4" aria-hidden="true" /> Open scanner</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef1eb]">
      <header className="border-b border-[#aeb6ac] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <a href={getMarketingHref()}><BrandMark /></a>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="inline-flex h-10 items-center gap-2 border border-[#aeb6ac] px-3 text-sm font-semibold text-[#374238] hover:border-[#111711]"><LogOut className="h-4 w-4" aria-hidden="true" /> Sign out</button>
          </form>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <p className="font-mono text-[10px] uppercase text-[#087b72]">Account</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#111711]">Welcome to Maillume</h1>
        <p className="mt-3 text-sm text-[#59655a]">Signed in as {data.user.email ?? "Google user"}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="border border-[#aeb6ac] bg-white p-6">
            <ScanSearch className="h-5 w-5 text-[#ff705f]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-semibold text-[#111711]">Start a private assessment</h2>
            <p className="mt-3 text-sm leading-6 text-[#59655a]">Your account does not create scan history. The same no-storage workflow applies.</p>
            <a href={getAppHref()} className="mt-6 inline-flex h-10 items-center bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72]">Open scanner</a>
          </div>
          <div className="border border-[#aeb6ac] bg-[#dfff52] p-6">
            <ShieldCheck className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-semibold text-[#111711]">Account scope</h2>
            <p className="mt-3 text-sm leading-6 text-[#455045]">Accounts currently provide authentication only. Preferences, managed allowances, and integrations remain roadmap items.</p>
          </div>
        </div>

        <section className="mt-10 border-t border-[#aeb6ac] pt-8">
          <p className="font-mono text-[10px] uppercase text-[#b2382b]">Account control</p>
          <h2 className="mt-3 text-xl font-semibold text-[#111711]">Delete your Maillume account</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#59655a]">
            This permanently removes the Supabase authentication identity. There is no scan history to delete. You can continue using the anonymous scanner afterward.
          </p>
          {deletionConfigured ? (
            <details className="mt-5 max-w-2xl border border-[#d08b82] bg-[#fff7f5] p-4">
              <summary className="cursor-pointer font-semibold text-[#8f251b]">Show permanent deletion controls</summary>
              <form action="/account/delete" method="post" className="mt-4">
                <label className="flex items-start gap-3 text-sm leading-6 text-[#5f3934]">
                  <input type="checkbox" name="confirm" value="delete" required className="mt-1 h-4 w-4 accent-[#b2382b]" />
                  I understand that this removes my account identity and cannot be undone.
                </label>
                <button type="submit" className="mt-4 inline-flex h-10 items-center border border-[#b2382b] px-4 text-sm font-semibold text-[#8f251b] hover:bg-[#b2382b] hover:text-white">
                  Delete account permanently
                </button>
              </form>
            </details>
          ) : (
            <p className="mt-4 max-w-2xl border-l-4 border-[#c78c32] bg-[#fff0cf] px-4 py-3 text-sm leading-6 text-[#714812]">
              Account deletion is not configured on this deployment. Production authentication must remain disabled until a server-only Supabase secret is available.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
