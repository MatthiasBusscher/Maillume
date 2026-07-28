import assert from "node:assert/strict";

import { createAnalysisEnvelope } from "./analysis-envelope";
import {
  createEvidenceCoverage,
  hasMaterialEvidenceCoverage,
  isEvidenceCoverage,
} from "./evidence-coverage";

const direct = createEvidenceCoverage(createAnalysisEnvelope({
  subject: "Routine update",
  senderEmail: "updates@service.example",
  body: "The requested report is ready.",
}, "paste"));
assert.deepEqual(direct, {
  subject_available: true,
  sender_available: true,
  full_content_available: true,
  link_destinations_available: true,
  authentication_results_available: false,
  attachment_evidence_available: false,
  extraction_type: "direct",
});
assert.equal(hasMaterialEvidenceCoverage(direct), true);
assert.equal(isEvidenceCoverage(direct), true);

const screenshot = createEvidenceCoverage(createAnalysisEnvelope({
  body: "OCR-extracted text",
}, "screenshot"));
assert.deepEqual(screenshot, {
  subject_available: false,
  sender_available: false,
  full_content_available: false,
  link_destinations_available: false,
  authentication_results_available: false,
  attachment_evidence_available: false,
  extraction_type: "ocr",
});
assert.equal(hasMaterialEvidenceCoverage(screenshot), false);

const parsed = createEvidenceCoverage(createAnalysisEnvelope({
  senderEmail: "billing@supplier.example",
  body: "Invoice attached.",
  emailAuthentication: { dmarc: "pass" },
}, "eml"));
assert.equal(parsed.extraction_type, "parsed");
assert.equal(parsed.authentication_results_available, true);
assert.equal(parsed.attachment_evidence_available, true);

for (const malformed of [
  undefined,
  {},
  { ...direct, subject_available: "yes" },
  { ...direct, full_content_available: undefined },
  { ...direct, extraction_type: "selected" },
]) {
  assert.equal(isEvidenceCoverage(malformed), false);
}

console.log("Checked result evidence-coverage derivation and validation.");
