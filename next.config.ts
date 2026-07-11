import type { NextConfig } from "next";

const baseSecurityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/integrations/outlook",
        headers: [
          ...baseSecurityHeaders,
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://*.office.com https://*.office365.com https://*.officeapps.live.com https://*.microsoft365.com https://*.outlook.com",
          },
        ],
      },
      {
        source: "/((?!integrations/outlook).*)",
        headers: [
          ...baseSecurityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
