import assert from "node:assert/strict";

import { getOperatorProfile, getPublicBetaOperatorProfile } from "./operator";

assert.equal(getOperatorProfile({}).legalName, "Maillume local development");
assert.throws(() => getPublicBetaOperatorProfile({}), /operator configuration is incomplete/);
assert.throws(
  () => getPublicBetaOperatorProfile({
    MAILLUME_OPERATOR_LEGAL_NAME: "Example B.V.",
    MAILLUME_OPERATOR_REGISTERED_ADDRESS: "Example street 1, 1234 AB Amsterdam",
    MAILLUME_OPERATOR_KVK: "12345678",
    MAILLUME_OPERATOR_VAT_ID: "NL123456789B01",
    MAILLUME_SUPPORT_EMAIL: "support@example.com",
  }),
  /operator configuration is incomplete/,
);
assert.deepEqual(
  getPublicBetaOperatorProfile({
    MAILLUME_OPERATOR_LEGAL_NAME: "Example B.V.",
    MAILLUME_OPERATOR_REGISTERED_ADDRESS: "Example street 1, 1234 AB Amsterdam",
    MAILLUME_OPERATOR_KVK: "12345678",
    MAILLUME_OPERATOR_VAT_ID: "NL123456789B01",
  }),
  {
    address: "Example street 1, 1234 AB Amsterdam",
    jurisdiction: "The Netherlands",
    kvkNumber: "12345678",
    legalName: "Example B.V.",
    privacyEmail: "privacy@maillume.io",
    securityEmail: "security@maillume.io",
    supportEmail: "support@maillume.io",
    vatId: "NL123456789B01",
  },
);

console.log("Checked public-beta operator configuration.");
