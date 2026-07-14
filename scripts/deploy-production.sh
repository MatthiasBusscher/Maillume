#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 ghcr.io/matthiasbusscher/maillume@sha256:<64-hex-digest>" >&2
  exit 2
fi

image="$1"
compose_file="docker-compose.production.yml"
production_env=".env.production"
infrastructure_env=".env.infrastructure"
state_file=".previous-production-image"
previous_image=""
cloudflared_image=""

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

for required_env in "$production_env" "$infrastructure_env"; do
  if [ ! -f "$required_env" ]; then
    echo "Missing $required_env" >&2
    exit 1
  fi
done

compose() {
  docker compose \
    --env-file "$production_env" \
    --env-file "$infrastructure_env" \
    -f "$compose_file" \
    "$@"
}

if [ -f "$state_file" ]; then
  stored_image="$(cat "$state_file")"

  if is_image_digest "$stored_image" "ghcr.io/matthiasbusscher/maillume"; then
    previous_image="$stored_image"
  else
    echo "Ignoring non-immutable rollback image in $state_file." >&2
  fi
fi

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

attempt=0
while [ "$attempt" -lt 12 ]; do
  if compose exec -T maillume \
    node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    printf '%s\n' "$image" > "$state_file"
    docker image prune -f
    echo "Deployment healthy: $image"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "Deployment failed health checks." >&2
if [ -n "$previous_image" ] && [ "$previous_image" != "$image" ]; then
  echo "Rolling back to $previous_image" >&2
  MAILLUME_IMAGE="$previous_image"
  export MAILLUME_IMAGE
  compose up -d --remove-orphans
fi
exit 1
