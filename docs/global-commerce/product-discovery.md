# Global Product Discovery — Phase 2

## Purpose

The discovery workspace lets authorized staff inspect the current CJ catalogue inside PAC-SM without copying or publishing supplier products. CJ remains a supply source and Diplomats Stores remains the future commercial owner.

## Administrative workflow

1. Verify the CJ connection in **Admin → Global Commerce**.
2. Open **Global Product Discovery**.
3. Search by product name or SKU, optionally selecting a CJ category or two-letter inventory-country code.
4. Open a result to inspect its gallery, identifiers, dimensions, variants, supplier costs and reported warehouse inventory.
5. Leave the product in the `Not imported` state until the controlled Phase 3 import workflow is available.

## Integration behavior

- Categories: `GET /product/getCategory`
- Search: `GET /product/listV2` with a maximum PAC-SM page size of 24
- Detail: `GET /product/query`
- Variant inventory: `GET /product/stock/queryByVid`, called sequentially and capped to the first 10 variants per inspection while every returned variant remains visible

Requests are server-only, uncached and time-bounded. PAC-SM checks token expiry before discovery, refreshes credentials when required, and re-encrypts changed tokens in Appwrite. Supplier errors are reduced to safe administrative messages; API keys and tokens never reach browser markup.

## Important commercial limits

The USD value displayed during discovery is an indicative supplier cost, not a PAC-SM selling price. Phase 2 does not create products, variants, offers, media, inventory balances, customer search results, checkout lines or supplier orders. These require controlled importing, category mapping, landed-cost pricing and later release gates.
