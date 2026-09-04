# PAC-SM implementation status

> Updated 3 September 2026. Appwrite is the exclusive PAC-SM backend. PostgreSQL, Redis and an external search service are not active application or deployment dependencies.

## Current increment

**Pilot stabilization and catalogue quality**

The application is a Next.js 16 App Router deployment backed by the self-hosted Appwrite project and the `pacsm-core` database. Work in this increment should harden the existing pilot workflows and data quality without introducing a second persistence architecture.

### Current platform baseline

- Server-mediated Appwrite authentication, verification, recovery, Google OAuth and protected account lifecycle controls
- Customer marketplace, regional preferences, cart, checkout, payment adapters, orders, returns, disputes, reviews, wishlist and messaging
- Approved-seller onboarding, storefronts, catalogue publication, product media, inventory, orders, wallet, analytics and integrations
- Retail, wholesale, RFQ, pre-order, white-label and institutional off-taker workflows
- Carrier, warehouse, tracking, trade, standards, export-readiness and Academy operations
- Role-scoped administration, catalogue moderation, notifications, reconciliation, commissions and audit records
- Appwrite private buckets for product media, storefront branding, KYC/KYB and operational evidence
- Public FAQ and Documentation maintained with user-facing behavior changes

### Catalogue and media controls

- Approved sellers can publish products and attach up to eight JPEG, PNG or WebP images of up to 8 MB each.
- Product-image batches are validated completely before the first Appwrite write. An invalid count, size, MIME type or file signature rejects the selected batch before any of its files are published.
- Original files remain in private Appwrite storage and are delivered through the controlled media route.
- Approved images are ordered with the selected primary image first and are shared by retail, wholesale and storefront presentation.
- Super Admin retains post-publication product and media moderation, takedown, restoration and deletion controls.

## Validation baseline

At commit `d8c7259`, before the current increment:

- Git `main` was clean and synchronized with `origin/main`.
- All 67 domain tests passed.
- TypeScript passed.

Every pilot release must also pass the complete gate in [PILOT-READINESS.md](./PILOT-READINESS.md), including lint, production build, browser acceptance, backup confirmation and named rollback ownership.

## External activation still required

- Keep the production and local Web platforms registered in Appwrite.
- Configure and verify Appwrite SMTP for verification and password-recovery delivery.
- Configure Google OAuth in Appwrite using the provider callback displayed by Appwrite.
- Keep the limited runtime Appwrite key in the deployment secret store and the provisioning key outside the application runtime.
- Activate live payment or banking providers only after their credentials, callbacks, webhook verification and operational acceptance are complete.
- Confirm Appwrite database and storage backups before a pilot release.

## Next stabilization work

1. Run the full release gate against the configured Appwrite environment.
2. Verify registration, verification, recovery, checkout, payment retry and fulfilment end to end on the canonical production host.
3. Audit pilot catalogue records for missing, low-quality or unlicensed media and incomplete product attributes.
4. Exercise concurrent inventory, programme-capacity and payment idempotency paths with production-like data.
5. Record the deployable image tag, rollback owner and backup evidence for the pilot release.
