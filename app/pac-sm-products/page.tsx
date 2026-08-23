import { listPacsmProducts } from "@/src/modules/catalogue/server/repository";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { StorefrontView } from "@/src/modules/storefront/ui/storefront-view";

export const dynamic = "force-dynamic";

export default async function PacsmProductsPage() {
  const [products, pricing] = await Promise.all([listPacsmProducts(), getCurrencyDisplay()]);

  return <StorefrontView store={{ name: "PAC-SM Products", tagline: `African agro, food and beverage house collection · prices in ${pricing.currency}`, themePrimary: "#006B3F", themeAccent: "#F9C846" }} items={products.filter(item => item !== null)} format={pricing.format}/>;
}
