export const PRODUCT_NAME = "Maillume";
export const PRODUCT_TAGLINE = "A second opinion before you trust an email.";

export const SOURCE_REPOSITORY_URL =
  "https://github.com/MatthiasBusscher/inbox-risk-scanner";
export const LICENSE_URL = `${SOURCE_REPOSITORY_URL}/blob/main/LICENSE`;

export function getAppHref(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "/app";
}

export function getMarketingHref(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "/";
}
