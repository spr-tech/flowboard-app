import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StructuredData } from "./structuredData";

describe("StructuredData", () => {
  it("describes Flowboard as a free web SoftwareApplication", () => {
    const { container } = render(<StructuredData />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? "")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Flowboard",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0" },
    });
  });

  it("never writes a raw < into the script", () => {
    const { container } = render(<StructuredData />);
    expect(container.querySelector("script")?.innerHTML).not.toContain("<");
  });
});
