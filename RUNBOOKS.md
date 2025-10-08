# Disaster Recovery Runbooks

## Overview
This document provides step-by-step procedures for disaster recovery scenarios in the Splitwise++ application.

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)
- **RPO**: ≤ 5 minutes (maximum data loss)
- **RTO**: ≤ 30 minutes (time to restore service)

## 1. Database Restore (Managed Services)

### For Neon/Supabase/Aurora:
1. **Access your database provider console**
2. **Create a new branch/instance at specific time:**
   - Navigate to "Backups" or "Point-in-time recovery"
   - Select the target time (e.g., "2025-10-08 13:45:00")
   - Create new branch/instance
3. **Update application configuration:**
   ```bash
   # Update DATABASE_URL in your environment
   export DATABASE_URL="postgresql://user:pass@new-host:5432/db"
   ```
4. **Verify restore:**
   ```bash
   cd apps/backend
   DATABASE_URL="<new_url>" pnpm ts-node scripts/check-balance-consistency.ts
   ```
5. **Update DNS/load balancer to point to new database**
6. **Clean up old database when confirmed working**

### For Self-hosted with pgBackRest:
1. **Stop application writes:**
   ```bash
   # Put app in maintenance mode or stop traffic
   kubectl scale deployment backend --replicas=0
   ```
2. **Restore database:**
   ```bash
   # Stop current database
   docker compose stop db
   
   # Restore to specific time
   docker run --rm \
     -v $(pwd)/infra/pgbackrest:/etc/pgbackrest \
     -v /var/lib/postgresql:/var/lib/postgresql \
     ghcr.io/pgbackrest/pgbackrest:latest \
     pgbackrest --stanza=swp --delta restore --type=time --target="2025-10-08 13:45:00"
   ```
3. **Start database:**
   ```bash
   docker compose start db
   ```
4. **Verify restore:**
   ```bash
   pnpm ts-node scripts/check-balance-consistency.ts
   ```
5. **Resume application traffic**

## 2. S3 Object Recovery

### Recover deleted receipt:
1. **List object versions:**
   ```bash
   aws s3api list-object-versions --bucket swp-receipts --prefix receipts/abc123
   ```
2. **Restore specific version:**
   ```bash
   aws s3api copy-object \
     --bucket swp-receipts \
     --copy-source "swp-receipts/receipts/abc123?versionId=xyz789" \
     --key receipts/abc123
   ```
3. **Update database references if needed**

### Recover from Glacier:
1. **Initiate restore request:**
   ```bash
   aws s3api restore-object \
     --bucket swp-receipts \
     --key receipts/abc123 \
     --restore-request Days=1,GlacierJobParameters='{"Tier":"Standard"}'
   ```
2. **Wait for completion (1-5 minutes for Standard tier)**
3. **Download restored object**

## 3. Redis Recovery

### Redis is treated as cache/queue (no backup needed):
- **BullMQ jobs**: Automatically retry on failure (idempotent)
- **Cache data**: Rebuilt on next request
- **Session data**: Users re-authenticate

### If Redis is completely lost:
1. **Restart Redis container:**
   ```bash
   docker compose restart redis
   ```
2. **Application will rebuild cache automatically**
3. **No data loss (Redis is not source of truth)**

## 4. Full Application Recovery

### Complete system restore:
1. **Stop all services:**
   ```bash
   docker compose down
   ```
2. **Restore database** (see section 1)
3. **Restore S3 objects** (if needed, see section 2)
4. **Start infrastructure:**
   ```bash
   docker compose up -d
   ```
5. **Run health checks:**
   ```bash
   # Check database
   pnpm ts-node scripts/check-balance-consistency.ts
   
   # Check application
   curl http://localhost:3000/health
   ```
6. **Verify all services:**
   ```bash
   # Test key endpoints
   curl http://localhost:3000/groups
   curl http://localhost:3000/balances
   ```

## 5. Automated Restore Drill

### Run the restore drill script:
```bash
# Test restore to specific time
./scripts/drill-restore.sh "2025-10-08 13:40:00"

# Clean up after testing
docker rm -f swp-restore-db
```

### CI/CD Backup Drill:
- Runs automatically every Sunday at 06:00 UTC
- Tests logical backup/restore process
- Validates data consistency
- See `.github/workflows/backup-drill.yml`

## 6. Monitoring & Alerting

### Key metrics to monitor:
- **Database connection count**
- **S3 request errors**
- **Redis memory usage**
- **Application response times**

### Alert thresholds:
- Database connection failures > 5%
- S3 error rate > 1%
- Application response time > 2s
- Disk space < 20%

## 7. Backup Verification

### Daily checks:
```bash
# Check backup status
docker compose exec pgbackrest pgbackrest --stanza=swp info

# Verify S3 bucket health
aws s3api head-bucket --bucket swp-receipts

# Test restore drill
./scripts/drill-restore.sh "$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')"
```

## 8. Emergency Contacts

- **Primary DBA**: [Your contact]
- **Infrastructure Lead**: [Your contact]
- **On-call Engineer**: [Your contact]

## 9. Post-Incident

### After any restore:
1. **Document the incident**
2. **Verify all data integrity**
3. **Update monitoring alerts if needed**
4. **Review and improve procedures**
5. **Test backup/restore process again**

---

**Last Updated**: 2025-10-08
**Next Review**: 2025-11-08
