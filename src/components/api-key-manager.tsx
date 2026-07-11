"use client";

import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { PublicApiKey } from "@/lib/api-keys";
import type { AccountDictionary } from "@/lib/i18n/account-en";
import type { SiteLocale } from "@/lib/i18n/site-locale";

export function ApiKeyManager({ labels, locale }: { labels: AccountDictionary["apiKeys"]; locale: SiteLocale }) {
  const [keys, setKeys] = useState<PublicApiKey[]>([]);
  const [name, setName] = useState<string>(labels.defaultName);
  const [plaintext, setPlaintext] = useState<string>();
  const [message, setMessage] = useState<string>(labels.loading);
  const [busy, setBusy] = useState(false);

  const loadKeys = useCallback(async () => {
    const response = await fetch("/account/api-keys", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? labels.unavailable);
    setKeys(payload.keys);
    setMessage(payload.keys.length ? "" : labels.empty);
  }, [labels.empty, labels.unavailable]);

  useEffect(() => { void loadKeys(); }, [loadKeys]);

  async function createKey() {
    setBusy(true); setPlaintext(undefined); setMessage("");
    const response = await fetch("/account/api-keys", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error ?? labels.creationFailed);
    setPlaintext(payload.plaintext);
    setName(labels.defaultName);
    await loadKeys();
  }

  async function revokeKey(id: string) {
    setBusy(true); setMessage("");
    const response = await fetch("/account/api-keys", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error ?? labels.revocationFailed);
    await loadKeys();
  }

  async function copyPlaintext() {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setMessage(labels.copied);
  }

  return (
    <section className="mt-10 border border-[#111711] bg-white">
      <div className="border-b border-[#aeb6ac] p-6">
        <KeyRound className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold">{labels.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59655a]">{labels.description}</p>
      </div>

      <div className="grid gap-3 border-b border-[#aeb6ac] p-6 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-2 text-xs font-semibold text-[#4f5b50]">{labels.keyName}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="h-11 border border-[#aeb6ac] px-3 text-sm text-[#111711]" />
        </label>
        <button type="button" onClick={createKey} disabled={busy || !name.trim()} className="inline-flex h-11 items-center justify-center gap-2 self-end bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72] disabled:opacity-50"><Plus className="h-4 w-4" /> {labels.create}</button>
      </div>

      {plaintext ? (
        <div className="border-b border-[#aeb6ac] bg-[#dfff52] p-6">
          <p className="font-semibold">{labels.copyWarning}</p>
          <div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto border border-[#111711] bg-white p-3 text-xs">{plaintext}</code><button type="button" onClick={copyPlaintext} title={labels.copyTitle} className="grid h-11 w-11 flex-none place-items-center border border-[#111711] bg-white"><Copy className="h-4 w-4" /></button></div>
        </div>
      ) : null}

      <div className="divide-y divide-[#d8dcd3]">
        {keys.map((key) => (
          <div key={key.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div><p className="font-semibold">{key.name}</p><p className="mt-1 font-mono text-[10px] text-[#687268]">{key.key_prefix}... · {labels.created} {new Date(key.created_at).toLocaleDateString(locale)}</p></div>
            <p className="text-xs text-[#4f5b50]">{key.usage} / {key.monthly_quota} {labels.thisMonth}</p>
            {key.revoked_at ? <span className="text-xs font-semibold text-[#8f251b]">{labels.revoked}</span> : <button type="button" onClick={() => revokeKey(key.id)} disabled={busy} title={labels.revokeTitle} className="grid h-10 w-10 place-items-center border border-[#d08b82] text-[#8f251b] hover:bg-[#fff0ed]"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
      <p role="status" className="flex min-h-12 items-center gap-2 px-6 text-sm text-[#59655a]">{message === labels.copied ? <Check className="h-4 w-4 text-[#087b72]" /> : null}{message}</p>
    </section>
  );
}
