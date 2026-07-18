# GitHub Repository Settings

This checklist is the source of truth for opening Maillume to outside contributions. Repository settings are security controls and should be reviewed alongside code changes.

## Current Constraint

The repository is private on GitHub Free during release preparation. GitHub rulesets are available for public repositories on GitHub Free, but private repository rules require a plan that supports them. Keep the repository private until the launch gates pass, then make it public and enable the rules below in the same release session.

## Default Branch Ruleset

Create an active branch ruleset named `Protect main` targeting the default branch:

- Restrict deletions.
- Block force pushes.
- Require a pull request before merging.
- Require one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require review from Code Owners.
- Require all conversations to be resolved.
- Require status checks `checks` and `Full-history secret scan`.
- Require branches to be up to date before merging.
- Require linear history.
- Do not add a routine bypass. Administrators can edit the ruleset in a documented emergency, then restore it immediately.

Do not require signed commits, merge queue, or multiple approvals during the one-maintainer beta. Revisit those controls when a second maintainer joins.

## Release Tags

Create an active tag ruleset targeting `v*`:

- Restrict deletion.
- Restrict updates.
- Allow tags to be created only by repository administrators or release maintainers.

Release from the immutable commit and container digest recorded in the GitHub release.

## Merge And Collaboration Settings

- Allow squash merging only.
- Use the pull-request title and description for squash commit messages.
- Enable auto-merge.
- Automatically delete head branches after merge.
- Keep issues enabled.
- Enable Discussions when the repository becomes public.
- Keep blank issues disabled and use the repository issue forms.

Outside contributors work from forks or feature branches and never receive direct write access to `main`. Grant repository roles at the lowest level needed and review collaborator access quarterly.

## Actions And Environments

- Keep workflow permissions read-only by default.
- Do not allow Actions to create or approve pull requests unless a reviewed workflow explicitly needs it.
- Require approval before running workflows from first-time outside contributors.
- Keep every third-party action pinned to an immutable commit SHA.
- Never use `pull_request_target` to build or run untrusted contributor code.
- Keep production credentials only in the `production` environment, never as repository variables or secrets available to pull requests.
- Limit production deployment to `main` and require manual approval.
- Leave `Prevent self-review` disabled while there is only one production approver; enable it when a second operator is available.
- Fork pull requests must not receive secrets, package write permission, or deployment permission.

## Security And Analysis

Enable these controls when the repository becomes public:

- Private vulnerability reporting and security-advisory notifications.
- Dependency graph.
- Dependabot alerts and security updates.
- Secret scanning and push protection.
- CodeQL default setup for JavaScript/TypeScript.

Keep the full-history Gitleaks job as a required pull-request check even when GitHub secret scanning is enabled. Review Dependabot and CodeQL alerts before each release; do not auto-merge dependency updates.

## Verification

Before announcing the public repository:

1. Open a harmless pull request from a fork.
2. Confirm it cannot read secrets, publish a package, or deploy.
3. Confirm `main` cannot be pushed to directly or force-pushed.
4. Confirm merge remains blocked until both required checks pass, the Code Owner approves, and conversations are resolved.
5. Merge with squash and confirm the head branch is deleted.
6. Run a manual production deployment and confirm it resolves an immutable image built from the merged `main` commit.
7. Submit a private test vulnerability report and confirm the maintainer receives a notification.
