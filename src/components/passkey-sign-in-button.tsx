"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

import { resolveAuthenticatedLocale } from "@/lib/auth/authenticated-locale";
import type { AccountDictionary } from "@/lib/i18n/account-en";
import { persistBrowserSiteLocale } from "@/lib/i18n/browser-locale";
import { localizePath, type SiteLocale } from "@/lib/i18n/site-locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PasskeySignInButton({
  enabled,
  labels,
  locale,
}: {
  enabled: boolean;
  labels: AccountDictionary["signIn"]["passkey"];
  locale: SiteLocale;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    const supabase = createBrowserSupabaseClient();
    if (!enabled || !supabase || typeof PublicKeyCredential === "undefined") {
      setError(labels.unavailable);
      return;
    }

    setIsLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPasskey();
    if (signInError) {
      setError(labels.failed);
      setIsLoading(false);
      return;
    }

    const accountLocale = await resolveAuthenticatedLocale(supabase.auth, locale);
    persistBrowserSiteLocale(accountLocale);
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const accountPath = localizePath("/account", accountLocale);
    if (data?.currentLevel === "aal1" && data.nextLevel === "aal2") {
      window.location.assign(`${localizePath("/auth/mfa", accountLocale)}?next=${encodeURIComponent(accountPath)}`);
      return;
    }
    window.location.assign(accountPath);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={signIn}
        disabled={!enabled || isLoading}
        className="inline-flex h-12 w-full items-center justify-center gap-3 border border-[#111711] bg-white px-5 text-sm font-semibold text-[#111711] transition hover:bg-[#eef1eb] disabled:cursor-not-allowed disabled:border-[#aeb6ac] disabled:text-[#778177]"
      >
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4 text-[#087b72]" aria-hidden="true" />}
        {isLoading ? labels.opening : labels.continue}
      </button>
      <p className="mt-2 text-xs leading-5 text-[#687268]">{labels.beta}</p>
      {error ? <p className="mt-2 text-xs leading-5 text-[#b2382b]" role="alert">{error}</p> : null}
    </div>
  );
}
