import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { GITHUB_REPO_URL } from "@/utilities/constants/links";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";

/**
 * Each card's place in the tight pile (x0, y0, r0) and when fanned out (x1, y1, r1).
 * The movement itself is the `deck-card` utility in globals.css.
 */
const cards = [
  { label: "Board", name: "dnd-kit", pile: ["-110px", "18px", "-18deg"], fan: ["-300px", "40px", "-14deg"], colours: "bg-surface-page text-fg-primary", labelColour: "text-fg-muted" },
  { label: "Styling", name: "Tailwind CSS", pile: ["-66px", "6px", "-11deg"], fan: ["-180px", "8px", "-8deg"], colours: "bg-surface-sunken text-fg-primary", labelColour: "text-fg-muted" },
  { label: "Auth", name: "Auth.js and GitHub", pile: ["-22px", "0px", "-4deg"], fan: ["-60px", "-6px", "-3deg"], colours: "border border-fg-on-inverse/15 bg-surface-inverse-raised text-fg-on-inverse", labelColour: "text-fg-muted-on-inverse" },
  { label: "Data", name: "PostgreSQL and Prisma", pile: ["22px", "0px", "4deg"], fan: ["60px", "-6px", "3deg"], colours: "bg-surface-card text-fg-primary", labelColour: "text-fg-muted" },
  { label: "State", name: "Redux Toolkit", pile: ["66px", "6px", "11deg"], fan: ["180px", "8px", "8deg"], colours: "bg-highlight text-fg-on-highlight", labelColour: "text-fg-on-highlight-secondary" },
  { label: "Framework", name: "Next.js", pile: ["110px", "18px", "18deg"], fan: ["300px", "40px", "14deg"], colours: "bg-primary text-fg-on-primary", labelColour: "text-fg-on-primary" },
];

export function StackSection() {
  return (
    <section id="stack" className="rounded-t-[48px] bg-surface-inverse px-6 py-28 text-fg-on-inverse">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-14">
        <div className="flex-[1_1_420px]">
          <p className="mb-4.5 text-sm font-semibold text-highlight">Built in the open</p>
          <h2 className="text-[clamp(44px,6.4vw,92px)] leading-[0.95] font-extrabold tracking-[-0.045em]">
            Plan it.
            <br />
            <span className="text-primary">Drag it.</span>
            <br />
            <Highlight className="-rotate-2 rounded-[0.12em]">Ship it.</Highlight>
          </h2>
          <p className="mt-7 mb-8 max-w-115 text-[17px] leading-relaxed text-fg-muted-on-inverse">
            Flowboard is a real, working app, and every line of it is on GitHub. Read the code, open
            an issue, or fork it for your own team.
          </p>
          <ButtonLink href={GITHUB_REPO_URL} text="Read the code" variant="highlight" size="lg" />
        </div>

        <div className="min-w-0 flex-[1_1_420px]">
          {/* Focusable so keyboard users can fan the deck too (it fans on :focus-within).
              Scaled down on phones, where the pile is wider than the screen. */}
          <div
            tabIndex={0}
            role="list"
            aria-label="The stack Flowboard is built with"
            className="deck relative h-[420px] rounded-card-lg max-sm:scale-75"
          >
            <div className="h-full animate-sway">
              {cards.map((card) => (
                <div
                  key={card.name}
                  role="listitem"
                  className={cn(
                    "deck-card absolute top-1/2 left-1/2 -mt-31.25 -ml-23.75 flex h-62.5 w-47.5 flex-col justify-between rounded-[22px] p-5 shadow-2xl",
                    card.colours,
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
                  <span className="font-heading text-3xl leading-none font-extrabold tracking-[-0.03em]">
                    {card.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-center text-sm text-fg-muted-on-inverse">Hover the deck to fan it out</p>
        </div>
      </div>
    </section>
  );
}
