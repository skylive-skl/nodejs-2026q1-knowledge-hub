#!/bin/sh
set -eu

# Apply migrations with retries in case DB just became healthy but is not ready for writes yet.
max_retries="${PRISMA_MIGRATE_RETRIES:-20}"
retry_delay_sec="${PRISMA_MIGRATE_RETRY_DELAY_SEC:-3}"
attempt=1

while ! npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_retries" ]; then
    echo "Prisma migrate deploy failed after $attempt attempts"
    exit 1
  fi

  echo "Prisma migrate deploy failed (attempt $attempt/$max_retries). Retrying in ${retry_delay_sec}s..."
  attempt=$((attempt + 1))
  sleep "$retry_delay_sec"
done

node scripts/seed-if-empty.js

exec node dist/src/main
