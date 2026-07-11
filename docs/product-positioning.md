# Product Positioning

Status: public-beta decision record.

## Public-Beta Identity

- Product name: **Maillume**
- Repository: `inbox-risk-scanner`
- Target marketing domain: `maillume.io` (pending registration)
- Target scanner domain: `app.maillume.io`
- Category: privacy-first email risk assessment
- Short promise: **A second opinion before you click, reply, or pay.**
- Open-source message: **Use it here. Run it yourself.**

The earlier PhishGuard working name is not used because similar names already exist. Maillume is the selected launch identity. `maillume.io` and defensive domain `maillume.nl` are owned for the project; `maillume.com` belongs to another party. This is a preliminary collision screen, not trademark clearance.

## Product Principle

The official hosted service and the self-hosted project share the same scanner core. The official cloud should be the easiest way to use the product, not the only way to access useful functionality.

- Hosted by us: managed deployment, optional hosted AI allowances, official integrations, reliability, and support.
- Hosted by you: the complete heuristic scanner, file inputs, translations, privacy-safe feedback option, and bring-your-own-key AI.
- Open development: public source, issue roadmap, changelog, security process, and clear release notes.
- Honest assessment: results remain probabilistic and always include the automated-assessment disclaimer.

## Product Boundaries

| Mode | Account | Permanently available | Possible future paid value |
| --- | --- | --- | --- |
| Anonymous official cloud | No | Heuristic scanning, paste, screenshot OCR, `.eml`, English/Dutch, result explanation | None required for the core flow |
| Optional free account | Yes | Anonymous features plus account identity | Future preferences and a small hosted AI allowance after launch gates pass |
| Plus | Yes | All free features | Managed AI capacity, official mail integration, convenience, and support |
| Business | Yes | Core scanner access | Team policy, administration, reporting, and higher support level |
| Self-hosted | Chosen by operator | Complete scanner and bring-your-own-key AI | Optional commercial support may be offered later |

Google authentication is implemented as an optional foundation. It does not create scan history or enable hosted AI today. Planning hypotheses remain five hosted AI scans per free account and 100 per EUR 9 Plus subscription. They are not launch promises and must pass the cost and demand gates in `docs/hosted-service.md`.

## Permanently Free Core

The project does not paywall:

- anonymous heuristic analysis;
- subject, sender, and email-body input;
- screenshot OCR and `.eml` parsing;
- risk score, explanation, signals, links, and recommendation;
- English and Dutch UI;
- the no-storage scan contract;
- self-hosting;
- bring-your-own-key AI provider support;
- synthetic evaluation fixtures and security tests.

## Paid Product Direction

Paid plans may fund costs and convenience that the project operator must actively provide:

- maintainer-funded hosted AI calls with hard quotas;
- official Gmail, Outlook, or browser integrations;
- shared team policy and administration;
- managed uptime, monitoring, and incident response;
- support and deployment assistance;
- future enterprise controls that do not weaken the open scanner core.

There are no unlimited AI promises, paid scan history, advertising, data resale, or payment implementation in the public beta.

## License Decision

Maillume uses **GNU AGPL-3.0-only** for the public beta.

The license keeps the source available when modified versions are offered to users over a network. The application provides visible Source and License links. This choice supports a hosted-by-us-or-you model while still allowing commercial hosting, paid support, and paid managed services under the license terms.

No dual-license or enterprise license program exists today. Introducing one later requires legal review and a contributor-rights strategy. This document records product intent and is not legal advice.

The repository history currently has one recorded author, so the beta transition can be made before outside contributions begin. The change does not attempt to revoke permissions attached to any earlier copy someone may already have received under MIT; professional review is still appropriate before commercial licensing or contributor agreements.

## Brand Voice

- Calm, direct, and specific.
- Explain evidence rather than promise protection.
- Prefer "risk assessment" and "second opinion" over "detection guarantee."
- Never use fear to drive conversion.
- Never imply that payment makes an assessment certain.
- Keep technical detail available without forcing non-technical users to understand it.

## Public Repository Gate

The repository remains private until the public-beta issue confirms:

- the production domains, Cloudflare edge, and Hostinger container deployment are ready;
- git history and current files contain no secrets or private email data;
- the privacy policy, terms, processor list, security contact, source notice, and disclaimer are public;
- the Supabase migration and expiry job are verified before feedback is enabled;
- production uses heuristic mode and has no maintainer-funded AI key;
- demo, documentation, self-hosting, issue, and security links are correct;
- desktop, mobile, English, Dutch, paste, screenshot, `.eml`, and feedback checks pass;
- `v0.1.0-beta` release notes and known limitations are ready.

Changing repository visibility is an explicit final action in the public-beta issue, not part of this positioning issue.
