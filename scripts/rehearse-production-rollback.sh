#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

current_image="$(cat .current-production-image)"
current_revision="$(cat .current-production-revision)"
previous_image="$(cat .previous-production-image)"

if [ "$current_image" = "$previous_image" ]; then
  echo "Rollback rehearsal requires two distinct known-good images." >&2
  exit 1
fi

./scripts/rollback-production.sh

if [ "$(cat .current-production-image)" != "$previous_image" ]; then
  echo "Rollback rehearsal did not activate the previous image." >&2
  exit 1
fi

./scripts/rollback-production.sh

if [ "$(cat .current-production-image)" != "$current_image" ] || \
   [ "$(cat .current-production-revision)" != "$current_revision" ]; then
  echo "Rollback rehearsal did not restore the starting release." >&2
  exit 1
fi

echo "Rollback rehearsal completed and restored the starting release."
