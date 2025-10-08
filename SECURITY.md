# Security & Compliance Guide

This document outlines the security measures implemented in Splitwise++ and provides guidance for maintaining security best practices.

## 🔒 Security Features Implemented

### 1. Authentication & Authorization
- ✅ JWT-based authentication with access/refresh token rotation
- ✅ Argon2 password hashing
- ✅ Role-based access control (GroupOwner, GroupMember)
- ✅ Protected routes with guards
- ✅ Token expiration and refresh mechanisms

### 2. Input Validation & Sanitization
- ✅ Class-validator decorators on all DTOs
- ✅ ValidationPipe with whitelist and transform
- ✅ File upload validation (size, MIME type)
- ✅ SQL injection prevention via Prisma ORM

### 3. Security Headers
- ✅ Helmet.js with comprehensive security headers
- ✅ Content Security Policy (CSP)
- ✅ Cross-Origin Resource Policy (CORP)
- ✅ HSTS with preload
- ✅ X-Frame-Options, X-Content-Type-Options

### 4. Rate Limiting
- ✅ Per-endpoint rate limiting with @nestjs/throttler
- ✅ Redis-based throttling for cluster safety
- ✅ Different limits for different endpoint types

### 5. Data Protection
- ✅ Audit logging with redaction
- ✅ Idempotency keys for duplicate prevention
- ✅ Data export and anonymization
- ✅ Soft delete with anonymization
- ✅ Privacy controls (GDPR/CCPA ready)

### 6. Infrastructure Security
- ✅ Environment variable validation
- ✅ Secrets management
- ✅ Dependency scanning
- ✅ Container security scanning
- ✅ OWASP ZAP security testing

## 🛡️ Security Checklist

### Pre-Deployment Security Review

#### Environment & Secrets
- [ ] All environment variables validated with `pnpm tsx scripts/check-env.ts`
- [ ] JWT secrets are 32+ characters and cryptographically secure
- [ ] No default/development secrets in production
- [ ] CORS origins restricted to production domains only
- [ ] Database credentials are strong and rotated regularly

#### Code Security
- [ ] All endpoints protected with appropriate guards
- [ ] Input validation on all user inputs
- [ ] No hardcoded secrets or credentials
- [ ] Error messages don't leak sensitive information
- [ ] File uploads properly validated and sanitized

#### Dependencies
- [ ] `pnpm audit` passes with no high/critical vulnerabilities
- [ ] Dependencies pinned to specific versions
- [ ] Regular dependency updates scheduled
- [ ] SBOM generated and reviewed

#### Infrastructure
- [ ] Database connections encrypted (TLS)
- [ ] Redis connections secured
- [ ] S3/MinIO access properly configured
- [ ] Backup and restore procedures tested
- [ ] Monitoring and alerting configured

## 🔍 Security Testing

### Automated Security Scans

1. **Dependency Audit**
   ```bash
   pnpm audit --audit-level moderate
   ```

2. **Environment Validation**
   ```bash
   pnpm tsx scripts/check-env.ts
   ```

3. **Container Security**
   ```bash
   # Using Trivy
   trivy image splitwise-plus:latest
   ```

4. **OWASP ZAP Testing**
   ```bash
   # Automated in CI/CD pipeline
   # Manual testing: zap-baseline.py -t http://localhost:3000
   ```

### Manual Security Testing

1. **Authentication Testing**
   - [ ] Test with invalid/expired tokens
   - [ ] Test token refresh mechanism
   - [ ] Test role-based access controls
   - [ ] Test brute force protection

2. **Input Validation Testing**
   - [ ] Test with malformed JSON
   - [ ] Test with oversized payloads
   - [ ] Test with invalid file uploads
   - [ ] Test SQL injection attempts

3. **Authorization Testing**
   - [ ] Test cross-group access attempts
   - [ ] Test privilege escalation
   - [ ] Test resource access without membership

## 🚨 Incident Response

### Security Incident Checklist

1. **Immediate Response**
   - [ ] Assess scope and impact
   - [ ] Contain the incident
   - [ ] Preserve evidence
   - [ ] Notify stakeholders

2. **Investigation**
   - [ ] Review audit logs
   - [ ] Check system integrity
   - [ ] Identify root cause
   - [ ] Document findings

3. **Recovery**
   - [ ] Apply security patches
   - [ ] Reset compromised credentials
   - [ ] Restore from clean backups
   - [ ] Verify system integrity

4. **Post-Incident**
   - [ ] Update security measures
   - [ ] Review and update procedures
   - [ ] Conduct lessons learned
   - [ ] Update incident response plan

## 📋 Compliance

### GDPR Compliance
- ✅ Data export functionality
- ✅ Account deletion with anonymization
- ✅ Audit logging for data access
- ✅ Privacy controls for user data

### CCPA Compliance
- ✅ Right to know about data collection
- ✅ Right to delete personal information
- ✅ Right to opt-out of data sales
- ✅ Non-discrimination for privacy choices

### SOC 2 Type II Preparation
- ✅ Access controls and authentication
- ✅ Data encryption in transit and at rest
- ✅ Audit logging and monitoring
- ✅ Incident response procedures
- ✅ Vendor management processes

## 🔧 Security Tools & Commands

### Environment Validation
```bash
# Check all environment variables
pnpm tsx scripts/check-env.ts
```

### Dependency Scanning
```bash
# Audit dependencies
pnpm audit

# Snyk security scan (requires SNYK_TOKEN)
npx snyk test

# Generate SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

### Container Security
```bash
# Trivy vulnerability scan
trivy image splitwise-plus:latest

# Docker security scan
docker scout cves splitwise-plus:latest
```

### Security Testing
```bash
# OWASP ZAP baseline scan
zap-baseline.py -t http://localhost:3000

# Burp Suite (manual testing)
# Import OpenAPI spec and run active scans
```

## 📞 Security Contacts

- **Security Team**: security@splitwiseplus.app
- **Incident Response**: incident@splitwiseplus.app
- **Bug Bounty**: security@splitwiseplus.app

## 🔄 Regular Security Tasks

### Daily
- [ ] Monitor security alerts and logs
- [ ] Check for new vulnerability disclosures
- [ ] Review failed authentication attempts

### Weekly
- [ ] Review dependency updates
- [ ] Check security scan results
- [ ] Review access logs for anomalies

### Monthly
- [ ] Rotate secrets and credentials
- [ ] Review and update security policies
- [ ] Conduct security awareness training
- [ ] Test backup and restore procedures

### Quarterly
- [ ] Comprehensive security audit
- [ ] Penetration testing
- [ ] Security policy review
- [ ] Incident response drill

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [CCPA Compliance Guide](https://oag.ca.gov/privacy/ccpa)

---

**Remember**: Security is an ongoing process, not a one-time implementation. Regular reviews, updates, and testing are essential for maintaining a secure application.
