export const OAUTH_PROVIDER_FAILURE_CODE = "oauth_provider_failed";

const OAUTH_ERROR_PARAMETERS = ["error", "error_code", "error_description"] as const;

export function hasOAuthErrorReturn(url: { searchParams: URLSearchParams }): boolean {
  return OAUTH_ERROR_PARAMETERS.some((parameter) => url.searchParams.has(parameter));
}

export function getOAuthFailureUrl(origin: string | URL): URL {
  const signInUrl = new URL("/auth/sign-in", origin);
  signInUrl.searchParams.set("error", OAUTH_PROVIDER_FAILURE_CODE);
  return signInUrl;
}
