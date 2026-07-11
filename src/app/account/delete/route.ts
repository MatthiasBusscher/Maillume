import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");

  if (origin && !isSameOrigin(origin, requestUrl.origin)) {
    return privateResponse("Cross-origin account deletion is not allowed.", 403);
  }

  const formData = await request.formData();

  if (formData.get("confirm") !== "delete") {
    return privateRedirect(new URL("/account?error=confirmation_required", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();

  if (!supabase) {
    return privateRedirect(new URL("/auth/sign-in", requestUrl.origin));
  }

  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    return privateRedirect(new URL("/auth/sign-in", requestUrl.origin));
  }

  if (!admin) {
    return privateRedirect(new URL("/account?error=deletion_unavailable", requestUrl.origin));
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(data.user.id);

  if (deletionError) {
    return privateRedirect(new URL("/account?error=deletion_failed", requestUrl.origin));
  }

  await supabase.auth.signOut({ scope: "local" });
  return privateRedirect(new URL("/auth/sign-in?deleted=1", requestUrl.origin));
}

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  applyPrivateHeaders(response);
  return response;
}

function privateResponse(message: string, status: number) {
  const response = new NextResponse(message, { status });
  applyPrivateHeaders(response);
  return response;
}

function applyPrivateHeaders(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
}

function isSameOrigin(candidate: string, expected: string) {
  try {
    return new URL(candidate).origin === expected;
  } catch {
    return false;
  }
}
