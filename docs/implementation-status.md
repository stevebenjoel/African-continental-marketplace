# PAC-SM Implementation Status

> Backend decision (15 August 2026): Appwrite is the exclusive backend. The `pacsm-core` database is provisioned, vendor/KYB/KYC workflows are connected, and PostgreSQL is no longer an active dependency or deployment requirement.

## Current increment

**Phase 1A — Identity and authentication**

### Completed

- Self-hosted Appwrite endpoint and project integration
- External provisioning-key storage and runtime secret loading
- Secured product-media and private-KYC storage buckets
- Server-mediated account registration
- Server-mediated email/password login
- HTTP-only, SameSite session cookie with production HTTPS enforcement
- Authenticated account resolution on the server
- Protected `/account` route
- Appwrite session revocation and local cookie removal on logout
- Same-origin validation for authentication mutations
- Open-redirect protection for post-login navigation
- Strong registration-password validation and normalized email addresses
- Generic authentication errors that do not disclose account existence
- Live temporary-account registration/session test with cleanup
- Email-verification request and completion flows
- Password-recovery request and completion flows
- Account-enumeration-resistant recovery response
- Strong-password enforcement during recovery
- Appwrite-backed Super Administrator bootstrap
- Exact `superadmin` label authorization enforced on the server
- Protected `/admin` operational dashboard
- Live privileged login and Admin Centre access test

### Validation

- Appwrite administrative connection: passing
- Appwrite registration and protected-session flow: passing
- TypeScript: passing
- ESLint: passing
- Domain tests: passing
- Production build: passing
- Super Admin access test: passing

### External configuration still required

- Appwrite SMTP must be configured to deliver verification and recovery messages.
- `http://localhost:3000` must be registered as a development Web platform/callback host in Appwrite.
- The future Coolify production domain must be registered in Appwrite and used as `APP_BASE_URL`.

## Next increment

**PostgreSQL connection, migrations, identity projection, RBAC, and tenant authorization**

The schema and initial migration already exist. Execution requires a reachable PostgreSQL `DATABASE_URL`. Local Docker/PostgreSQL is not installed in the current environment, and the configured URL is still a placeholder. The database URL must be supplied as a local ignored secret and later as a locked Coolify runtime variable.

After connectivity is available, the next work is:

1. Apply and verify the initial migration.
2. Provision baseline roles and permissions.
3. Project authenticated Appwrite identities into `users` idempotently.
4. Implement business memberships and tenant-scoped authorization policies.
5. Add negative tests proving one vendor cannot access another vendor's resources.
