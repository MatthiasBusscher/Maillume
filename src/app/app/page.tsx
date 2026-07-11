import type { Metadata } from "next";

import { ScannerPage } from "@/components/home-page";
import { isFeedbackEnabled } from "@/lib/feedback/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email scanner",
  description: "Check suspicious email text, screenshots, and .eml files with Maillume.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <ScannerPage
      feedbackEnabled={isFeedbackEnabled()}
      userEmail={data.user?.email}
    />
  );
}
