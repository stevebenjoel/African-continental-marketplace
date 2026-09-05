# CJdropshipping connector — Phase 1 operations

## Configuration

1. Generate a dedicated 32-byte encryption key and encode it as Base64 (or use 64 hexadecimal characters).
2. Store it as the locked, server-only Coolify variable `SUPPLIER_CREDENTIAL_ENCRYPTION_KEY`.
3. Provision the `global_` Appwrite collections.
4. Sign in as Super Admin and open `/admin/global-commerce`.
5. Enter the CJ API key, save the supplier, then select **Test connection**.

Do not prefix supplier secrets with `NEXT_PUBLIC_`, commit them, paste them into documentation, or log them.

## Authentication behavior

The connector calls CJ API 2.0 `POST /authentication/getAccessToken` with the API key. PAC-SM encrypts the returned access token, refresh token, expiry dates and CJ account identifier. A connection test reuses a valid access token, refreshes an expired access token while the refresh token remains valid, and otherwise authenticates again. The refresh response may omit `openId`; PAC-SM safely retains the authenticated account identifier already stored in the encrypted envelope.

## Failure behavior

HTTP errors, invalid response shapes, rejected credentials and timeouts produce a sanitized connection error. PAC-SM stores the failure time and status without saving a clear-text key or token. A failed test does not activate product discovery or ordering.

## Phase 1 acceptance

Schema provisioning, encryption tests, role checks and a production build can be completed without a CJ key. The final external acceptance step requires a real CJ API key and a successful connection test from the deployed server.
