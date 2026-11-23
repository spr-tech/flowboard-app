import { SITE_DESCRIPTION, SITE_NAME } from "@/utilities/constants/site";

/** schema.org description of Flowboard, so search engines can show it as a free web app. */
export const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
};

/**
 * JSON-LD (JSON for Linked Data) on the landing page. "<" is escaped so no value could ever close
 * the script tag early; JSON parsers read "<" back as "<".
 */
export function StructuredData() {
  const json = JSON.stringify(softwareApplication).replace(/</g, "\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
