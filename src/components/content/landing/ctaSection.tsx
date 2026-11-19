import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Reveal } from "@/components/ui/reveal/reveal";
import { cssVars } from "@/utilities/helpers/cssVars";

export function CtaSection() {
  return (
    <section className="bg-surface-inverse px-6 pb-6">
      <Reveal effect="scale" className="relative mx-auto max-w-300 overflow-hidden rounded-[40px] bg-primary px-8 py-[clamp(36px,6vw,80px)] text-center">
        <span
          aria-hidden
          className="absolute top-9 right-[7%] animate-float rounded-full bg-highlight px-4 py-2 text-sm font-semibold text-fg-on-highlight"
          style={cssVars({ "--r": "10deg" })}
        >
          Free to start
        </span>
        <h2 className="mx-auto max-w-215 text-display-cta leading-[0.98] font-extrabold tracking-[-0.045em] text-fg-on-primary">
          Your next sprint starts on a clean board.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register" text="Create a free board" variant="inverse" size="xl" />
          <ButtonLink
            href="/login"
            text="Sign in"
            variant="outline"
            size="xl"
            className="border-fg-on-primary text-fg-on-primary hover:bg-fg-on-primary/10"
          />
        </div>
      </Reveal>
    </section>
  );
}
