import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://maillume.io";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account", "/api/", "/app", "/auth/", "/integrations/",
        "/nl/account", "/nl/app", "/nl/auth/", "/nl/integrations/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
