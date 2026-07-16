import assert from "node:assert/strict";

import { getSupabaseAdminConfig } from "./admin-config";

assert.deepEqual(
  getSupabaseAdminConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: "server-secret",
    SUPABASE_URL: "https://project.supabase.co/",
  }),
  { secretKey: "server-secret", url: "https://project.supabase.co/" },
);

assert.equal(
  getSupabaseAdminConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://public-project.supabase.co",
    SUPABASE_SECRET_KEY: "server-secret",
    SUPABASE_URL: "https://different-project.supabase.co",
  }),
  null,
);

for (const invalidUrl of [
  "not-a-url",
  "ftp://project.supabase.co",
  "https://user:password@project.supabase.co",
  "https://project.supabase.co/path",
]) {
  assert.equal(
    getSupabaseAdminConfig({
      SUPABASE_SECRET_KEY: "server-secret",
      SUPABASE_URL: invalidUrl,
    }),
    null,
  );
}

console.log("Checked coherent server-side Supabase configuration.");
