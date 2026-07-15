"use client";

import { ArrowLeft, ScanSearch } from "lucide-react";
import { useState } from "react";

import { EmailAuthForm } from "@/components/email-auth-form";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PasskeySignInButton } from "@/components/passkey-sign-in-button";
import type { AccountDictionary } from "@/lib/i18n/account-en";
import type { SiteLocale } from "@/lib/i18n/site-locale";

export function AuthMethodPanel({
  authErrorMessage,
  configured,
  copy,
  locale,
  marketingHref,
  passkeysEnabled,
  scannerHref,
}: {
  authErrorMessage: string | null;
  configured: boolean;
  copy: AccountDictionary["signIn"];
  locale: SiteLocale;
  marketingHref: string;
  passkeysEnabled: boolean;
  scannerHref: string;
}) {
  const [emailEngaged, setEmailEngaged] = useState(false);
  const [otherMethodsOpen, setOtherMethodsOpen] = useState(false);
  const alternativesVisible = !emailEngaged || otherMethodsOpen;

  return (
    <>
      <div className="mt-7">
        <EmailAuthForm
          configured={configured}
          labels={copy.email}
          locale={locale}
          onEngagementChange={setEmailEngaged}
        />
      </div>

      {emailEngaged ? (
        <button
          type="button"
          aria-expanded={otherMethodsOpen}
          onClick={() => setOtherMethodsOpen((open) => !open)}
          className="mt-4 text-xs font-semibold text-[#087b72] hover:text-[#111711]"
        >
          {otherMethodsOpen ? copy.hideOtherMethods : copy.otherMethods}
        </button>
      ) : null}

      {alternativesVisible ? (
        <>
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase text-[#778177]">
            <span className="h-px flex-1 bg-[#cbd0c5]" />
            Google
            <span className="h-px flex-1 bg-[#cbd0c5]" />
          </div>
          <div>
            <GoogleSignInButton configured={configured} labels={copy.google} />
            <PasskeySignInButton enabled={configured && passkeysEnabled} labels={copy.passkey} locale={locale} />
          </div>
        </>
      ) : null}

      {authErrorMessage ? (
        <p role="alert" className="mt-4 border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#7a2b23]">
          {authErrorMessage}
        </p>
      ) : null}
      <div className="my-7 flex items-center gap-3 text-[10px] uppercase text-[#778177]">
        <span className="h-px flex-1 bg-[#cbd0c5]" />
        {copy.separator}
        <span className="h-px flex-1 bg-[#cbd0c5]" />
      </div>
      <a href={scannerHref} className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]">
        <ScanSearch className="h-4 w-4 text-[#dfff52]" aria-hidden="true" /> {copy.openScanner}
      </a>
      <a href={marketingHref} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#59655a] hover:text-[#087b72]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {copy.back}
      </a>
    </>
  );
}
