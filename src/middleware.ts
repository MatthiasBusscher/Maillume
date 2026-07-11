import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const isAppHostname = hostname.startsWith("app.");
  const targetUrl = request.nextUrl.clone();

  if (hostname === "maillume.nl" || hostname === "www.maillume.nl" || hostname === "www.maillume.io") {
    targetUrl.protocol = "https:";
    targetUrl.hostname = "maillume.io";
    targetUrl.port = "";
    return NextResponse.redirect(targetUrl, 301);
  }

  if (isAppHostname && targetUrl.pathname === "/") {
    targetUrl.pathname = "/app";
  }

  let response = isAppHostname && request.nextUrl.pathname === "/"
    ? NextResponse.rewrite(targetUrl)
    : NextResponse.next({ request });

  const config = getPublicSupabaseConfig();

  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        const nextResponse = isAppHostname && request.nextUrl.pathname === "/"
          ? NextResponse.rewrite(targetUrl)
          : NextResponse.next({ request });

        cookiesToSet.forEach(({ name, options, value }) => {
          nextResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          nextResponse.headers.set(name, value);
        });
        response = nextResponse;
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Authentication is optional; an auth outage must not block anonymous scanning.
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
