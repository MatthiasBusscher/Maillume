import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import { isStrictSameOriginMutation } from "@/lib/security/account-request";
import { areAccountsEnabled } from "@/lib/accounts/config";

export async function POST(request: Request) {
  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });

  if (!isStrictSameOriginMutation(request, publicOrigin)) {
    return new NextResponse("Cross-origin sign-out is not allowed.", {
      status: 403,
      headers: { "Cache-Control": "private, no-cache, no-store, max-age=0" },
    });
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return privateResponse("Sign-out is temporarily unavailable.", 503);
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) {
    return privateResponse("Sign-out could not be completed.", 503);
  }

  const response = NextResponse.redirect(
    new URL(areAccountsEnabled() ? "/auth/sign-in" : "/app", publicOrigin),
    303,
  );
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function privateResponse(message: string, status: number) {
  const response = new NextResponse(message, { status });
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
