export type EmailAuthMode = "sign-in" | "sign-up" | "forgot" | "magic-link";

export function getEmailAuthFailureMessage(
  mode: EmailAuthMode,
  labels: {
    invalidCredentials: string;
    magicLinkFailed: string;
    resetFailed: string;
    signUpFailed: string;
  },
) {
  if (mode === "forgot") return labels.resetFailed;
  if (mode === "sign-up") return labels.signUpFailed;
  if (mode === "magic-link") return labels.magicLinkFailed;
  return labels.invalidCredentials;
}
