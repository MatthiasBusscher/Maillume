# Evaluation Fixtures

Inbox Risk Scanner uses synthetic evaluation fixtures to keep risk scoring useful while protecting privacy.

Fixtures live in `src/lib/evaluation/email-fixtures.ts` and are shared by heuristic tests today. The same set is designed to be reused for AI prompt and response-validation checks as the self-hosted AI mode matures.

## Fixture Rules

- Use synthetic examples or fully sanitized examples only.
- Do not commit real private email bodies, screenshots, raw `.eml` files, headers, tracking links, names, account identifiers, phone numbers, addresses, or real inbox data.
- Prefer reserved or clearly synthetic domains such as `.example`, `.test`, or intentionally fake phishing domains.
- Include both English and Dutch examples when adding a new detection pattern.
- Mark each fixture as `phishing`, `spam`, or `legitimate`.
- Give suspicious fixtures a minimum score so obvious phishing or spam cannot regress into low risk.
- Give legitimate fixtures a maximum score so normal business messages do not drift into high risk.

## Production Feedback Boundary

Ordinary scans are not evaluation fixtures and must not be retained for later analysis. A future feedback feature may collect optional non-content labels such as false positive or false negative, expected classification, score band, language, input mode, analyzer version, and high-level suspicious-signal categories.

Feedback must not include message text, sender addresses, subjects, links, attachments, screenshots, `.eml` files, or prompts. Maintainers should use reported patterns to author new synthetic fixtures instead of copying production messages into the repository.

Accepting real or auto-redacted messages requires a separate approved research-data design and is not part of the current roadmap.

## Running Checks

```bash
npm run test:analysis
```

This validates fixture safety metadata, checks heuristic calibration, and verifies AI response normalization behavior with synthetic outputs.
