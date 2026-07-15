import assert from "node:assert/strict";

import {
  hasRecentAuthentication,
  hasRequestContentType,
  isStrictSameOriginMutation,
  readBoundedRequestBody,
  RECENT_AUTH_MAX_AGE_MS,
} from "./account-request";

function mutationRequest(headers: HeadersInit = {}) {
  return new Request("https://app.maillume.io/account/api-keys", {
    headers,
    method: "POST",
  });
}

async function main() {
  assert.equal(isStrictSameOriginMutation(mutationRequest()), false);
  assert.equal(
    isStrictSameOriginMutation(mutationRequest({ Origin: "https://app.maillume.io" })),
    true,
  );
  assert.equal(
    isStrictSameOriginMutation(mutationRequest({
      Origin: "https://app.maillume.io",
      "Sec-Fetch-Site": "same-origin",
    })),
    true,
  );
  assert.equal(
    isStrictSameOriginMutation(new Request("http://localhost:3100/account/api-keys", {
      headers: {
        Host: "127.0.0.1:3100",
        Origin: "http://127.0.0.1:3100",
      },
      method: "POST",
    })),
    true,
  );
  assert.equal(
    isStrictSameOriginMutation(new Request("http://maillume:3000/account/api-keys", {
      headers: {
        Host: "app.maillume.io",
        Origin: "https://app.maillume.io",
        "X-Forwarded-Proto": "https",
      },
      method: "POST",
    })),
    true,
  );
  assert.equal(
    isStrictSameOriginMutation(
      new Request("http://maillume:3000/account/delete", {
        headers: {
          Host: "maillume:3000",
          Origin: "https://app.maillume.io",
          "Sec-Fetch-Site": "same-origin",
        },
        method: "POST",
      }),
      "https://app.maillume.io",
    ),
    true,
  );
  assert.equal(
    isStrictSameOriginMutation(
      mutationRequest({ Origin: "https://attacker.example" }),
      "https://app.maillume.io",
    ),
    false,
  );
  assert.equal(
    isStrictSameOriginMutation(
      mutationRequest({ Origin: "https://app.maillume.io" }),
      "https://app.maillume.io/path",
    ),
    true,
    "an invalid configured origin must be ignored without breaking the request origin",
  );
  assert.equal(
    isStrictSameOriginMutation(new Request("http://maillume:3000/account/api-keys", {
      headers: {
        Host: "app.maillume.io@attacker.example",
        Origin: "https://attacker.example",
        "X-Forwarded-Proto": "https",
      },
      method: "POST",
    })),
    false,
  );

  const invalidHeaders: HeadersInit[] = [
    { Origin: "https://attacker.example" },
    { Origin: "https://maillume.io" },
    { Origin: "https://app.maillume.io/path" },
    { Origin: "null" },
    { Origin: "https://app.maillume.io", "Sec-Fetch-Site": "cross-site" },
    { Origin: "https://app.maillume.io", "Sec-Fetch-Site": "same-site" },
  ];

  for (const headers of invalidHeaders) {
    assert.equal(isStrictSameOriginMutation(mutationRequest(headers)), false);
  }

  assert.equal(
    hasRequestContentType(
      mutationRequest({ "Content-Type": "application/json; charset=utf-8" }),
      "application/json",
    ),
    true,
  );
  assert.equal(hasRequestContentType(mutationRequest(), "application/json"), false);

  const bodyWithinLimit = await readBoundedRequestBody(
    new Request("https://app.maillume.io/account/api-keys", {
      body: JSON.stringify({ name: "Browser" }),
      method: "POST",
    }),
    64,
  );
  assert.deepEqual(bodyWithinLimit, { ok: true, text: '{"name":"Browser"}' });

  const declaredOversize = await readBoundedRequestBody(
    new Request("https://app.maillume.io/account/api-keys", {
      body: "{}",
      headers: { "Content-Length": "65" },
      method: "POST",
    }),
    64,
  );
  assert.deepEqual(declaredOversize, { ok: false, reason: "too_large" });

  const streamedOversize = await readBoundedRequestBody(
    new Request("https://app.maillume.io/account/api-keys", {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("x".repeat(65)));
          controller.close();
        },
      }),
      duplex: "half",
      method: "POST",
    } as RequestInit & { duplex: "half" }),
    64,
  );
  assert.deepEqual(streamedOversize, { ok: false, reason: "too_large" });

  const now = Date.parse("2026-07-14T12:00:00.000Z");
  assert.equal(hasRecentAuthentication("2026-07-14T11:59:00.000Z", now), true);
  assert.equal(
    hasRecentAuthentication(new Date(now - RECENT_AUTH_MAX_AGE_MS).toISOString(), now),
    true,
  );
  assert.equal(
    hasRecentAuthentication(new Date(now - RECENT_AUTH_MAX_AGE_MS - 1).toISOString(), now),
    false,
  );
  assert.equal(hasRecentAuthentication("2026-07-14T12:01:00.000Z", now), false);
  assert.equal(hasRecentAuthentication("invalid", now), false);
  assert.equal(hasRecentAuthentication(undefined, now), false);

  console.log("Checked account mutation request guardrails.");
}

void main();
