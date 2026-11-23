import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast/toaster";
import { fontVariables } from "@/configs/fonts";
import { siteUrl } from "@/server/lib/siteUrl";
import { StoreProvider } from "@/stores/storeProvider";
import { brandColours } from "@/utilities/constants/brandColours";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/utilities/constants/site";

// Icons come from the file conventions next to this file (icon.svg, favicon.ico, apple-icon.png),
// the social card from opengraph-image.tsx and twitter-image.tsx; Next adds their tags itself.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// Cream, like the page, so mobile browser bars blend into it rather than sitting on top as a band.
export const viewport: Viewport = {
  themeColor: brandColours.cream,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
