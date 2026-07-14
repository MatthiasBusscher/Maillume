import type { Metadata } from "next";

import { ScannerPage } from "@/components/home-page";
import { isFeedbackEnabled } from "@/lib/feedback/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { getAnalysisMaxRequestBytes } from "@/lib/analysis/request-limits";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestSiteLocale();
  return {
    title: locale === "nl" ? "E-mailscanner" : "Email scanner",
    description: locale === "nl" ? "Controleer verdachte e-mailtekst, screenshots en .eml-bestanden met Maillume." : "Check suspicious email text, screenshots, and .eml files with Maillume.",
    robots: { index: false, follow: false },
  };
}

export default async function AppPage() {
  const locale = await getRequestSiteLocale();
  const supabase = await createServerSupabaseClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <ScannerPage
      feedbackEnabled={isFeedbackEnabled()}
      initialLocale={locale}
      maxRequestBytes={getAnalysisMaxRequestBytes()}
      userEmail={data.user?.email}
    />
  );
}
