#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 ghcr.io/owner/maillume:<commit-sha>" >&2
  exit 2
fi

image="$1"
compose_file="docker-compose.production.yml"
infrastructure_env=".env.infrastructure"
state_file=".previous-production-image"
previous_image=""

if [ ! -f "$infrastructure_env" ]; then
  echo "Missing $infrastructure_env" >&2
  exit 1
fi

compose() {
  docker compose --env-file "$infrastructure_env" -f "$compose_file" "$@"
}

if [ -f "$state_file" ]; then
  previous_image="$(cat "$state_file")"
fi

docker pull "$image"
MAILLUME_IMAGE="$image"
export MAILLUME_IMAGE
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
