# Maillume GitHub Issue Roadmap

Implementation status: the scanner, optional accounts, TOTP, account-scoped API, and Chrome extension are implemented in source. Public-beta security evidence, recovery-email acceptance, editorial review, trademark decision, and repository release controls remain open. GitHub milestones and issues are the source of truth.

## Release And Post-Launch Order

1. Issue #92: complete the native English/Dutch editorial and Maillume brand-story pass.
2. Issue #79: verify password recovery at Gmail and Outlook and lock production callbacks to the app origin.
3. Issue #47: complete production security evidence, monitoring, and rollback acceptance.
4. Issue #49: complete trademark evidence and record the founder filing/risk decision.
5. Issue #93: make the repository public and apply contribution protections in the same release session.
6. Issue #40: run the trusted-tester period, tag `v0.1.0-beta`, and publish the release.
7. Issue #39: validate and publish the Chrome extension after the web beta.
8. Issues #51, #56, #64, and #66: post-beta detection, billing, team, and custom-auth-domain work.

The public heuristic scanner and self-hosted bring-your-own-key mode remain the launch product. See `docs/hosted-service.md` for the approved hosted-service planning baseline.

## Recommended Order

1. Project Setup & Initial Scan Page
2. Open Source Repository Setup
3. Privacy-First Architecture and No-Storage API Contract
4. Multilingual UI Foundation
5. Input Modes: Paste, Screenshot, and `.eml`
6. Heuristic Analyzer Calibration
7. Optional Self-Hosted AI Provider Abstraction
8. AI Analysis API Route for Self-Hosted Mode
9. Evaluation Samples and Risk Calibration
10. Abuse Protection and Cost Controls
11. Security and Privacy Review
12. Portable Deployment and Self-Hosting Docs
13. v1 Launch Polish
14. Browser Extension
16. Hosted API Keys and Quotas
17. Integration Publication and Release Verification

## Issue #1: Project Setup & Initial Scan Page

Build the first usable version of the app without external services.

Definition of Done:

- Next.js App Router, TypeScript, and Tailwind CSS are configured.
- Landing page introduces Maillume and puts the scanner in the primary flow.
- Email scan form supports subject, sender email address, and email body.
- Form returns mocked structured analysis results.
- Result UI displays risk score, risk level, explanation, suspicious signals, detected links, recommended action, and the required disclaimer.
- No AI API, database, payments, file uploads, forwarding, or browser extension logic is implemented.

## Issue #2: Open Source Repository Setup

Prepare the repository for public collaboration and self-hosting.

Definition of Done:

- `LICENSE` contains the current AGPL-3.0 text selected for the hosted-by-us-or-you model.
- `CONTRIBUTING.md` explains local setup, branch naming, coding standards, and how to propose changes.
- `SECURITY.md` explains responsible disclosure and reminds contributors not to include real sensitive email content in issues.
- `.env.example` documents optional self-hosted AI environment variables without secrets.
- GitHub issue templates cover bug reports, feature requests, and false positive or false negative detection examples.
- README clearly states current limitations, the required disclaimer, the no-storage policy, and the project scope exclusions.

## Issue #3: Privacy-First Architecture and No-Storage API Contract

Make privacy the default product contract before adding uploads or AI.

Definition of Done:

- Product copy states that scan content is processed for scoring and not stored by default.
- API contract accepts normalized scan input and returns only the structured analysis result.
- Server code does not log raw email bodies, screenshots, `.eml` files, OCR text, or AI prompts.
- Scan history is explicitly removed from the launch MVP.
- Any future saved history is documented as opt-in only.

## Issue #4: Multilingual UI Foundation

Add first-class multilingual support for the public app.

Definition of Done:

- English and Dutch UI dictionaries are added.
- Users can switch language manually.
- Browser language can set the initial locale when available.
- Required disclaimer is translated and visible in every result.
- Result labels, validation errors, empty states, and upload instructions are localized.

## Issue #5: Input Modes: Paste, Screenshot, and `.eml`

Support the three launch input paths without storing uploaded content.

Definition of Done:

- Paste mode supports subject, sender email, and body text.
- Screenshot upload extracts visible text with OCR and discards the uploaded image after the request.
- `.eml` upload parses sender, subject, text/html bodies, links, and attachment metadata, then discards the raw file.
- Upload size and type limits are enforced.
- UI clearly shows which input mode is active.
- No raw uploaded content is stored in a database or logs.

## Issue #6: Heuristic Analyzer Calibration

Make the free public demo useful without relying on paid AI.

Definition of Done:

- Heuristic analyzer covers common phishing and spam patterns in English and Dutch.
- Results stay conservative and never claim certainty.
- Obvious phishing examples do not receive very low scores.
- Normal legitimate examples are not automatically pushed to high risk.
- Suspicious signals explain why the score was assigned.

## Issue #7: Optional Self-Hosted AI Provider Abstraction

Allow people who install Maillume themselves to use their own AI provider key.

Definition of Done:

- A common `analyzeEmail` interface is created for heuristic and AI-backed providers.
- Provider choice is controlled by server-side environment variables.
- Public deployments can run with `ANALYSIS_MODE=heuristic` and no AI key.
- Self-hosters can set `ANALYSIS_MODE=ai`, `AI_PROVIDER=openai|anthropic`, and their own provider key.
- Provider keys are never exposed to the browser and never committed to the repository.

## Issue #8: AI Analysis API Route for Self-Hosted Mode

Add AI-backed structured analysis without making the public hosted app responsible for AI cost.

Definition of Done:

- `POST /api/analyze` chooses heuristic or AI mode based on server configuration.
- AI mode only runs when the deployment has a valid self-hosted provider configuration.
- AI response is requested as strict structured JSON.
- Response is validated and normalized before reaching the client.
- Unsafe or malformed model responses return controlled errors.
- UI still shows the required disclaimer.

## Issue #9: Evaluation Samples and Risk Calibration

Create a safe feedback loop for improving false negatives and false positives.

Definition of Done:

- A small fixture set of synthetic or fully sanitized phishing, spam, and legitimate examples is added.
- Fixtures include English and Dutch examples.
- Tests verify that obvious phishing and spam examples do not receive very low risk scores.
- Tests verify that normal legitimate examples are not automatically pushed to high risk.
- Documentation explains that contributors must never commit private email content.
- The AI prompt and validation logic can be evaluated against the same fixture set later.

## Issue #10: Abuse Protection and Cost Controls

Prevent accidental or malicious expensive usage in deployments that enable AI.

Definition of Done:

- Public hosted demo does not include the project owner's AI key.
- AI mode has rate limiting hooks or documented deployment-level protections.
- Self-hosting docs explain how usage can create provider costs.
- Errors clearly explain when AI mode is unavailable or rate-limited.
- No API key can be reached from client-side code.

## Issue #11: Security and Privacy Review

Reduce risk around sensitive email content and uploads.

Definition of Done:

- Privacy copy explains what is processed and what is not stored.
- Server logs do not include raw scan content.
- Uploaded files are validated for type and size.
- Temporary file handling is reviewed and minimized.
- Security review confirms no AI key, service role key, or uploaded content reaches the browser unintentionally.

## Issue #12: Portable Deployment and Self-Hosting Docs

Prepare both the public demo and self-hosted installations.

Definition of Done:

- Public standalone container deployment builds successfully in heuristic mode.
- `.env.example` documents heuristic mode and optional self-hosted AI mode.
- Self-hosting docs explain how to configure provider keys safely as server-only environment variables.
- Smoke test covers paste, screenshot, `.eml`, language switching, and result rendering.
- Documentation clearly states that the public demo does not use the maintainer's paid AI key.

## Issue #13: v1 Launch Polish

Make the app portfolio-ready and contributor-friendly.

Definition of Done:

- Visual design is consistent across all input modes and result states.
- Metadata, favicon, and social preview are configured.
- Accessibility basics pass keyboard and screen reader checks.
- Copy avoids certainty claims and keeps the required disclaimer.
- README explains setup, architecture, no-storage behavior, optional AI mode, and current limitations.

## Issue #14: Browser Extension

Definition of Done:

- Manifest V3 side panel uses temporary `activeTab` access and no persistent webmail host permission.
- Only user-selected text is captured after an explicit action.
- The user reviews content and destination before submission.
- A chosen deployment receives the shared authenticated API request.
- Message content and results are not written to extension storage.

## Issue #16: Hosted API Keys and Quotas

Definition of Done:

- Signed-in users can create, copy once, list, and revoke API keys.
- Only SHA-256 key hashes and display prefixes are stored.
- Monthly quota consumption is atomic and returns useful limit headers.
- Usage storage contains aggregate counts only, with no scan content, result, IP, or message identifier.
- Account deletion cascades through keys and usage metadata.

## Issue #17: Integration Publication and Release Verification

Definition of Done:

- Browser extension is packaged and reviewed against Chrome Web Store privacy requirements.
- Production OAuth, API quotas, monitoring, DDoS controls, and zero-retention checks pass.
- Mobile/desktop responsive screenshots show no clipped content.
- Release documentation lists requested permissions and exact data flow.
