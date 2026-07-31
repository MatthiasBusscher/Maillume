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
  "http://project.supabase.co",
  "http://192.0.2.10:54321",
  "https://user:password@project.supabase.co",
  "https://project.supabase.co/path",
  "https://project.supabase.co?destination=internal",
  "https://project.supabase.co#fragment",
]) {
  assert.equal(
    getSupabaseAdminConfig({
      SUPABASE_SECRET_KEY: "server-secret",
      SUPABASE_URL: invalidUrl,
    }),
    null,
  );
}

for (const localUrl of [
  "http://localhost:54321",
  "http://127.0.0.1:54321/",
  "http://[::1]:54321",
]) {
  assert.deepEqual(
    getSupabaseAdminConfig({
      SUPABASE_SECRET_KEY: "server-secret",
      SUPABASE_URL: localUrl,
    }),
    { secretKey: "server-secret", url: localUrl },
    `loopback HTTP should remain available for local development: ${localUrl}`,
  );
}

console.log("Checked coherent server-side Supabase configuration.");
