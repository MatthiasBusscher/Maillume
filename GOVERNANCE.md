# Maillume Governance

Maillume uses a founder-maintained governance model during public beta. This keeps security, privacy, detection behavior, and production operations accountable while the maintainer group is still small.

## Roles

### Contributors

Anyone may propose an issue, discussion, documentation improvement, test, translation, design change, or code contribution. A contribution does not grant access to user accounts, production systems, secrets, domains, or deployment approval.

### Maintainers

Maintainers review changes, triage reports, steward releases, and protect the project's privacy and security promises. The founding maintainer, [@MatthiasBusscher](https://github.com/MatthiasBusscher), is the current release owner and final decision-maker.

Additional maintainers may be invited after sustained, trustworthy contributions. Candidates should demonstrate sound review judgment, respectful collaboration, privacy awareness, and familiarity with the affected part of the system. Access is granted gradually and may be removed when it is no longer needed.

## Decisions

- Small, reversible changes are decided through pull-request review.
- Product direction, public interfaces, detection semantics, data handling, licensing, and major dependencies start with a GitHub issue before implementation.
- Security reports follow [SECURITY.md](SECURITY.md), not public issues.
- Maintainers may decline a technically valid change when it conflicts with scope, privacy, safety, maintainability, or the public roadmap. The reason should be recorded respectfully.

## Merging And Releases

All changes to `main` go through a pull request. Required CI, Code Owner review, and resolved conversations must pass before merge. The release owner approves production deployment of an immutable image built from `main`; contributor workflows and fork pull requests cannot access production secrets or deploy.

During public beta, one maintainer approval is required. The project should move to two-person review for authentication, authorization, database migrations, analysis scoring, privacy boundaries, workflows, and deployment code once a second active maintainer is established.

## Security Changes

A maintainer may prepare a fix privately through a GitHub security advisory when early disclosure would put users at risk. The project will publish appropriate details and credit after a fix is available.

## Changes To Governance

Governance changes use the same issue and pull-request process. Material changes must be documented in the pull request and announced in the release notes or project discussion.
