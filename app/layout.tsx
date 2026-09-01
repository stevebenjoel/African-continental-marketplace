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
import "./product-gallery.css";
import "./commerce-modules.css";
import "./commerce-module-extras.css";
import "./cart.css";
import "./home-lanes.css";
import "./commerce-home.css";
import "./company-brands.css";
import "./region.css";
import "./help.css";
import "./brand-scale.css";
import "./academy.css";
import "./academy-reader.css";
import "./academy-assessment.css";
import "./academy-project.css";
import "./admin-team.css";
import GlobalRegionBar from "@/app/components/global-region-bar";
import GlobalHomeLink from "@/app/components/global-home-link";
import GlobalProductUploadLink from "@/app/components/global-product-upload-link";
import { getInterfaceLanguage } from "@/src/modules/localization/server/language";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdministrativeAccess } from "@/src/modules/authorization/domain/admin-access";
import AdminNotificationBell from "@/app/components/admin-notification-bell";
import SupportHub from "@/app/components/support-hub";
import "./support.css";
import "./account-lifecycle.css";
import "./admin-home-priority.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: { default: "PAC-SM | Africa's Market. One Connected Continent.", template: "%s | PAC-SM" },
  description: "Pan-African retail, wholesale, procurement and trade infrastructure.",
  applicationName: "PAC-SM",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    title: "PAC-SM | One market. One continent. Limitless trade.",
    description: "Pan-African retail, wholesale, procurement and trade infrastructure.",
    url: "/", siteName: "PAC-SM", type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PAC-SM — One market. One continent. Limitless trade." }]
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [language,user] = await Promise.all([getInterfaceLanguage(),getCurrentAppwriteUser()]);
  return <html lang={language} dir={language === "ar" ? "rtl" : "ltr"}><body suppressHydrationWarning><GlobalRegionBar />{children}{user&&hasAdministrativeAccess(user.labels)&&<AdminNotificationBell/>}<SupportHub/><GlobalProductUploadLink /><GlobalHomeLink /></body></html>;
}
