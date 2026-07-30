import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { areAccountsEnabled } from "@/lib/accounts/config";
import { accountEn, type AccountDictionary } from "@/lib/i18n/account-en";
import { accountNl } from "@/lib/i18n/account-nl";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";
import {
  isExtensionPairingId,
  normalizeExtensionPairingUserCode,
} from "@/lib/extension-pairing";
import { createAccountMutationToken } from "@/lib/security/account-mutation-token";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect browser · Maillume",
  robots: { index: false, follow: false },
};

type PairingRow = {
  expires_at: string | null;
  extension_id: string | null;
  extension_version: string | null;
  locale: string | null;
  operation_status: string;
  requested_lifetime_days: number | null;
  requested_name: string | null;
};

export default async function ConnectExtensionPage({
  params,
  searchParams,
}: {
  params: Promise<{ pairingId: string }>;
  searchParams: Promise<{ code?: string; result?: string }>;
}) {
  const locale = await getRequestSiteLocale();
  const dictionary = locale === "nl" ? accountNl : accountEn;
  const copy = dictionary.extensionPairing;
  const { pairingId } = await params;
  const query = await searchParams;
  const userCode = normalizeExtensionPairingUserCode(query.code);
  const pagePath = getPagePath(locale, pairingId, userCode);

  if (!areAccountsEnabled()) {
    return <PairingState copy={copy} locale={locale} state="unavailable" />;
  }
  if (!isExtensionPairingId(pairingId) || !userCode) {
    return <PairingState copy={copy} locale={locale} state="invalid" />;
  }
  if (
    query.result === "approved"
    || query.result === "denied"
    || query.result === "mfa_required"
  ) {
    return <PairingState copy={copy} locale={locale} state={query.result} />;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    const signInUrl = new URL(localizePath("/auth/sign-in", locale), "https://maillume.invalid");
    signInUrl.searchParams.set("next", pagePath);
    redirect(`${signInUrl.pathname}${signInUrl.search}`);
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const signInUrl = new URL(localizePath("/auth/sign-in", locale), "https://maillume.invalid");
    signInUrl.searchParams.set("next", pagePath);
    redirect(`${signInUrl.pathname}${signInUrl.search}`);
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    !assuranceError
    && assurance?.currentLevel === "aal1"
    && assurance.nextLevel === "aal2"
  ) {
    const mfaUrl = new URL(localizePath("/auth/mfa", locale), "https://maillume.invalid");
    mfaUrl.searchParams.set("next", pagePath);
    redirect(`${mfaUrl.pathname}${mfaUrl.search}`);
  }
  if (assuranceError || assurance?.currentLevel !== "aal2") {
    return <PairingState copy={copy} locale={locale} state="mfa_required" />;
  }

  const admin = createSupabaseAdminClient();
  const adminConfig = getSupabaseAdminConfig();
  if (!admin || !adminConfig) {
    return <PairingState copy={copy} locale={locale} state="unavailable" />;
  }

  const { data: pairingData, error: pairingError } = await admin.rpc(
    "inspect_extension_pairing",
    { p_pairing_id: pairingId, p_user_code: userCode },
  );
  const pairing = (pairingData as PairingRow[] | null)?.[0];
  if (pairingError || !pairing) {
    return <PairingState copy={copy} locale={locale} state="unavailable" />;
  }
  if (pairing.operation_status === "invalid") {
    return <PairingState copy={copy} locale={locale} state="invalid" />;
  }
  if (pairing.operation_status === "expired") {
    return <PairingState copy={copy} locale={locale} state="expired" />;
  }
  if (pairing.operation_status === "denied") {
    return <PairingState copy={copy} locale={locale} state="denied" />;
  }
  if (pairing.operation_status === "approved" || pairing.operation_status === "redeemed") {
    return <PairingState copy={copy} locale={locale} state="approved" />;
  }
  if (
    pairing.operation_status !== "pending"
    || !pairing.requested_name
    || !pairing.requested_lifetime_days
    || !pairing.extension_version
  ) {
    return <PairingState copy={copy} locale={locale} state="unavailable" />;
  }

  const csrf = createAccountMutationToken(
    "extension-pairing",
    { userId: data.user.id, lastSignInAt: data.user.last_sign_in_at },
    adminConfig.secretKey,
  );

  return (
    <PairingShell locale={locale}>
      <KeyRound className="h-6 w-6 text-[#087b72]" aria-hidden="true" />
      <p className="mt-6 font-mono text-[10px] uppercase text-[#087b72]">{copy.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-[#111711]">{copy.title}</h1>
      <p className="mt-4 text-sm leading-7 text-[#59655a]">{copy.intro}</p>

      <section className="mt-7 border border-[#aeb6ac] bg-[#eef1eb] p-5">
        <h2 className="font-semibold text-[#111711]">{copy.requestTitle}</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <PairingDetail label={copy.deviceName} value={pairing.requested_name} />
          <PairingDetail label={copy.extensionVersion} value={pairing.extension_version} />
          <PairingDetail
            label={copy.lifetime}
            value={`${pairing.requested_lifetime_days} ${copy.days}`}
          />
        </dl>
      </section>

      <p className="mt-5 flex gap-3 border-l-4 border-[#087b72] bg-[#eaf6f5] px-4 py-3 text-xs leading-6 text-[#204e51]">
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        {copy.securityNote}
      </p>

      <form
        action={`/account/connect-extension/${encodeURIComponent(pairingId)}/resolve`}
        method="post"
        className="mt-7 grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="code" value={userCode} />
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          name="decision"
          value="approve"
          className="h-11 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72]"
        >
          {copy.approve}
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="h-11 border border-[#111711] px-4 text-sm font-semibold text-[#111711] hover:bg-[#eef1eb]"
        >
          {copy.deny}
        </button>
      </form>
    </PairingShell>
  );
}

function PairingDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#cbd0c5] pb-2">
      <dt className="text-[#59655a]">{label}</dt>
      <dd className="text-right font-semibold text-[#111711]">{value}</dd>
    </div>
  );
}

function PairingState({
  copy,
  locale,
  state,
}: {
  copy: AccountDictionary["extensionPairing"];
  locale: "en" | "nl";
  state: "approved" | "denied" | "expired" | "invalid" | "mfa_required" | "unavailable";
}) {
  const content = {
    approved: [copy.approvedTitle, copy.approvedBody],
    denied: [copy.deniedTitle, copy.deniedBody],
    expired: [copy.expiredTitle, copy.expiredBody],
    mfa_required: [copy.mfaRequiredTitle, copy.mfaRequiredBody],
    invalid: [copy.invalidTitle, copy.invalidBody],
    unavailable: [copy.unavailableTitle, copy.unavailableBody],
  }[state];

  return (
    <PairingShell locale={locale}>
      <ShieldCheck className="h-6 w-6 text-[#087b72]" aria-hidden="true" />
      <p className="mt-6 font-mono text-[10px] uppercase text-[#087b72]">{copy.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-[#111711]">{content[0]}</h1>
      <p className="mt-4 text-sm leading-7 text-[#59655a]">{content[1]}</p>
      <Link
        href={localizePath("/account", locale)}
        className="mt-7 inline-flex h-11 items-center bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72]"
      >
        {locale === "nl" ? "Naar account" : "Go to account"}
      </Link>
    </PairingShell>
  );
}

function PairingShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: "en" | "nl";
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1eb] px-5 py-12">
      <section className="w-full max-w-lg border border-[#aeb6ac] bg-white p-7 shadow-[0_24px_70px_rgba(17,23,17,0.12)] sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <span className="font-mono text-[10px] uppercase text-[#59655a]">{locale}</span>
        </div>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function getPagePath(locale: "en" | "nl", pairingId: string, userCode: string | null) {
  const pageUrl = new URL(
    localizePath(`/account/connect-extension/${encodeURIComponent(pairingId)}`, locale),
    "https://maillume.invalid",
  );
  if (userCode) pageUrl.searchParams.set("code", userCode);
  return `${pageUrl.pathname}${pageUrl.search}`;
}
