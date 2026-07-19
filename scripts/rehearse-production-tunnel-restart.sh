#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

health_attempts="${RESTART_HEALTH_ATTEMPTS:-12}"
health_delay_seconds="${RESTART_HEALTH_DELAY_SECONDS:-5}"

case "$health_attempts:$health_delay_seconds" in
  *[!0-9:]*|:*|*:)
    echo "Restart health timing must use non-negative integers." >&2
    exit 2
    ;;
esac

if [ "$health_attempts" -eq 0 ]; then
  echo "Restart health attempts must be greater than zero." >&2
  exit 2
fi

compose() {
  docker compose \
    --env-file .env.production \
    --env-file .env.infrastructure \
    -f docker-compose.production.yml \
    "$@"
}

compose restart cloudflared

attempt=1
while [ "$attempt" -le "$health_attempts" ]; do
  tunnel_container="$(compose ps -q cloudflared)"
  if [ -n "$tunnel_container" ] && \
     [ "$(docker inspect --format '{{.State.Running}}' "$tunnel_container")" = "true" ] && \
     compose exec -T maillume node -e \
       "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    echo "Tunnel restart rehearsal completed; Tunnel and application are healthy."
    exit 0
  fi

  if [ "$attempt" -lt "$health_attempts" ]; then
    sleep "$health_delay_seconds"
  fi
  attempt=$((attempt + 1))
done

echo "Tunnel restart rehearsal failed health checks." >&2
exit 1
