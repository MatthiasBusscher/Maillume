import assert from "node:assert/strict";

import { arePasskeysEnabled, getPublicSupabaseConfig } from "./config";

function main() {
  assert.equal(getPublicSupabaseConfig({}), null);
  assert.equal(
    getPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    }),
    null,
  );

  assert.deepEqual(
    getPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      NEXT_PUBLIC_SUPABASE_URL: " https://project.supabase.co/ ",
    }),
    {
      publishableKey: "sb_publishable_test",
      url: "https://project.supabase.co/",
    },
  );

  for (const unsafeUrl of [
    "http://project.supabase.co",
    "http://192.0.2.10:54321",
    "https://user:password@project.supabase.co",
    "https://project.supabase.co/auth/v1",
    "https://project.supabase.co?destination=internal",
    "https://project.supabase.co#fragment",
  ]) {
    assert.equal(
      getPublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        NEXT_PUBLIC_SUPABASE_URL: unsafeUrl,
      }),
      null,
      `unsafe public Supabase URL should be rejected: ${unsafeUrl}`,
    );
  }

  for (const localUrl of [
    "http://localhost:54321",
    "http://127.0.0.1:54321/",
    "http://[::1]:54321",
  ]) {
    assert.deepEqual(
      getPublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        NEXT_PUBLIC_SUPABASE_URL: localUrl,
      }),
      { publishableKey: "sb_publishable_test", url: localUrl },
      `loopback HTTP should remain available for local development: ${localUrl}`,
    );
  }

  assert.equal(arePasskeysEnabled({}), false);
  assert.equal(arePasskeysEnabled({ NEXT_PUBLIC_PASSKEYS_ENABLED: "false" }), false);
  assert.equal(arePasskeysEnabled({ NEXT_PUBLIC_PASSKEYS_ENABLED: "true" }), true);

  assert.deepEqual(
    getPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-anon",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    }),
    {
      publishableKey: "legacy-anon",
      url: "https://project.supabase.co",
    },
  );

  console.log("Checked public Supabase authentication configuration.");
}

main();
