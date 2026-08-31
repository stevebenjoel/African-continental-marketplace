import type { MetadataRoute } from "next";

const origin = process.env.APP_BASE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/admin/", "/api/", "/cart", "/checkout", "/login", "/messages/", "/notifications", "/operations/", "/orders/", "/seller/", "/wishlist"]
    }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
