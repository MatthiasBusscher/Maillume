import type { Metadata } from "next";
import Script from "next/script";

import { OutlookIntegration } from "@/components/outlook-integration";

export const metadata: Metadata = {
  title: "Outlook integration",
  robots: { index: false, follow: false },
};

export default function OutlookIntegrationPage() {
  return (
    <main className="min-h-screen bg-[#eef1eb]">
      <Script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" strategy="afterInteractive" />
      <OutlookIntegration />
    </main>
  );
}
