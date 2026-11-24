import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingFooter } from "@/components/content/landing/landingFooter";
import { stubScreenWidth, PHONE_WIDTH } from "@/test/matchMedia";
import { LEGAL_LAST_UPDATED } from "./legalPage";
import PrivacyContent from "./privacyContent";
import TermsContent from "./termsContent";

// The footer reveals itself with an animation that asks matchMedia; jsdom has none. Phone width,
// since these pages must read well on phones.
beforeEach(() => stubScreenWidth(PHONE_WIDTH));
afterEach(() => vi.unstubAllEnvs());

describe("/privacy", () => {
  it("renders the policy with its date, the services we use, and the support address", () => {
    vi.stubEnv("EMAIL_USER", "flowboard.team@gmail.com");
    render(<PrivacyContent />);

    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByText(`Last updated ${LEGAL_LAST_UPDATED}`)).toBeInTheDocument();
    for (const service of ["Neon", "Vercel", "Gmail"]) expect(screen.getByText(service)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "flowboard.team@gmail.com" })[0]).toHaveAttribute(
      "href",
      "mailto:flowboard.team@gmail.com"
    );
  });

  it("shows a placeholder, not an empty link, when there's no support address", () => {
    vi.stubEnv("EMAIL_USER", "");
    render(<PrivacyContent />);

    expect(screen.getAllByText("[support email]").length).toBeGreaterThan(0);
  });
});

describe("/terms", () => {
  it("renders the terms with their date and a link to the privacy policy", () => {
    render(<TermsContent />);

    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeInTheDocument();
    expect(screen.getByText(`Last updated ${LEGAL_LAST_UPDATED}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
  });
});

describe("landing footer", () => {
  it("links both pages, and its section links work from any page", () => {
    render(<LandingFooter />);
    const legal = screen.getByRole("navigation", { name: "Legal" });

    expect(within(legal).getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
    expect(within(legal).getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/#faq");
  });
});
