#!/bin/bash
set -euo pipefail

# Full backup at 2 AM daily
if [ "$(date +%H)" = "02" ]; then
    echo "$(date): Starting full backup..."
    docker compose exec -T pgbackrest pgbackrest --stanza=swp backup --type=full
    echo "$(date): Full backup completed"
else
    echo "$(date): Starting differential backup..."
    docker compose exec -T pgbackrest pgbackrest --stanza=swp backup --type=diff
    echo "$(date): Differential backup completed"
fi

# Show backup info
docker compose exec -T pgbackrest pgbackrest --stanza=swp info
