export const PRODUCT_NAME = "Maillume";
export const PRODUCT_TAGLINE = "Shine a light on suspicious email.";

export const SOURCE_REPOSITORY_URL =
  "https://github.com/MatthiasBusscher/Maillume";
export const LICENSE_URL = `${SOURCE_REPOSITORY_URL}/blob/main/LICENSE`;

export function getAppHref(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "/app";
}

export function getAppRouteHref(pathname: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) return pathname;
  return new URL(pathname, `${appUrl}/`).toString();
}

export function getMarketingHref(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "/";
}
