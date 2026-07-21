# Maillume Content Style Guide

## Brand Promise

Lead with what Maillume does rather than explaining how the name was formed. The short promise is enough: it shines a light on suspicious email signals so people can make a safer decision.

Preferred English line: **Shine a light on suspicious email.**

Preferred Dutch line: **Werpt licht op verdachte e-mail.**

Maillume is an email risk scanner and decision-support tool. It does not filter a mailbox, block delivery, prove authenticity, or guarantee safety.

## Voice

- Clear, calm, specific, and useful.
- Explain evidence before technical implementation details.
- Use short commands for actions and complete sentences for consequences.
- Avoid fear, certainty, generic AI language, and claims that Maillume prevents attacks.
- Address Dutch users with informal `je` and `jouw`, never formal `u` and `uw`.
- Translate for meaning and natural rhythm; do not mirror English word for word.

## Core Terminology

| English | Dutch | Guidance |
| --- | --- | --- |
| risk assessment | risicobeoordeling | Preferred name for the complete result |
| risk score | risicoscore | A versioned index from 0 to 100, not a probability |
| risk indicator | risico-indicatie | Use when explaining what the score represents |
| suspicious signals | verdachte signalen | Evidence applied to the assessment |
| scan history | scangeschiedenis | Hosted beta keeps this turned off |
| API key | API-sleutel | Never imply that the plaintext key can be recovered later |
| likely phishing or fraud | waarschijnlijk phishing of fraude | Classification, not a certainty claim |
| likely spam | waarschijnlijk spam | Classification, not a certainty claim |
| likely legitimate | waarschijnlijk legitiem | Must retain the automated-assessment disclaimer |
| uncertain | onzeker | Use when the available evidence is insufficient |
| detected links | gevonden links | Do not call every detected link suspicious |
| recommended action | aanbevolen stap | Prefer a concrete next step over alarmist wording |
| public beta | publieke bèta | Use consistently; avoid `openbare beta` |

## Score And Uncertainty

Always describe the score as a **versioned risk index** based on the signals Maillume can inspect. It is not the probability that a message is malicious and not a guarantee that a message is safe or unsafe.

Required meaning in results and trust copy:

> This is an automated risk assessment and should not be considered a guarantee.

Dutch:

> Dit is een geautomatiseerde risicobeoordeling en geen garantie.

## Privacy Wording

Be exact about the deployed data flow:

- Raw screenshots and `.eml` files are parsed in browser memory.
- The normalized subject, sender, and message text are sent for the current assessment.
- Maillume does not create scan history or retain scan content/results in its application database.
- Account identity, security settings, API-key metadata, and aggregate quotas are retained when an account feature needs them.
- Self-hosted AI providers process normalized message content according to the installer's provider configuration.

Do not say that nothing leaves the browser. Do not say that Maillume stores nothing at all.

## Educational Stories

Attribute reported facts to the original source and link it. Separate the source's reporting from Maillume's interpretation. Do not imply affiliation, endorsement, or that Maillume would have prevented the incident. Add a new story only when it teaches a materially different attack pattern.
