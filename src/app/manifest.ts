import type { MetadataRoute } from "next";

import { brandColours } from "@/utilities/constants/brandColours";
import { SITE_DESCRIPTION, SITE_NAME } from "@/utilities/constants/site";

/** /manifest.webmanifest. Icons come from scripts/generate-icons.ts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/dashboard",
    display: "standalone",
    theme_color: brandColours.espresso,
    background_color: brandColours.cream,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
