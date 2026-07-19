#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
  echo "Usage: $0 <synthetic-audit-marker>" >&2
  exit 2
fi

audit_marker="$1"
cd "$(dirname "$0")/.."

compose() {
  docker compose \
    --env-file .env.production \
    --env-file .env.infrastructure \
    -f docker-compose.production.yml \
    "$@"
}

fail() {
  echo "Runtime audit failed: $1" >&2
  exit 1
}

pass() {
  echo "PASS: $1"
}

app_container="$(compose ps -q maillume)"
tunnel_container="$(compose ps -q cloudflared)"

[ -n "$app_container" ] || fail "application container is missing"
[ -n "$tunnel_container" ] || fail "Tunnel container is missing"

for container in "$app_container" "$tunnel_container"; do
  [ "$(docker inspect --format '{{.State.Running}}' "$container")" = "true" ] || \
    fail "a production container is not running"
  [ "$(docker inspect --format '{{.HostConfig.Privileged}}' "$container")" = "false" ] || \
    fail "a production container is privileged"
  case "$(docker inspect --format '{{json .HostConfig.CapDrop}}' "$container")" in
    *'"ALL"'*) ;;
    *) fail "a production container does not drop all capabilities" ;;
  esac
  case "$(docker inspect --format '{{json .HostConfig.SecurityOpt}}' "$container")" in
    *'no-new-privileges:true'*) ;;
    *) fail "a production container lacks no-new-privileges" ;;
  esac
  [ "$(docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$container")" = "unless-stopped" ] || \
    fail "a production container lacks its restart policy"
  [ "$(docker inspect --format '{{.HostConfig.LogConfig.Type}}' "$container")" = "json-file" ] || \
    fail "a production container has an unexpected log driver"
  [ "$(docker inspect --format '{{index .HostConfig.LogConfig.Config "max-size"}}' "$container")" = "10m" ] || \
    fail "a production container lacks the 10 MB log cap"
  [ "$(docker inspect --format '{{index .HostConfig.LogConfig.Config "max-file"}}' "$container")" = "3" ] || \
    fail "a production container lacks the three-file log rotation cap"
  [ "$(docker inspect --format '{{.HostConfig.Memory}}' "$container")" -gt 0 ] || \
    fail "a production container lacks a memory limit"
  [ "$(docker inspect --format '{{.HostConfig.NanoCpus}}' "$container")" -gt 0 ] || \
    fail "a production container lacks a CPU limit"
  [ -z "$(docker port "$container")" ] || fail "a production container publishes a host port"
done
pass "containers are running, bounded, unprivileged, and expose no host ports"

case "$(docker inspect --format '{{.Config.User}}' "$app_container")" in
  nextjs|1001|1001:1001) ;;
  *) fail "application container does not use the expected non-root user" ;;
esac
[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$app_container")" = "true" ] || \
  fail "application root filesystem is writable"
[ "$(docker inspect --format '{{len .Mounts}}' "$app_container")" -eq 0 ] || \
  fail "application container has an unexpected persistent mount"
[ "$(docker inspect --format '{{.State.Health.Status}}' "$app_container")" = "healthy" ] || \
  fail "application container is not healthy"
pass "application is non-root, read-only, mount-free, and healthy"

if docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$app_container" | \
  grep -Eq '^(OPENAI_API_KEY|ANTHROPIC_API_KEY|AI_API_KEY)=.+$'; then
  fail "hosted AI credentials are present in the public beta container"
fi
pass "hosted AI credentials are absent or empty"

for container in "$app_container" "$tunnel_container"; do
  if docker logs --since 20m "$container" 2>&1 | grep -Fq -- "$audit_marker"; then
    fail "synthetic scan content appeared in container logs"
  fi
done
pass "synthetic scan content is absent from application and Tunnel logs"

disk_percent="$(df -P / | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')"
case "$disk_percent" in
  ''|*[!0-9]*) fail "root disk utilization could not be read" ;;
esac
[ "$disk_percent" -lt 85 ] || fail "root disk utilization is at or above 85 percent"
pass "root disk utilization is below 85 percent"

echo "Production runtime audit completed without exposing logs or configuration values."
