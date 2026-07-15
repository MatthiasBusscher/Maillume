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
