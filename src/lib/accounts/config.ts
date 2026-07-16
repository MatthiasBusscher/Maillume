export function areAccountsEnabled(env: Partial<NodeJS.ProcessEnv> = process.env): boolean {
  return env.ACCOUNTS_ENABLED === "true";
}
