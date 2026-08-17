# ADR 0001: Appwrite-only backend

Date: 2026-08-15

## Decision

PAC-SM uses the self-hosted Appwrite project as its only backend. Appwrite Accounts owns identity, Appwrite Databases owns structured data, and Appwrite Storage owns public product media and private compliance documents. No local backend or PostgreSQL service is deployed.

All privileged database and storage operations run through Next.js server routes. Collections and buckets have no client-level permissions, preventing browser clients from bypassing authorization and workflow validation. The full-scope provisioning key is read from an external secret file for idempotent infrastructure provisioning. Coolify production supplies one limited `APPWRITE_API_KEY` runtime secret covering only the authentication administration, document, transaction, and file operations used by the application.

## Operational consequence

Multi-record marketplace workflows use idempotency, audit events, and compensating updates rather than assuming a relational transaction. Financial modules must use immutable journal records and Appwrite transaction support where available.
