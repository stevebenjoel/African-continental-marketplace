# Global Product Import — Phase 3

Phase 3 selectively maps a reviewed supplier product into the existing PAC-SM catalogue. It never creates a second storefront or gives CJ ownership of the listing.

## Workflow

1. Global Catalogue Manager or Super Admin inspects a live CJ product.
2. The administrator chooses the PAC-SM title, category, brand, origin, images, variants and the active pricing-rule reference.
3. PAC-SM re-fetches the supplier record server-side, validates every selected variant and refuses duplicate supplier mappings.
4. A transaction creates a non-public `pending_review` product, variants, `supplier_products` mapping, `supplier_variants` mappings and audit event.
5. Selected supplier images are copied into PAC-SM-controlled Appwrite storage with existing image validation. A media failure is reported without destroying the auditable mapping.
6. The draft appears in Global Commerce → Imported Products and the existing Admin Catalogue review queue.

No `seller_offers` record, customer price, inventory balance or checkout availability is created in Phase 3. Phase 4 must calculate and approve landed economics first.

## Ownership and synchronization

- `submittedByVendorId` is always resolved from the active Diplomats Stores record on the server.
- Supplier product and variant identifiers remain mapping data and never replace PAC-SM IDs.
- Price and stock sync default on for the later synchronization phase.
- Content sync defaults off so supplier updates cannot overwrite curated PAC-SM copy.
- Imported mappings are retained for audit and duplicate prevention.
