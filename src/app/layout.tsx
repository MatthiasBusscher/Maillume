import type { Metadata } from "next";
import "./globals.css";

const title = "Inbox Risk Scanner";
const description =
  "Check suspicious email text, screenshots, and .eml files with a privacy-first automated risk assessment.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  applicationName: title,
  keywords: ["email safety", "phishing", "spam", "email risk assessment"],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_US",
    alternateLocale: ["nl_NL"],
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

function getMetadataBase(): URL {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  return new URL(vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
}
