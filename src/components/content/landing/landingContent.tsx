import { CtaSection } from "./ctaSection";
import { FaqSection } from "./faqSection";
import { FeaturesSection } from "./featuresSection";
import { HeroSection } from "./heroSection";
import { HowItWorksSection } from "./howItWorksSection";
import { LandingFooter } from "./landingFooter";
import { LandingNav } from "./landingNav";
import { SloganSection } from "./sloganSection";
import { WhySection } from "./whySection";

export default function LandingContent() {
  return (
    // overflow-x-clip, not overflow-hidden: "hidden" would make this div a scroll container,
    // and the board's scroll-driven tilt would then track it instead of the page.
    <div className="overflow-x-clip bg-surface-page">
      <LandingNav />
      {/* Section links stop the section just below the sticky bar (about 96px tall), not under it. */}
      <main className="[&_section[id]]:scroll-mt-28">
        <HeroSection />
        <SloganSection />
        <HowItWorksSection />
        <FeaturesSection />
        <WhySection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
