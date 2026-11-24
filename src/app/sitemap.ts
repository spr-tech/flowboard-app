import type { MetadataRoute } from "next";

import { siteUrl } from "@/server/lib/siteUrl";

/** /sitemap.xml: only the public pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
