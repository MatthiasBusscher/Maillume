# Next.js 16 migration

The web app moves from the Next.js 15 maintenance line to Next.js `16.4`
together with `eslint-config-next` 16, so the coupled major updates land as one
tested change.

- `src/middleware.ts` is now `src/proxy.ts` with an exported `proxy` function.
  Authentication, locale, CSP-nonce, and redirect behavior are unchanged. The
  proxy runs on the Node.js runtime.
- Same-origin redirects from the proxy now send a relative `Location` header
  (for example `/auth/callback?code=…`). Relative locations cannot leave the
  requesting host, so OAuth callback recovery stays fail-closed.
- ESLint uses the native flat configs exported by `eslint-config-next` instead
  of the `FlatCompat` bridge; `@eslint/eslintrc` is removed. ESLint stays on 9.
- The `sharp` override is lifted, so image handling resolves the patched
  `sharp` release that Next.js 16 depends on.
- React and React DOM move to `19.3` together.

Operators need no configuration changes. To roll back, redeploy the previous
image tag; the change has no database or environment-variable migration.
