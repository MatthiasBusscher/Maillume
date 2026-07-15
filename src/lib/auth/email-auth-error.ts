export type EmailAuthMode = "sign-in" | "sign-up" | "forgot";

export function getEmailAuthFailureMessage(
  mode: EmailAuthMode,
  labels: {
    invalidCredentials: string;
    resetFailed: string;
    signUpFailed: string;
  },
) {
  if (mode === "forgot") return labels.resetFailed;
  if (mode === "sign-up") return labels.signUpFailed;
  return labels.invalidCredentials;
}
