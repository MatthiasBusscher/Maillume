#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

previous_image_state_file=".previous-production-image"
previous_revision_state_file=".previous-production-revision"
current_image_state_file=".current-production-image"

for required_state in \
  "$current_image_state_file" \
  "$previous_image_state_file" \
  "$previous_revision_state_file"; do
  if [ ! -s "$required_state" ]; then
    echo "Rollback state is incomplete: $required_state" >&2
    exit 1
  fi
done

current_image="$(cat "$current_image_state_file")"
previous_image="$(cat "$previous_image_state_file")"
previous_revision="$(cat "$previous_revision_state_file")"

if [ "$current_image" = "$previous_image" ]; then
  echo "Rollback requires two distinct known-good images." >&2
  exit 1
fi

exec ./scripts/deploy-production.sh "$previous_image" "$previous_revision"
