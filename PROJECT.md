# African Continental Super Marketplace

## Project Overview

**Project name:** African Continental Super Marketplace (ACSM)

**Project type:** Pan-African multi-vendor digital marketplace

**Vision:** To become Africa's trusted digital marketplace, connecting buyers, sellers, manufacturers, farmers, artisans, service providers, and logistics partners across the continent and beyond.

**Mission:** To make African products and services easier to discover, buy, sell, pay for, and deliver through one secure and inclusive platform.

## The Problem

African commerce is highly fragmented. Many businesses struggle to reach customers outside their immediate communities, while buyers have difficulty finding trusted products, comparing prices, making cross-border payments, and arranging reliable delivery. Small businesses also lack affordable digital tools for inventory, marketing, customer service, and sales analytics.

## The Solution

African Continental Super Marketplace will provide a unified platform where verified vendors can create stores, list products or services, receive secure payments, manage orders, and connect with delivery partners. Buyers will be able to discover products from different African countries, shop in familiar currencies and languages, and track purchases from checkout to delivery.

## Target Users

- Individual shoppers in Africa and the African diaspora
- Small and medium-sized businesses
- Farmers and agricultural cooperatives
- Manufacturers and wholesalers
- Artisans, fashion designers, and creative businesses
- Service providers and independent professionals
- Importers, exporters, and institutional buyers
- Logistics, warehousing, and fulfillment partners

## Core Marketplace Categories

- Agriculture and food
- Fashion, textiles, and beauty
- Electronics and appliances
- Home, furniture, and construction
- Health and wellness
- Automotive products and parts
- Arts, crafts, and cultural products
- Business and professional services
- Industrial equipment and wholesale goods
- Digital products and education

## Minimum Viable Product (MVP)

### Buyer Features

- Account registration and secure sign-in
- Product search, filters, categories, and country-based discovery
- Product pages with pricing, availability, seller details, and reviews
- Shopping cart and checkout
- Multiple payment options and supported currencies
- Order history, delivery tracking, returns, and dispute requests
- Saved products and stores
- Ratings and verified-purchase reviews

### Seller Features

- Seller registration, identity checks, and approval
- Custom storefront and business profile
- Product and inventory management
- Pricing, discounts, and promotional tools
- Order, return, and customer-message management
- Sales, payout, and performance dashboard
- Wholesale and retail pricing options

### Platform Administration

- User, vendor, listing, and category management
- Vendor verification and risk monitoring
- Commission and payout management
- Order, refund, and dispute oversight
- Content moderation and fraud controls
- Marketplace analytics and reporting
- Country, currency, language, tax, and delivery configuration

## Future Capabilities

- Business-to-business procurement and quotation requests
- Cross-border trade documentation support
- Marketplace wallet and escrow services
- Buy-now-pay-later and seller financing through licensed partners
- AI-assisted product discovery and seller tools
- Live shopping and social commerce
- Warehousing and fulfillment network
- Mobile applications and low-bandwidth/offline-friendly experiences
- Loyalty, rewards, referrals, and affiliate programs

## Geographic Rollout

**Phase 1 — Pilot:** Launch in one primary market with a focused selection of verified sellers and reliable delivery coverage.

**Phase 2 — Regional expansion:** Add selected countries within the pilot region, including localized payments, currencies, languages, and logistics.

**Phase 3 — Continental marketplace:** Expand across African regions and establish cross-border commerce corridors.

**Phase 4 — Global access:** Serve diaspora and international buyers seeking authentic African products and services.

## Business Model

- Commission on completed sales
- Seller subscription plans
- Sponsored products and advertising
- Payment and fulfillment service fees
- Premium storefront, analytics, and marketing tools
- Wholesale, procurement, and enterprise service fees

## Brand Direction

The brand should feel modern, trustworthy, energetic, inclusive, and unmistakably African without relying on stereotypes. It should celebrate the continent's diversity and communicate opportunity, connection, quality, and progress.

**Working tagline:** Africa's Market. One Connected Continent.

## Guiding Principles

- Trust and safety first
- Designed for mobile and low-bandwidth access
- Inclusive of small and informal businesses
- Transparent pricing and marketplace policies
- Localized by country, language, currency, and payment method
- Accessible and easy to use
- Secure handling of customer and business data
- Compliance with applicable commerce, tax, privacy, and financial regulations

## Key Partnerships

- Banks, payment processors, and mobile-money providers
- Delivery, freight, and warehousing companies
- Business registration and identity-verification providers
- Trade associations and chambers of commerce
- Government and regional trade organizations
- Insurance and licensed financial-service providers

## Success Measures

- Number of approved and active sellers
- Number and value of completed orders
- Monthly active buyers
- Product availability and category coverage
- Checkout conversion and repeat-purchase rates
- On-time delivery and successful fulfillment rates
- Refund, dispute, and fraud rates
- Seller revenue growth and customer satisfaction
- Expansion into additional countries and trade corridors

## Major Risks and Responses

- **Fraud and counterfeit goods:** Seller verification, listing moderation, escrow, buyer protection, and enforcement policies.
- **Delivery complexity:** Integrate multiple logistics partners and show clear delivery estimates and tracking.
- **Payment fragmentation:** Support trusted local payment methods through licensed providers.
- **Cross-border regulation:** Launch country by country with legal, tax, customs, and data-protection reviews.
- **Low buyer trust:** Use verified sellers, transparent reviews, secure payments, responsive support, and clear dispute resolution.
- **Connectivity limitations:** Prioritize fast pages, compressed media, simple flows, and mobile-first design.

## Initial Delivery Milestones

1. Validate the target country, priority customer group, and first product categories.
2. Define marketplace policies, seller requirements, commissions, and operating model.
3. Confirm payment, identity-verification, and delivery partners.
4. Produce the product requirements, user journeys, and technical architecture.
5. Design and test a clickable marketplace prototype.
6. Build and test the MVP with a controlled group of sellers and buyers.
7. Launch the pilot, measure results, and improve before regional expansion.

## Decisions Required Before Development

- Pilot country or countries
- Initial marketplace categories
- Business-to-consumer, business-to-business, or combined focus
- Physical products, services, digital products, or a combination
- Supported languages and currencies at launch
- Seller commission and subscription structure
- Preferred payment and delivery partners
- Ownership, operating entity, launch budget, and target launch date

## Current Status

**Stage:** Pilot production readiness

The application framework now includes retail, wholesale, seller onboarding, KYC/KYB, procurement, off-takers, payments, fulfilment, warehousing, logistics, trade compliance, role-separated administration, localization and Appwrite-backed authentication. New major modules are temporarily subordinate to stabilizing the controlled pilot.

**Current release gate:** TypeScript, ESLint, domain tests, production build and local desktop/mobile Playwright acceptance tests must pass before a pilot release. PAC-SM currently uses the one provided Appwrite backend; no staging environment has been created.

## Global Supplier Gateway

Phase 1 establishes the provider-neutral global supplier control plane with CJdropshipping as the first connector. The permanent commercial rule is that every CJ product and every product from future global suppliers is controlled, sold and accounted for by Diplomats Stores; suppliers remain fulfilment sources and cannot become the marketplace owner of those listings. Appwrite collections `global_suppliers`, `supplier_credentials`, `supplier_connections` and `global_feature_flags` are provisioned in `pacsm-core`. Credential creation and authentication remain Super Admin-only, while scoped global-commerce roles provide operational visibility. Product discovery, import, pricing, synchronization, checkout and supplier order submission remain gated for subsequent phases.

**Next recommended action:** Configure a locked `SUPPLIER_CREDENTIAL_ENCRYPTION_KEY` in Coolify and the local server environment, add the real CJ API key through Admin → Global Commerce, and pass the live connection test before beginning Phase 2 product discovery and controlled import. A separate staging environment remains an optional future risk-control decision and is not assumed to exist.
