#!/usr/bin/env sh
# Pulls the latest approved Maillume release from GitHub and deploys it.
#
# The VPS accepts SSH only over a private VPN, so GitHub cannot push releases to it. Instead the
# protected release workflow records a GitHub deployment (environment `maillume-vps`, payload
# with the verified image digest) after the `production` environment approval, and a systemd
# timer runs this script as the deployment user every few minutes (see docs/deployment.md).
#
# For a new deployment it fetches the deploy files of exactly that commit and hands over to
# deploy-production.sh, which waits for health and rolls back on failure. Each deployment is
# attempted once: a failed one is not retried until a new deployment is approved.
set -eu

repository="${MAILLUME_REPOSITORY:-MatthiasBusscher/Maillume}"
environment="${MAILLUME_DEPLOY_ENVIRONMENT:-maillume-vps}"
api_url="${GITHUB_API_URL:-https://api.github.com}"
raw_url="${GITHUB_RAW_URL:-https://raw.githubusercontent.com}"
attempted_state_file=".last-pulled-deployment"
current_revision_state_file=".current-production-revision"

cd "$(dirname "$0")/.."

response="$(curl -fsS --max-time 20 \
  -H 'Accept: application/vnd.github+json' \
  "$api_url/repos/$repository/deployments?environment=$environment&per_page=1")"

# Only the release workflow's own token may publish deployments; a deployment created with a
# personal token (for example a leaked one) skipped the production environment approval.
allowed_creator="${MAILLUME_DEPLOYMENT_CREATOR:-github-actions[bot]}"

# Prints "<id> <sha> <image> <creator>" for the newest deployment, or nothing when there is none.
latest="$(printf '%s' "$response" | python3 -c '
import json, sys
deployments = json.load(sys.stdin)
if deployments:
    d = deployments[0]
    fields = [d.get("id", ""), d.get("sha", ""), (d.get("payload") or {}).get("image", ""), (d.get("creator") or {}).get("login", "")]
    print(" ".join(str(f).replace(" ", "") or "-" for f in fields))
')"
[ -n "$latest" ] || exit 0

set -- $latest
deployment_id="${1:-}"
revision="${2:-}"
image="${3:-}"
creator="${4:-}"

case "$deployment_id" in
  ''|*[!0-9]*) echo "Ignoring a deployment without a numeric id." >&2; exit 1 ;;
esac
if [ -f "$attempted_state_file" ] && [ "$(cat "$attempted_state_file")" = "$deployment_id" ]; then
  exit 0
fi

# A rejected deployment is recorded too, so it is reported once instead of on every run.
reject() {
  printf '%s\n' "$deployment_id" > "$attempted_state_file"
  echo "Rejected deployment $deployment_id: $1" >&2
  exit 1
}

printf '%s' "$revision" | grep -Eq '^[0-9a-f]{40}$' || reject "invalid revision."
printf '%s' "$image" | grep -Eq '^ghcr\.io/matthiasbusscher/maillume@sha256:[0-9a-f]{64}$' \
  || reject "image is not an immutable Maillume digest."
[ "$creator" = "$allowed_creator" ] || reject "created by $creator, not the release workflow."

if [ -f "$current_revision_state_file" ] && [ "$(cat "$current_revision_state_file")" = "$revision" ]; then
  printf '%s\n' "$deployment_id" > "$attempted_state_file"
  exit 0
fi

# The commit must be on main: main is identical to it or ahead of it.
comparison="$(curl -fsS --max-time 20 \
  -H 'Accept: application/vnd.github+json' \
  "$api_url/repos/$repository/compare/$revision...main" \
  | python3 -c 'import json, sys; print(json.load(sys.stdin).get("status", ""))')" || comparison=""
case "$comparison" in
  identical|ahead) ;;
  *) reject "commit $revision is not on main (${comparison:-unknown})." ;;
esac

echo "Deployment $deployment_id: $revision"

# The same files the former SSH job synchronized, taken from the approved commit.
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
for file in \
  docker-compose.production.yml \
  scripts/deploy-production.sh \
  scripts/rollback-production.sh \
  scripts/rehearse-production-rollback.sh \
  scripts/audit-production-runtime.sh \
  scripts/pull-production-deployment.sh
do
  mkdir -p "$workdir/$(dirname "$file")"
  curl -fsS --max-time 30 -o "$workdir/$file" "$raw_url/$repository/$revision/$file"
done

# Replace files by rename, so this running script is never rewritten in place.
mv -f "$workdir/docker-compose.production.yml" docker-compose.production.yml
chmod 644 docker-compose.production.yml
for script in "$workdir"/scripts/*.sh; do
  target="scripts/$(basename "$script")"
  chmod 750 "$script"
  mv -f "$script" "$target"
done

printf '%s\n' "$deployment_id" > "$attempted_state_file"
exec ./scripts/deploy-production.sh "$image" "$revision"
