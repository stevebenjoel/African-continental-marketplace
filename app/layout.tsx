import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./auth-extras.css";
import "./admin.css";
import "./vendor.css";
import "./seller.css";
import "./catalogue.css";
import "./inventory.css";
import "./marketplace.css";
import "./wholesale.css";
import "./retail-marketplace.css";
import "./commerce-modules.css";
import "./commerce-module-extras.css";
import "./cart.css";
import "./home-lanes.css";
import "./commerce-home.css";
import "./region.css";
import "./help.css";
import "./brand-scale.css";
import GlobalRegionBar from "@/app/components/global-region-bar";
import GlobalHomeLink from "@/app/components/global-home-link";
import { getInterfaceLanguage } from "@/src/modules/localization/server/language";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: "PAC-SM | Africa's Market. One Connected Continent.",
  description: "Pan-African retail, wholesale, procurement and trade infrastructure.",
  openGraph: {
    title: "PAC-SM | One market. One continent. Limitless trade.",
    description: "Pan-African retail, wholesale, procurement and trade infrastructure.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PAC-SM — One market. One continent. Limitless trade." }]
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = await getInterfaceLanguage();
  return <html lang={language} dir={language === "ar" ? "rtl" : "ltr"}><body suppressHydrationWarning><GlobalRegionBar />{children}<GlobalHomeLink /></body></html>;
}
