# PAC-SM pilot production readiness

## Release gate

Every pilot release must pass:

1. `npm run quality`
2. `npm run build`
3. `npm run test:e2e`
4. Appwrite database and storage backup confirmation
5. Local acceptance against the currently configured Appwrite backend for registration, verification, recovery, checkout and fulfilment
6. A named rollback owner and the previously deployable image tag

## Current environment

PAC-SM currently has one deployed environment and one provided Appwrite backend. No staging Appwrite project or staging deployment exists. Local development and browser acceptance use the existing backend values already configured outside the repository.

GitHub Actions therefore runs only the environment-independent quality checks. It does not connect CI to the live Appwrite backend and does not require invented staging variables. Production browser checks are run locally with `npm run test:e2e` and the existing external runtime-key file. The provisioning key must never be added to GitHub Actions or Coolify application runtime variables.

## Authentication acceptance

Verify against the current configured environment:

- Email registration creates one account and one session.
- The verification message arrives with the expected sender and public HTTPS link.
- Verification works in the active browser and after a sign-in handoff in another browser.
- Expired verification links fail safely and resend produces a new email.
- Password recovery uses the public domain and invalid or reused tokens fail safely.
- Google registration creates a PAC-SM session and matching-email sign-in does not create a duplicate identity.
- Cancelled Google consent returns to sign-in with no session.
- Altered OAuth callback state is rejected.
- Sign-out clears the session and returns to the public domain.

## External activation checklist

- Register the actual public host and localhost as Appwrite Web platforms.
- Enable Google in Appwrite Auth and place the Appwrite-displayed redirect URI in the matching Google OAuth client.
- Store the Google client ID and secret in Appwrite only.
- Configure Appwrite SMTP and confirm the mail worker is healthy.
- Keep production registration controlled until the complete acceptance list passes.
