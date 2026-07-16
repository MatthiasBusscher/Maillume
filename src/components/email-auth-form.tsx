"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

import type { AccountDictionary } from "@/lib/i18n/account-en";
import {
  getEmailAuthFailureMessage,
  type EmailAuthMode,
} from "@/lib/auth/email-auth-error";
import { resolveAuthenticatedLocale } from "@/lib/auth/authenticated-locale";
import { getAccountLocaleMetadata } from "@/lib/i18n/account-locale";
import { persistBrowserSiteLocale } from "@/lib/i18n/browser-locale";
import { localizePath, type SiteLocale } from "@/lib/i18n/site-locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function EmailAuthForm({
  configured,
  labels,
  locale,
  onEngagementChange,
}: {
  configured: boolean;
  labels: AccountDictionary["signIn"]["email"];
  locale: SiteLocale;
  onEngagementChange?: (engaged: boolean) => void;
}) {
  const [mode, setMode] = useState<EmailAuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  useEffect(() => {
    onEngagementChange?.(Boolean(email.trim() || password));
  }, [email, onEngagementChange, password]);

  function selectMode(nextMode: EmailAuthMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
    setCanResendConfirmation(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!configured || !supabase) {
      setError(labels.unavailable);
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");
    setCanResendConfirmation(false);

    try {
      if (mode === "forgot") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", localizePath("/auth/update-password", locale));
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callback.toString(),
        });
        if (resetError) {
          setError(labels.resetFailed);
          return;
        }
        setMessage(labels.resetSent);
        return;
      }

      if (mode === "sign-up") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", localizePath("/account", locale));
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: getAccountLocaleMetadata(locale),
            emailRedirectTo: callback.toString(),
          },
        });
        if (signUpError) {
          setError(labels.signUpFailed);
          return;
        }
        if (data.session) {
          await continueAfterPrimarySignIn(supabase, locale);
          return;
        }
        setCanResendConfirmation(true);
        setMessage(labels.confirmEmail);
        return;
      }

      if (mode === "magic-link") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", localizePath("/account", locale));
        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            data: getAccountLocaleMetadata(locale),
            emailRedirectTo: callback.toString(),
          },
        });
        if (magicLinkError) {
          setError(labels.magicLinkFailed);
          return;
        }
        setMessage(labels.magicLinkSent);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(labels.invalidCredentials);
        return;
      }
      await continueAfterPrimarySignIn(supabase, locale);
    } catch {
      setError(getEmailAuthFailureMessage(mode, labels));
    } finally {
      setIsLoading(false);
    }
  }

  async function resendConfirmation() {
    const supabase = createBrowserSupabaseClient();
    if (!configured || !supabase || !email.trim()) {
      setError(labels.resendFailed);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", localizePath("/account", locale));
      await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: callback.toString() },
      });
      setMessage(labels.confirmationResent);
    } catch {
      setError(labels.resendFailed);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {mode !== "forgot" ? (
        <div className="grid grid-cols-2 border border-[#aeb6ac] bg-white p-1" role="group" aria-label={labels.signInTab}>
          <ModeButton active={mode === "sign-in" || mode === "magic-link"} label={labels.signInTab} onClick={() => selectMode("sign-in")} />
          <ModeButton active={mode === "sign-up"} label={labels.signUpTab} onClick={() => selectMode("sign-up")} />
        </div>
      ) : null}

      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-[#374238]">
          {labels.emailLabel}
          <span className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6f796f]" aria-hidden="true" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder={labels.emailPlaceholder}
              className="h-11 w-full border border-[#aeb6ac] bg-white pl-10 pr-3 text-sm font-normal text-[#111711] outline-none focus:border-[#087b72] focus:ring-2 focus:ring-[#bdebf0]"
            />
          </span>
        </label>

        {mode === "sign-in" || mode === "sign-up" ? (
          <label className="grid gap-2 text-sm font-semibold text-[#374238]">
            {labels.passwordLabel}
            <span className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6f796f]" aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                minLength={8}
                required
                placeholder={labels.passwordPlaceholder}
                className="h-11 w-full border border-[#aeb6ac] bg-white pl-10 pr-11 text-sm font-normal text-[#111711] outline-none focus:border-[#087b72] focus:ring-2 focus:ring-[#bdebf0]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center text-[#59655a] hover:text-[#111711]"
                aria-label={showPassword ? labels.hidePassword : labels.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </label>
        ) : null}

        <button
          type="submit"
          disabled={!configured || isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72] disabled:cursor-not-allowed disabled:bg-[#aeb6ac]"
        >
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isLoading
            ? labels.working
            : mode === "forgot"
              ? labels.sendReset
              : mode === "sign-up"
                ? labels.signUp
                : mode === "magic-link"
                  ? labels.sendMagicLink
                  : labels.signIn}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {mode !== "forgot" ? (
          <button
            type="button"
            onClick={() => selectMode(mode === "magic-link" ? "sign-in" : "magic-link")}
            className="text-xs font-semibold text-[#087b72] hover:text-[#111711]"
          >
            {mode === "magic-link" ? labels.usePassword : labels.useMagicLink}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => selectMode(mode === "forgot" ? "sign-in" : "forgot")}
          className="text-xs font-semibold text-[#087b72] hover:text-[#111711]"
        >
          {mode === "forgot" ? labels.backToSignIn : labels.forgot}
        </button>
      </div>

      {message ? <p className="mt-4 border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-3 text-sm leading-6 text-[#204e51]" role="status">{message}</p> : null}
      {canResendConfirmation ? (
        <button
          type="button"
          onClick={resendConfirmation}
          disabled={isLoading}
          className="mt-3 text-xs font-semibold text-[#087b72] hover:text-[#111711] disabled:text-[#778177]"
        >
          {labels.resendConfirmation}
        </button>
      ) : null}
      {error ? <p className="mt-4 border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#7a2b23]" role="alert">{error}</p> : null}
    </div>
  );
}

async function continueAfterPrimarySignIn(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
  locale: SiteLocale,
) {
  const accountLocale = await resolveAuthenticatedLocale(supabase.auth, locale);
  persistBrowserSiteLocale(accountLocale);
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const accountPath = localizePath("/account", accountLocale);
  if (data?.currentLevel === "aal1" && data.nextLevel === "aal2") {
    const challengePath = localizePath("/auth/mfa", accountLocale);
    window.location.assign(`${challengePath}?next=${encodeURIComponent(accountPath)}`);
    return;
  }
  window.location.assign(accountPath);
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 px-3 text-sm font-semibold ${active ? "bg-[#111711] text-white" : "text-[#4f5a50] hover:bg-[#eef1eb]"}`}
    >
      {label}
    </button>
  );
}
