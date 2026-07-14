export const PRODUCT_NAME = "Maillume";
export const PRODUCT_TAGLINE = "Shine a light on suspicious email.";

export const SOURCE_REPOSITORY_URL =
  "https://github.com/MatthiasBusscher/maillume";
export const LICENSE_URL = `${SOURCE_REPOSITORY_URL}/blob/main/LICENSE`;

export function getAppHref(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "/app";
}

export function getMarketingHref(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "/";
}
