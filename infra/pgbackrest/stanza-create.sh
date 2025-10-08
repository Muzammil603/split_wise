#!/bin/bash
set -euo pipefail

echo "==> Creating pgBackRest stanza for swp database..."
docker compose exec pgbackrest pgbackrest --stanza=swp stanza-create

echo "==> Checking stanza info..."
docker compose exec pgbackrest pgbackrest --stanza=swp info

echo "==> Stanza created successfully!"
