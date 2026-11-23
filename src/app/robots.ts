import type { MetadataRoute } from "next";

import { siteUrl } from "@/server/lib/siteUrl";

/** /robots.txt: the public pages may be crawled; the app, the token pages and the API may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register"],
      disallow: ["/dashboard", "/projects", "/settings", "/invite", "/reset-password", "/forgot-password", "/api"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
