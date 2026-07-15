import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import { isStrictSameOriginMutation } from "@/lib/security/account-request";

export async function POST(request: Request) {
  if (!isStrictSameOriginMutation(request)) {
    return new NextResponse("Cross-origin sign-out is not allowed.", {
      status: 403,
      headers: { "Cache-Control": "private, no-cache, no-store, max-age=0" },
    });
  }
  const supabase = await createServerSupabaseClient();
  await supabase?.auth.signOut();

  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });
  const response = NextResponse.redirect(new URL("/auth/sign-in", publicOrigin), 303);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
