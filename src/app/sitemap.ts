import type { MetadataRoute } from "next";

const publicRoutes = ["", "/chrome-extension", "/platform", "/pricing", "/privacy", "/resources/odido-phishing-incident", "/security", "/self-hosted", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://maillume.io";
  const lastModified = new Date("2026-07-22T00:00:00.000Z");

  return publicRoutes.flatMap((route) => {
    const englishUrl = `${baseUrl}${route}`;
    const dutchUrl = `${baseUrl}/nl${route}`;
    const shared = {
      lastModified,
      changeFrequency: (route === "" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: route === "" ? 1 : route === "/pricing" ? 0.8 : 0.7,
      alternates: { languages: { en: englishUrl, nl: dutchUrl, "x-default": englishUrl } },
    };
    return [{ url: englishUrl, ...shared }, { url: dutchUrl, ...shared }];
  });
}
