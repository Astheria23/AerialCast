#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  flask db upgrade
else
  echo "DATABASE_URL not set; skipping migrations."
fi

echo "Starting service: $*"
exec "$@"
