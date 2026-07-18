#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 ghcr.io/matthiasbusscher/maillume@sha256:<64-hex-digest> <git-revision>" >&2
  exit 2
fi

image="$1"
expected_revision="$2"
compose_file="docker-compose.production.yml"
production_env=".env.production"
infrastructure_env=".env.infrastructure"
current_image_state_file=".current-production-image"
current_revision_state_file=".current-production-revision"
previous_image_state_file=".previous-production-image"
previous_revision_state_file=".previous-production-revision"
current_image=""
current_revision=""
cloudflared_image=""
health_attempts="${DEPLOY_HEALTH_ATTEMPTS:-12}"
health_delay_seconds="${DEPLOY_HEALTH_DELAY_SECONDS:-5}"

is_image_digest() (
  candidate="$1"
  repository="$2"

  case "$candidate" in
    "$repository"@sha256:*) ;;
    *) return 1 ;;
  esac

  candidate_digest="${candidate#*@sha256:}"
  [ "${#candidate_digest}" -eq 64 ] || return 1

  case "$candidate_digest" in
    *[!0-9a-f]*) return 1 ;;
  esac
)

if ! is_image_digest "$image" "ghcr.io/matthiasbusscher/maillume"; then
  echo "Deployment requires the immutable Maillume GHCR digest." >&2
  exit 2
fi

case "$expected_revision" in
  *[!0-9a-f]*)
    echo "Deployment requires a lowercase hexadecimal Git revision." >&2
    exit 2
    ;;
esac

if [ "${#expected_revision}" -ne 40 ] && [ "${#expected_revision}" -ne 64 ]; then
  echo "Deployment requires a complete 40- or 64-character Git revision." >&2
  exit 2
fi

for required_env in "$production_env" "$infrastructure_env"; do
  if [ ! -f "$required_env" ]; then
    echo "Missing $required_env" >&2
    exit 1
  fi
done

case "$health_attempts:$health_delay_seconds" in
  *[!0-9:]*|:*|*:)
    echo "Deployment health timing must use non-negative integers." >&2
    exit 2
    ;;
esac

if [ "$health_attempts" -eq 0 ]; then
  echo "Deployment health attempts must be greater than zero." >&2
  exit 2
fi

compose() {
  docker compose \
    --env-file "$production_env" \
    --env-file "$infrastructure_env" \
    -f "$compose_file" \
    "$@"
}

if [ -f "$current_image_state_file" ]; then
  stored_image="$(cat "$current_image_state_file")"

  if is_image_digest "$stored_image" "ghcr.io/matthiasbusscher/maillume"; then
    current_image="$stored_image"
  else
    echo "Ignoring non-immutable current image in $current_image_state_file." >&2
  fi
elif [ -f "$previous_image_state_file" ]; then
  # Releases before the two-slot state model stored the current known-good image
  # under the previous-image filename. Migrate it on the next healthy deploy.
  stored_image="$(cat "$previous_image_state_file")"
  if is_image_digest "$stored_image" "ghcr.io/matthiasbusscher/maillume"; then
    current_image="$stored_image"
  else
    echo "Ignoring non-immutable legacy image in $previous_image_state_file." >&2
  fi
fi

if [ -f "$current_revision_state_file" ]; then
  stored_revision="$(cat "$current_revision_state_file")"
  case "$stored_revision" in
    *[!0-9a-f]*) ;;
    *)
      if [ "${#stored_revision}" -eq 40 ] || [ "${#stored_revision}" -eq 64 ]; then
        current_revision="$stored_revision"
      fi
      ;;
  esac
elif [ -f "$previous_revision_state_file" ]; then
  stored_revision="$(cat "$previous_revision_state_file")"
  case "$stored_revision" in
    *[!0-9a-f]*) ;;
    *)
      if [ "${#stored_revision}" -eq 40 ] || [ "${#stored_revision}" -eq 64 ]; then
        current_revision="$stored_revision"
      fi
      ;;
  esac
fi

wait_for_health() {
  revision="$1"
  attempt=0
  while [ "$attempt" -lt "$health_attempts" ]; do
    if compose exec -T -e EXPECTED_REVISION="$revision" maillume \
      node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{if(!r.ok)process.exit(1);const body=await r.json();if(body.status!=='ok')process.exit(1);if(process.env.EXPECTED_REVISION && body.revision!==process.env.EXPECTED_REVISION)process.exit(1)}).catch(()=>process.exit(1))"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep "$health_delay_seconds"
  done
  return 1
}

MAILLUME_IMAGE="$image"
export MAILLUME_IMAGE

for configured_image in $(compose config --images); do
  if is_image_digest "$configured_image" "cloudflare/cloudflared"; then
    cloudflared_image="$configured_image"
  fi
done

if [ -z "$cloudflared_image" ]; then
  echo "CLOUDFLARED_IMAGE must be an official cloudflare/cloudflared@sha256 digest." >&2
  exit 1
fi

docker pull "$image"
docker pull "$cloudflared_image"
compose up -d --remove-orphans

if wait_for_health "$expected_revision"; then
  if [ -n "$current_image" ] && [ "$current_image" != "$image" ]; then
    printf '%s\n' "$current_image" > "$previous_image_state_file"
    if [ -n "$current_revision" ]; then
      printf '%s\n' "$current_revision" > "$previous_revision_state_file"
    else
      rm -f "$previous_revision_state_file"
    fi
  fi
  printf '%s\n' "$image" > "$current_image_state_file"
  printf '%s\n' "$expected_revision" > "$current_revision_state_file"
  docker image prune -f
  echo "Deployment healthy: $image"
  exit 0
fi

echo "Deployment failed health checks." >&2
if [ -n "$current_image" ] && [ "$current_image" != "$image" ]; then
  echo "Rolling back to $current_image" >&2
  MAILLUME_IMAGE="$current_image"
  export MAILLUME_IMAGE
  compose up -d --remove-orphans
  if wait_for_health "$current_revision"; then
    echo "Rollback healthy: $current_image"
  else
    echo "Rollback failed health checks; manual recovery is required." >&2
  fi
fi
exit 1
