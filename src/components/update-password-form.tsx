"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";

import type { AccountDictionary } from "@/lib/i18n/account-en";
import { localizePath, type SiteLocale } from "@/lib/i18n/site-locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function UpdatePasswordForm({
  configured,
  labels,
  locale,
}: {
  configured: boolean;
  labels: AccountDictionary["signIn"]["email"];
  locale: SiteLocale;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!configured || !supabase) {
      setError(labels.unavailable);
      return;
    }

    setIsLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(labels.updateFailed);
      setIsLoading(false);
      return;
    }

    setMessage(labels.updated);
    window.setTimeout(() => window.location.assign(localizePath("/account", locale)), 800);
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-semibold text-[#374238]">
        {labels.passwordLabel}
        <span className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6f796f]" aria-hidden="true" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
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
      <button type="submit" disabled={isLoading} className="inline-flex h-11 items-center justify-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72] disabled:bg-[#aeb6ac]">
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isLoading ? labels.working : labels.update}
      </button>
      {message ? <p className="border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-3 text-sm text-[#204e51]" role="status">{message}</p> : null}
      {error ? <p className="border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm text-[#7a2b23]" role="alert">{error}</p> : null}
    </form>
  );
}
