import type { MetadataRoute } from "next";

const publicRoutes = ["", "/platform", "/pricing", "/privacy", "/resources/odido-phishing-incident", "/security", "/self-hosted", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://maillume.io";
  const lastModified = new Date("2026-07-10T00:00:00.000Z");

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/pricing" ? 0.8 : 0.7,
  }));
}
