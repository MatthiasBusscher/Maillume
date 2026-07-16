import assert from "node:assert/strict";

import { resolveAuthenticatedLocale } from "./authenticated-locale";

async function main() {
  const writes: Array<{ data: Record<string, string> }> = [];
  const storedLocale = await resolveAuthenticatedLocale(
    {
      async getUser() {
        return { data: { user: { user_metadata: { locale: "nl" } } } };
      },
      async updateUser(attributes: { data: Record<string, string> }) {
        writes.push(attributes);
      },
    },
    "en",
  );
  assert.equal(storedLocale, "nl");
  assert.equal(writes.length, 0);

  const legacyLocale = await resolveAuthenticatedLocale(
    {
      async getUser() {
        return { data: { user: { user_metadata: {} } } };
      },
      async updateUser(attributes: { data: Record<string, string> }) {
        writes.push(attributes);
      },
    },
    "en",
  );
  assert.equal(legacyLocale, "en");
  assert.deepEqual(writes, [{ data: { locale: "en" } }]);

  const anonymousLocale = await resolveAuthenticatedLocale(
    {
      async getUser() {
        return { data: { user: null } };
      },
      async updateUser() {
        throw new Error("must not update an anonymous user");
      },
    },
    "nl",
  );
  assert.equal(anonymousLocale, "nl");

  console.log("Checked authenticated locale hydration.");
}

void main();
