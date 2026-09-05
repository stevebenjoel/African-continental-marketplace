# PAC-SM Global Supplier Gateway architecture

## Phase 1 boundary

Phase 1 introduces the supplier control plane. It registers supply sources, protects credentials, verifies connectivity, records audit history and gates later modules. It does not import products, calculate landed prices, accept global checkout or submit supplier orders.

## Commercial ownership invariant

All CJ products and every product introduced by a future global supplier are controlled, sold and accounted for by Diplomats Stores. A supplier is a fulfilment source, not a PAC-SM vendor. Creation resolves the active `diplomats-stores` storefront and its approved vendor in Appwrite, then stores both IDs on the supplier record. There is no client-supplied owner override.

## Components

- `SupplierConnector` is the provider-neutral contract. It isolates authentication, connection testing and later product, logistics and order capabilities.
- The connector registry resolves a provider implementation without spreading provider checks through business modules.
- The CJ connector implements API 2.0 authentication and refresh behavior.
- Appwrite remains the only backend and system of record.
- AES-256-GCM application encryption protects credentials before they enter Appwrite.
- Feature flags prevent unfinished dependent workflows from becoming customer-visible.

## Appwrite records

- `global_suppliers`: supplier identity, provider, status, Diplomats ownership and connection health.
- `supplier_credentials`: encrypted credential envelope, masked display value, expiry and updater.
- `supplier_connections`: append-only connection checks and sanitized results.
- `global_feature_flags`: operational release controls.

## Authorization

Assigned global-commerce roles may inspect the control centre. Only Super Admin may submit a supplier credential or initiate authentication. API routes independently enforce Super Admin authorization; hiding a form is not treated as security.

## Release gates

The global commerce and CJ foundation flags are enabled. Global checkout stays in limited-pilot mode, while automatic supplier ordering stays under manual approval and is disabled. Product discovery, importing, pricing, stock sync, checkout, orders, webhooks and tracking remain later phases.
