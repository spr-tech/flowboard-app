import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Reveal } from "@/components/ui/reveal/reveal";
import { Highlight } from "@/components/ui/typography/highlight";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";
import { buttonLift } from "./landingMotion";
import { WHY_CARDS } from "./whyCards";
import { WhyPhoneDeck } from "./whyPhoneDeck";

export function WhySection() {
  return (
    <section id="why" className="rounded-t-[48px] bg-surface-inverse px-6 py-22 text-fg-on-inverse">
      {/* Under md the text block is centred and sits 32px above the phone card stack. */}
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-14 max-md:gap-8">
        <div className="flex-[1_1_420px] max-md:text-center">
          <p className="mb-4.5 text-sm font-semibold text-highlight">Why teams pick it</p>
          {/* One block per line (not <br />s), so the lines can rise one after another. */}
          <Reveal
            as="h2"
            effect="rise"
            stagger={120}
            className="text-display-why leading-[0.95] font-extrabold tracking-[-0.045em] max-md:text-display-why-phone"
          >
            <span className="block">Plan it.</span>
            <span className="block text-primary">Drag it.</span>
            <span className="block">
              <Highlight className="-rotate-2 rounded-[0.12em]">Ship it.</Highlight>
            </span>
          </Reveal>
          <p className="mt-7 mb-8 max-w-115 text-[17px] leading-relaxed text-fg-muted-on-inverse max-md:mx-auto max-md:max-w-[32ch]">
            Everything lives on one board your whole team can see. No setup call, no training, no clutter. Just the
            work, who owns it and where it stands.
          </p>
          <ButtonLink
            href="/register"
            text="Start your first board"
            variant="highlight"
            size="lg"
            // Phones: 56px tall, full width up to 320px, centred.
            className={cn(buttonLift, "max-md:mx-auto max-md:flex max-md:h-14 max-md:w-full max-md:max-w-80")}
          />
        </div>

        {/* Phones (under md): the cards dealt one at a time as the page scrolls. */}
        <WhyPhoneDeck />

        {/* The card positions live in whyCards.ts; the movement is the `deck-card` utility in
            globals.css. */}
        <div className="min-w-0 flex-[1_1_420px] max-md:hidden">
          {/* Tablet and desktop (md up). Each card is focusable, so Tab (or a tap) brings it to the
              front and fans the deck (it fans on :focus-within). Starts stacked and spreads to its
              resting pile when it scrolls into view. */}
          <Reveal
            effect="fan"
            role="list"
            aria-label="What your team gets"
            className="deck relative h-[380px] rounded-card-lg max-sm:scale-75"
          >
            <div className="h-full animate-sway">
              {WHY_CARDS.map((card) => (
                <div
                  key={card.name}
                  role="listitem"
                  tabIndex={0}
                  className={cn(
                    "deck-card absolute top-1/2 left-1/2 -mt-28 -ml-21.25 flex h-56 w-42.5 flex-col justify-between rounded-[22px] p-5 shadow-2xl",
                    card.colours
                  )}
                  style={cssVars({
                    "--x0": card.pile[0],
                    "--y0": card.pile[1],
                    "--r0": card.pile[2],
                    "--x1": card.fan[0],
                    "--y1": card.fan[1],
                    "--r1": card.fan[2],
                  })}
                >
                  <span className={cn("text-[13px] font-semibold", card.labelColour)}>{card.label}</span>
                  <span className="font-heading text-[26px] leading-none font-extrabold tracking-[-0.03em]">
                    {card.name}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
          <p className="mt-2 text-center text-sm text-fg-muted-on-inverse">Hover the deck to fan it out</p>
        </div>
      </div>
    </section>
  );
}
