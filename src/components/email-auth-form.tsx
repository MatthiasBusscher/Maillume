"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

import type { AccountDictionary } from "@/lib/i18n/account-en";
import { localizePath, type SiteLocale } from "@/lib/i18n/site-locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up" | "forgot";

export function EmailAuthForm({
  configured,
  labels,
  locale,
}: {
  configured: boolean;
  labels: AccountDictionary["signIn"]["email"];
  locale: SiteLocale;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setError("");
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

    try {
      if (mode === "forgot") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", localizePath("/auth/update-password", locale));
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callback.toString(),
        });
        setMessage(labels.resetSent);
        return;
      }

      if (mode === "sign-up") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", localizePath("/account", locale));
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callback.toString() },
        });
        if (signUpError) {
          setError(labels.signUpFailed);
          return;
        }
        if (data.session) {
          await continueAfterPrimarySignIn(supabase, locale);
          return;
        }
        setMessage(labels.confirmEmail);
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
      setError(mode === "sign-up" ? labels.signUpFailed : labels.invalidCredentials);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {mode !== "forgot" ? (
        <div className="grid grid-cols-2 border border-[#aeb6ac] bg-white p-1" role="group" aria-label={labels.signInTab}>
          <ModeButton active={mode === "sign-in"} label={labels.signInTab} onClick={() => selectMode("sign-in")} />
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

        {mode !== "forgot" ? (
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
          {isLoading ? labels.working : mode === "forgot" ? labels.sendReset : mode === "sign-up" ? labels.signUp : labels.signIn}
        </button>
      </form>

      <button
        type="button"
        onClick={() => selectMode(mode === "forgot" ? "sign-in" : "forgot")}
        className="mt-4 text-xs font-semibold text-[#087b72] hover:text-[#111711]"
      >
        {mode === "forgot" ? labels.backToSignIn : labels.forgot}
      </button>

      {message ? <p className="mt-4 border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-3 text-sm leading-6 text-[#204e51]" role="status">{message}</p> : null}
      {error ? <p className="mt-4 border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#7a2b23]" role="alert">{error}</p> : null}
    </div>
  );
}

async function continueAfterPrimarySignIn(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
  locale: SiteLocale,
) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const accountPath = localizePath("/account", locale);
  if (data?.currentLevel === "aal1" && data.nextLevel === "aal2") {
    const challengePath = localizePath("/auth/mfa", locale);
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
