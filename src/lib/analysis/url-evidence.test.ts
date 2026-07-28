import assert from "node:assert/strict";

import {
  collectUrlEvidence,
  inspectUrl,
  looksLikeBrandDomainImpersonation,
} from "./url-evidence";

assert.deepEqual(
  new Set(inspectUrl("http://203.0.113.42/login").evidence),
  new Set(["ip_literal_url"]),
);
assert.ok(
  inspectUrl("https://[2001:db8::42]/login").evidence.includes("ip_literal_url"),
);
assert.ok(!inspectUrl("http://localhost:3000/test").evidence.includes("ip_literal_url"));
assert.deepEqual(inspectUrl("not a URL"), { evidence: [], nestedUrls: [] });
assert.deepEqual(inspectUrl("https://example.invalid/" + "a".repeat(4_100)), {
  evidence: [],
  nestedUrls: [],
});

assert.ok(
  !inspectUrl("http://portal.example:80/login").evidence.includes(
    "non_standard_port_url",
  ),
);
assert.ok(
  !inspectUrl("https://portal.example:443/login").evidence.includes(
    "non_standard_port_url",
  ),
);
assert.ok(
  inspectUrl("https://portal.example:8443/login").evidence.includes(
    "non_standard_port_url",
  ),
);

assert.ok(
  inspectUrl("https://trusted.example@attacker.invalid/login").evidence.includes(
    "url_userinfo",
  ),
);
assert.ok(
  !inspectUrl("https://attacker.invalid/path/trusted@example").evidence.includes(
    "url_userinfo",
  ),
);

const internationalized = inspectUrl("https://münich.example/account");
assert.ok(internationalized.evidence.includes("punycode_hostname"));
assert.ok(!internationalized.evidence.includes("brand_lookalike_destination"));

const nested = inspectUrl(
  "https://redirector.example/out?next=https%253A%252F%252Fpaypa1.invalid%252Flogin",
);
assert.ok(nested.evidence.includes("nested_url"));
assert.ok(nested.evidence.includes("brand_lookalike_destination"));
assert.deepEqual(nested.nestedUrls, ["https://paypa1.invalid/login"]);

const overEncoded = inspectUrl(
  "https://redirector.example/out?next=https%2525253A%2525252F%2525252Fattacker.invalid",
);
assert.ok(!overEncoded.evidence.includes("nested_url"));
assert.deepEqual(overEncoded.nestedUrls, []);

assert.ok(
  !inspectUrl("https://files.example/archive.zip").evidence.includes(
    "risky_link_domain",
  ),
);
assert.ok(
  inspectUrl("https://files.zip/archive").evidence.includes("risky_link_domain"),
);

assert.equal(looksLikeBrandDomainImpersonation("micros0ft-login.invalid"), true);
assert.equal(looksLikeBrandDomainImpersonation("microsoft.com"), false);
assert.equal(looksLikeBrandDomainImpersonation("applecart.example"), false);

const sameSite = collectUrlEvidence({
  links: ["https://tracking.vendor.example/open"],
  linkPairs: [{
    displayedUrl: "https://portal.vendor.example/invoice",
    destinationUrl: "https://tracking.vendor.example/open",
  }],
  messageContent: "Your invoice is available.",
  senderEmail: "billing@vendor.example",
  sensitiveRequest: false,
});
assert.ok(!sameSite.includes("link_mismatch"));
assert.ok(!sameSite.includes("sender_destination_mismatch"));

const unrelatedPair = collectUrlEvidence({
  links: ["https://capture.invalid/login"],
  linkPairs: [{
    displayedUrl: "https://paypal.com/security",
    destinationUrl: "https://capture.invalid/login",
  }],
  messageContent: "Verify your PayPal account.",
  senderEmail: "security@paypal-alert.invalid",
  sensitiveRequest: true,
});
assert.ok(unrelatedPair.includes("link_mismatch"));
assert.ok(unrelatedPair.includes("sender_destination_mismatch"));
assert.ok(unrelatedPair.includes("brand_destination_mismatch"));

const hostedSensitiveDestination = collectUrlEvidence({
  links: ["https://account-review.pages.dev/login"],
  linkPairs: [],
  messageContent: "Enter your password to keep access.",
  senderEmail: "security@account-review.invalid",
  sensitiveRequest: true,
});
assert.ok(hostedSensitiveDestination.includes("hosted_destination"));

const hostedRoutineDestination = collectUrlEvidence({
  links: ["https://project.pages.dev/release-notes"],
  linkPairs: [],
  messageContent: "The release notes are ready.",
  senderEmail: "team@project.example",
  sensitiveRequest: false,
});
assert.ok(!hostedRoutineDestination.includes("hosted_destination"));
assert.ok(!hostedRoutineDestination.includes("sender_destination_mismatch"));

console.log("Deterministic URL evidence checks passed.");
