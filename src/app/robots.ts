import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://maillume.io";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api/", "/app", "/auth/", "/integrations/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
