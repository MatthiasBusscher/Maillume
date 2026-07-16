"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, LoaderCircle, ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";

import type { AccountDictionary } from "@/lib/i18n/account-en";
import { localizePath, type SiteLocale } from "@/lib/i18n/site-locale";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type SecurityLabels = AccountDictionary["account"]["security"];
type TotpFactor = { id: string; friendly_name?: string };
type Passkey = { id: string; friendly_name?: string; created_at: string };
type Enrollment = { id: string; qrCode: string; secret: string };

export function MfaSessionGate({ children, labels, locale }: { children: ReactNode; labels: SecurityLabels; locale: SiteLocale }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setFailed(true);
      return;
    }
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (error || !data?.currentLevel || !data.nextLevel) {
        setFailed(true);
        return;
      }
      if (data?.currentLevel === "aal1" && data.nextLevel === "aal2") {
        const accountPath = localizePath("/account", locale);
        window.location.replace(`${localizePath("/auth/mfa", locale)}?next=${encodeURIComponent(accountPath)}`);
        return;
      }
      setReady(true);
    }).catch(() => setFailed(true));
  }, [locale]);

  if (failed) return <p className="mt-10 border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm text-[#7a2b23]" role="alert">{labels.securityUnavailable}</p>;
  if (!ready) {
    return <p className="mt-10 flex items-center gap-2 text-sm text-[#59655a]"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> {labels.loading}</p>;
  }
  return children;
}

export function AccountSecurityManager({ canManage, labels, passkeysEnabled }: { canManage: boolean; labels: SecurityLabels; passkeysEnabled: boolean }) {
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSecurity = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const factors = await supabase.auth.mfa.listFactors();
    if (!factors.error) setTotpFactors(factors.data.totp);
    if (passkeysEnabled) {
      const listedPasskeys = await supabase.auth.passkey.list();
      if (!listedPasskeys.error) setPasskeys(listedPasskeys.data);
    }
    setIsLoading(false);
  }, [passkeysEnabled]);

  useEffect(() => {
    if (canManage) void loadSecurity();
    else setIsLoading(false);
  }, [canManage, loadSecurity]);

  if (!canManage) {
    return (
      <section className="mt-10 border-l-4 border-[#c78c32] bg-[#fff0cf] px-5 py-4">
        <h2 className="font-semibold text-[#5f4111]">{labels.recentAuthTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#714812]">{labels.recentAuthBody}</p>
      </section>
    );
  }

  async function startTotpEnrollment() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setError("");
    setIsLoading(true);
    const factors = await supabase.auth.mfa.listFactors();
    if (!factors.error) {
      const stale = factors.data.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified");
      await Promise.all(stale.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })));
    }
    const verifiedCount = factors.data?.totp.length ?? 0;
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Maillume authenticator ${verifiedCount + 1}`,
    });
    if (enrollError) {
      setError(labels.mfaFailed);
      setIsLoading(false);
      return;
    }
    setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setIsLoading(false);
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !enrollment) return;
    setError("");
    setIsLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code });
    if (verifyError) {
      setError(labels.mfaFailed);
      setIsLoading(false);
      return;
    }
    setEnrollment(null);
    setCode("");
    window.location.reload();
  }

  async function removeTotp(factorId: string) {
    if (!window.confirm(labels.disableMfaConfirm)) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setError("");
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId });
    if (removeError) setError(labels.mfaFailed);
    await loadSecurity();
  }

  async function registerPasskey() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setError("");
    setIsLoading(true);
    const { error: registrationError } = await supabase.auth.registerPasskey();
    if (registrationError) setError(labels.passkeyFailed);
    await loadSecurity();
  }

  async function removePasskey(passkeyId: string) {
    if (!window.confirm(labels.removePasskeyConfirm)) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setError("");
    const { error: removeError } = await supabase.auth.passkey.delete({ passkeyId });
    if (removeError) setError(labels.passkeyFailed);
    await loadSecurity();
  }

  return (
    <section className="mt-10 border border-[#aeb6ac] bg-white p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase text-[#087b72]">{labels.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-[#111711]">{labels.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59655a]">{labels.body}</p>
      <div className="mt-7 grid gap-7 lg:grid-cols-2">
        <div className="border-t-4 border-[#087b72] bg-[#f5f7f2] p-5">
          <ShieldCheck className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-[#111711]">{labels.mfaTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#59655a]">{labels.mfaBody}</p>
          {totpFactors.length ? (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold text-[#245b61]">{labels.mfaEnabled}</p>
              {totpFactors.map((factor) => (
                <div key={factor.id} className="flex items-center justify-between gap-3 border border-[#cbd0c5] bg-white px-3 py-2 text-sm">
                  <span>{factor.friendly_name || labels.mfaTitle}</span>
                  <button type="button" onClick={() => removeTotp(factor.id)} className="flex h-9 w-9 items-center justify-center text-[#8f251b] hover:bg-[#fff0ed]" title={labels.disableMfa}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{labels.disableMfa}</span>
                  </button>
                </div>
              ))}
              {totpFactors.length < 10 ? (
                <button type="button" onClick={startTotpEnrollment} disabled={isLoading} className="mt-3 inline-flex h-10 items-center gap-2 border border-[#111711] bg-white px-4 text-sm font-semibold text-[#111711] hover:bg-[#eef1eb] disabled:text-[#778177]"><ShieldPlus className="h-4 w-4 text-[#087b72]" aria-hidden="true" /> {labels.addBackupMfa}</button>
              ) : null}
            </div>
          ) : enrollment ? (
            <form className="mt-5" onSubmit={verifyTotp}>
              <p className="text-sm leading-6 text-[#455045]">{labels.scanQr}</p>
              {/* Supabase returns the QR code as a short-lived SVG data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qrCode} alt={labels.scanQr} width={192} height={192} className="mt-4 border border-[#aeb6ac] bg-white p-2" />
              <p className="mt-3 text-xs font-semibold text-[#59655a]">{labels.manualSecret}</p>
              <code className="mt-1 block break-all border border-[#cbd0c5] bg-white p-2 text-xs text-[#111711]">{enrollment.secret}</code>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-[#374238]">
                {labels.verificationCode}
                <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="h-11 border border-[#aeb6ac] bg-white px-3 font-mono text-lg outline-none focus:border-[#087b72]" />
              </label>
              <button type="submit" disabled={isLoading || code.length !== 6} className="mt-4 inline-flex h-10 items-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white disabled:bg-[#aeb6ac]"><ShieldPlus className="h-4 w-4 text-[#dfff52]" aria-hidden="true" /> {labels.verifyMfa}</button>
            </form>
          ) : (
            <button type="button" onClick={startTotpEnrollment} disabled={isLoading} className="mt-5 inline-flex h-10 items-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72] disabled:bg-[#aeb6ac]"><ShieldPlus className="h-4 w-4 text-[#dfff52]" aria-hidden="true" /> {labels.enableMfa}</button>
          )}
        </div>
        <div className="border-t-4 border-[#dfff52] bg-[#f5f7f2] p-5">
          <KeyRound className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-[#111711]">{labels.passkeyTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#59655a]">{labels.passkeyBody}</p>
          {passkeysEnabled ? (
            <>
              <div className="mt-5 space-y-2">
                {passkeys.length ? passkeys.map((passkey) => (
                  <div key={passkey.id} className="flex items-center justify-between gap-3 border border-[#cbd0c5] bg-white px-3 py-2 text-sm">
                    <span>{passkey.friendly_name || labels.passkeyTitle}</span>
                    <button type="button" onClick={() => removePasskey(passkey.id)} className="flex h-9 w-9 items-center justify-center text-[#8f251b] hover:bg-[#fff0ed]" title={labels.removePasskey}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{labels.removePasskey}</span>
                    </button>
                  </div>
                )) : <p className="text-sm text-[#59655a]">{labels.noPasskeys}</p>}
              </div>
              <button type="button" onClick={registerPasskey} disabled={isLoading} className="mt-5 inline-flex h-10 items-center gap-2 border border-[#111711] bg-white px-4 text-sm font-semibold text-[#111711] hover:bg-[#eef1eb] disabled:text-[#778177]"><KeyRound className="h-4 w-4 text-[#087b72]" aria-hidden="true" /> {labels.addPasskey}</button>
            </>
          ) : <p className="mt-5 text-sm text-[#59655a]">{labels.passkeyDisabled}</p>}
        </div>
      </div>
      {isLoading ? <p className="mt-4 flex items-center gap-2 text-sm text-[#59655a]"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> {labels.loading}</p> : null}
      {error ? <p className="mt-4 border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm text-[#7a2b23]" role="alert">{error}</p> : null}
    </section>
  );
}
