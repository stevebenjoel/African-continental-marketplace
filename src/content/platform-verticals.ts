export type PlatformVertical = { slug: string; name: string; icon: string; summary: string; accent: string; available: boolean; href: string };

export const PLATFORM_VERTICALS: PlatformVertical[] = [
  { slug: "market", name: "Market", icon: "🛍", summary: "Retail, wholesale and trusted African products", accent: "#ff6a21", available: true, href: "/products" },
  { slug: "property", name: "Property", icon: "⌂", summary: "Verified homes, land and commercial property", accent: "#2f8d68", available: false, href: "/verticals/property" },
  { slug: "motors", name: "Motors", icon: "◆", summary: "Vehicles, inspections and mobility services", accent: "#315c9e", available: false, href: "/verticals/motors" },
  { slug: "agro", name: "Agro", icon: "🌾", summary: "Produce, farm inputs and commodity opportunities", accent: "#78a83c", available: false, href: "/verticals/agro" },
  { slug: "industrial", name: "Industrial", icon: "⚙", summary: "Machinery, equipment and industrial supply", accent: "#b47a20", available: false, href: "/verticals/industrial" },
  { slug: "business", name: "Business", icon: "▦", summary: "Businesses, franchises and commercial assets", accent: "#7856a8", available: false, href: "/verticals/business" },
  { slug: "services", name: "Services", icon: "✦", summary: "Verified professional and commercial services", accent: "#bf496e", available: false, href: "/verticals/services" },
  { slug: "finance", name: "Finance", icon: "◎", summary: "Partner-led finance for eligible transactions", accent: "#137c7a", available: false, href: "/verticals/finance" },
  { slug: "logistics", name: "Logistics", icon: "🚚", summary: "Delivery, freight, tracking and warehousing", accent: "#d75d25", available: false, href: "/verticals/logistics" },
  { slug: "investment", name: "Investment", icon: "↗", summary: "Vetted African opportunities and partnerships", accent: "#374c86", available: false, href: "/verticals/investment" }
];

export const findPlatformVertical = (slug: string) => PLATFORM_VERTICALS.find(vertical => vertical.slug === slug);
