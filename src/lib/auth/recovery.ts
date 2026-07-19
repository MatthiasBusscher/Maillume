export const PASSWORD_RECOVERY_COOKIE = "maillume-password-recovery";
export const PASSWORD_RECOVERY_COOKIE_VALUE = "verified";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 10 * 60;

export function isPasswordRecoveryPath(pathname: string) {
  return /\/(?:auth\/)?update-password$/.test(pathname);
}
