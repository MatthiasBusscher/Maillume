"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AccountDictionary } from "@/lib/i18n/account-en";

export function GoogleSignInButton({ configured, labels }: { configured: boolean; labels: AccountDictionary["signIn"]["google"] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError(labels.unavailable);
      return;
    }

    setIsLoading(true);
    setError("");

    const redirectTo = new URL("/auth/callback", window.location.origin);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (signInError) {
      setError(labels.failed);
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={!configured || isLoading}
        className="inline-flex h-12 w-full items-center justify-center gap-3 border border-[#111711] bg-white px-5 text-sm font-semibold text-[#111711] transition hover:bg-[#eef1eb] disabled:cursor-not-allowed disabled:border-[#aeb6ac] disabled:text-[#778177]"
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <GoogleMark />
        )}
        {isLoading ? labels.opening : labels.continue}
      </button>
      {!configured ? (
        <p className="mt-3 text-xs leading-5 text-[#687268]">
          {labels.notConfigured}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs leading-5 text-[#b2382b]" role="alert">{error}</p> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="flex h-5 w-5 items-center justify-center border border-[#cbd0c5] font-mono text-xs font-bold text-[#087b72]" aria-hidden="true">
      G
    </span>
  );
}
