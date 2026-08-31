export type BrandCatalogueDefinition = Readonly<{ slug: string; name: string; aliases: readonly string[]; headline: string; description: string; accent: string }>;

export const BRAND_CATALOGUES: readonly BrandCatalogueDefinition[] = [
  { slug: "thermocool", name: "Haier Thermocool", aliases: ["Haier Thermocool", "Thermocool"], headline: "Everyday comfort, powered for African homes.", description: "Explore Thermocool cooling, cold-storage, garment-care, kitchen and power products supplied and fulfilled by Diplomats Stores on PAC-SM.", accent: "#e31b23" }
];

export const getBrandCatalogue = (slug: string) => BRAND_CATALOGUES.find(brand => brand.slug === slug.toLowerCase());
