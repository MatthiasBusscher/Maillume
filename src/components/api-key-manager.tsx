"use client";

import { Check, Copy, Eye, EyeOff, KeyRound, Plus, RotateCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  AccountApiUsage,
  ApiKeyLifetimeDays,
  ApiKeyStatus,
  PublicApiKey,
} from "@/lib/api-keys";
import type { AccountDictionary } from "@/lib/i18n/account-en";
import type { SiteLocale } from "@/lib/i18n/site-locale";

const KEY_LIFETIMES = [30, 90, 180] satisfies readonly ApiKeyLifetimeDays[];

type ApiKeysPayload = {
  error?: string;
  keys?: PublicApiKey[];
  plaintext?: string;
  usage?: AccountApiUsage;
};

const statusStyles: Record<ApiKeyStatus, string> = {
  active: "border-[#85b9b3] bg-[#eaf6f5] text-[#17645e]",
  expired: "border-[#c7a86c] bg-[#fff8e8] text-[#795b1b]",
  revoked: "border-[#d08b82] bg-[#fff0ed] text-[#8f251b]",
};

export function ApiKeyManager({ labels, locale }: { labels: AccountDictionary["apiKeys"]; locale: SiteLocale }) {
  const [keys, setKeys] = useState<PublicApiKey[]>([]);
  const [usage, setUsage] = useState<AccountApiUsage>();
  const [name, setName] = useState<string>(labels.defaultName);
  const [lifetimeDays, setLifetimeDays] = useState<ApiKeyLifetimeDays>(90);
  const [plaintext, setPlaintext] = useState<string>();
  const [plaintextVisible, setPlaintextVisible] = useState(false);
  const [message, setMessage] = useState<string>(labels.loading);
  const [busy, setBusy] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const response = await fetch("/account/api-keys", { cache: "no-store" });
      const payload = await readPayload(response);
      if (!response.ok) return setMessage(payload.error ?? labels.unavailable);

      const nextKeys = payload.keys ?? [];
      setKeys(nextKeys);
      setUsage(payload.usage);
      setMessage(nextKeys.length ? "" : labels.empty);
    } catch {
      setMessage(labels.unavailable);
    }
  }, [labels.empty, labels.unavailable]);

  useEffect(() => { void loadKeys(); }, [loadKeys]);

  async function createKey() {
    setBusy(true);
    setPlaintext(undefined);
    setPlaintextVisible(false);
    setMessage("");

    try {
      const response = await fetch("/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lifetimeDays }),
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.plaintext) {
        return setMessage(payload.error ?? labels.creationFailed);
      }

      setPlaintext(payload.plaintext);
      setName(labels.defaultName);
      await loadKeys();
    } catch {
      setMessage(labels.creationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function rotateKey(id: string) {
    if (!window.confirm(labels.rotateConfirmation)) return;

    setBusy(true);
    setPlaintext(undefined);
    setPlaintextVisible(false);
    setMessage("");

    try {
      const response = await fetch("/account/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lifetimeDays }),
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.plaintext) {
        return setMessage(payload.error ?? labels.rotationFailed);
      }

      setPlaintext(payload.plaintext);
      await loadKeys();
      setMessage(labels.rotated);
    } catch {
      setMessage(labels.rotationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/account/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await readPayload(response);
      if (!response.ok) return setMessage(payload.error ?? labels.revocationFailed);
      await loadKeys();
    } catch {
      setMessage(labels.revocationFailed);
    } finally {
      setBusy(false);
    }
  }

  async function copyPlaintext() {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setMessage(labels.copied);
  }

  const usagePercent = usage && usage.monthly_quota > 0
    ? Math.min(100, Math.round((usage.request_count / usage.monthly_quota) * 100))
    : 0;
  const remainingRequests = usage
    ? Math.max(0, usage.monthly_quota - usage.request_count)
    : 0;

  return (
    <section className="mt-10 border border-[#111711] bg-white">
      <div className="border-b border-[#aeb6ac] p-6">
        <KeyRound className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold">{labels.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59655a]">{labels.description}</p>
        <p className="mt-3 max-w-2xl border-l-4 border-[#087b72] pl-3 text-xs leading-5 text-[#59655a]">{labels.limitsNote}</p>
      </div>

      {usage ? (
        <div className="grid gap-5 border-b border-[#aeb6ac] bg-[#f5f7f2] p-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">{labels.monthlyUsage}</p>
            <p className="mt-2 text-sm font-semibold text-[#111711]">
              {labels.usagePeriod}: {formatPeriod(usage.period_start, locale)}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#59655a]">{labels.usageDescription}</p>
          </div>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[#4f5b50]">
              <span className="font-semibold text-[#111711]">
                {usage.request_count.toLocaleString(locale)} / {usage.monthly_quota.toLocaleString(locale)} {labels.requests}
              </span>
              <span>{remainingRequests.toLocaleString(locale)} {labels.remaining}</span>
            </div>
            <div
              role="progressbar"
              aria-label={labels.monthlyUsage}
              aria-valuemin={0}
              aria-valuemax={usage.monthly_quota}
              aria-valuenow={Math.min(usage.request_count, usage.monthly_quota)}
              className="mt-2 h-2 overflow-hidden bg-[#d8dcd3]"
            >
              <span className="block h-full bg-[#087b72]" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 border-b border-[#aeb6ac] p-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <label className="grid gap-2 text-xs font-semibold text-[#4f5b50]">
          {labels.keyName}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="h-11 border border-[#aeb6ac] px-3 text-sm text-[#111711]" />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-[#4f5b50]">
          {labels.lifetime}
          <select
            value={lifetimeDays}
            onChange={(event) => setLifetimeDays(parseLifetime(event.target.value))}
            className="h-11 border border-[#aeb6ac] bg-white px-3 text-sm text-[#111711]"
          >
            <option value={30}>{labels.lifetimes.days30}</option>
            <option value={90}>{labels.lifetimes.days90}</option>
            <option value={180}>{labels.lifetimes.days180}</option>
          </select>
        </label>
        <button type="button" onClick={createKey} disabled={busy || !name.trim()} className="inline-flex h-11 items-center justify-center gap-2 self-end bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72] disabled:opacity-50">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {labels.create}
        </button>
        <p className="text-xs leading-5 text-[#59655a] sm:col-span-2 lg:col-span-3">{labels.lifetimeHelp}</p>
      </div>

      {plaintext ? (
        <div className="border-b border-[#aeb6ac] bg-[#dfff52] p-6">
          <p className="font-semibold">{labels.copyWarning}</p>
          <div className="mt-3 flex gap-2">
            <input readOnly type={plaintextVisible ? "text" : "password"} value={plaintext} className="h-11 min-w-0 flex-1 border border-[#111711] bg-white px-3 font-mono text-xs" aria-label={labels.copyTitle} />
            <button type="button" onClick={() => setPlaintextVisible((visible) => !visible)} title={plaintextVisible ? labels.hideTitle : labels.revealTitle} aria-label={plaintextVisible ? labels.hideTitle : labels.revealTitle} className="grid h-11 w-11 flex-none place-items-center border border-[#111711] bg-white">
              {plaintextVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="button" onClick={copyPlaintext} title={labels.copyTitle} aria-label={labels.copyTitle} className="grid h-11 w-11 flex-none place-items-center border border-[#111711] bg-white">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {keys.length ? (
        <div className="border-b border-[#d8dcd3] bg-[#f9faf7] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#111711]">{labels.savedKeys}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#59655a]">{labels.savedKeysHelp}</p>
        </div>
      ) : null}
      <div className="divide-y divide-[#d8dcd3]">
        {keys.map((key) => (
          <div key={key.id} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{key.name}</p>
                <span className={`border px-2 py-1 font-mono text-[10px] font-semibold uppercase ${statusStyles[key.status]}`}>
                  {labels.statuses[key.status]}
                </span>
              </div>
              <p className="mt-2 font-mono text-[10px] leading-5 text-[#687268]">
                {key.key_prefix}... · {labels.created} {formatDate(key.created_at, locale)} · {labels.expires} {formatDate(key.expires_at, locale)}
              </p>
              {key.rotated_from_id ? <p className="mt-1 text-xs text-[#59655a]">{labels.rotatedReplacement}</p> : null}
            </div>
            {key.status === "active" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => rotateKey(key.id)}
                  disabled={busy}
                  title={labels.rotateTitle}
                  aria-label={`${labels.rotateTitle}: ${key.name}`}
                  className="grid h-10 w-10 place-items-center border border-[#85b9b3] text-[#17645e] hover:bg-[#eaf6f5] disabled:opacity-50"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => revokeKey(key.id)}
                  disabled={busy}
                  title={labels.revokeTitle}
                  aria-label={`${labels.revokeTitle}: ${key.name}`}
                  className="grid h-10 w-10 place-items-center border border-[#d08b82] text-[#8f251b] hover:bg-[#fff0ed] disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p role="status" className="flex min-h-12 items-center gap-2 px-6 text-sm text-[#59655a]">
        {message === labels.copied ? <Check className="h-4 w-4 text-[#087b72]" aria-hidden="true" /> : null}
        {message}
      </p>
    </section>
  );
}

async function readPayload(response: Response): Promise<ApiKeysPayload> {
  try {
    return await response.json() as ApiKeysPayload;
  } catch {
    return {};
  }
}

function parseLifetime(value: string): ApiKeyLifetimeDays {
  const parsed = Number(value) as ApiKeyLifetimeDays;
  return KEY_LIFETIMES.includes(parsed) ? parsed : 90;
}

function formatDate(value: string, locale: SiteLocale): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
}

function formatPeriod(value: string, locale: SiteLocale): string {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const date = new Date(`${normalized.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
