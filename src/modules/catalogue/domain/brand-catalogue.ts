export type BrandCatalogueDefinition = Readonly<{ slug: string; name: string; aliases: readonly string[]; headline: string; description: string; accent: string; available: boolean }>;

export const BRAND_CATALOGUES: readonly BrandCatalogueDefinition[] = [
  { slug: "thermocool", name: "Haier Thermocool", aliases: ["Haier Thermocool", "Thermocool"], headline: "Everyday comfort, powered for African homes.", description: "Explore Thermocool cooling, cold-storage, garment-care, kitchen and power products supplied and fulfilled by Diplomats Stores on PAC-SM.", accent: "#e31b23", available: true },
  { slug: "lg", name: "LG", aliases: ["LG", "LG Electronics"], headline: "Life-enhancing technology for every room.", description: "Discover LG home appliances, entertainment and electronics as approved products are added to the PAC-SM catalogue.", accent: "#a50034", available: false },
  { slug: "panasonic", name: "Panasonic", aliases: ["Panasonic"], headline: "Dependable technology for modern living.", description: "Explore Panasonic appliances and electronics as approved products become available through PAC-SM.", accent: "#003b8f", available: false }
];

export const getBrandCatalogue = (slug: string) => BRAND_CATALOGUES.find(brand => brand.slug === slug.toLowerCase());
