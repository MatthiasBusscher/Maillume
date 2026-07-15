"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";

import type { AccountDictionary } from "@/lib/i18n/account-en";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function MfaChallengeForm({
  labels,
  nextPath,
}: {
  labels: AccountDictionary["signIn"]["mfa"];
  nextPath: string;
}) {
  const [code, setCode] = useState("");
  const [factors, setFactors] = useState<Array<{ id: string; friendly_name?: string }>>([]);
  const [factorId, setFactorId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(labels.unavailable);
      return;
    }
    void supabase.auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      if (factorsError || !data.totp.length) {
        setError(labels.unavailable);
        return;
      }
      setFactors(data.totp);
      setFactorId(data.totp[0].id);
    });
  }, [labels.unavailable]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(labels.unavailable);
      return;
    }

    setIsLoading(true);
    setError("");
    if (!factorId) {
      setError(labels.unavailable);
      setIsLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s/g, ""),
    });
    if (verifyError) {
      setError(labels.invalid);
      setIsLoading(false);
      return;
    }
    window.location.assign(nextPath);
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={verify}>
      {factors.length > 1 ? (
        <label className="grid gap-2 text-sm font-semibold text-[#374238]">
          {labels.factor}
          <select value={factorId} onChange={(event) => setFactorId(event.target.value)} className="h-11 border border-[#aeb6ac] bg-white px-3 text-sm font-normal text-[#111711] outline-none focus:border-[#087b72]">
            {factors.map((factor, index) => (
              <option key={factor.id} value={factor.id}>{factor.friendly_name || `${labels.factor} ${index + 1}`}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold text-[#374238]">
        {labels.code}
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          required
          className="h-12 border border-[#aeb6ac] bg-white px-4 font-mono text-xl text-[#111711] outline-none focus:border-[#087b72] focus:ring-2 focus:ring-[#bdebf0]"
        />
      </label>
      <button type="submit" disabled={isLoading || code.length !== 6} className="inline-flex h-11 items-center justify-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72] disabled:bg-[#aeb6ac]">
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4 text-[#dfff52]" aria-hidden="true" />}
        {isLoading ? labels.verifying : labels.verify}
      </button>
      {error ? <p className="border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#7a2b23]" role="alert">{error}</p> : null}
    </form>
  );
}
