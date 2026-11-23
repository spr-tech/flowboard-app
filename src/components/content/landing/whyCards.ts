// The six "Why Flowboard" cards. The desktop deck (whySection.tsx) shows label and name and fans
// them out; the phone deck (whyPhoneDeck.tsx) deals them one by one and adds the description.

export type WhyCard = {
  label: string;
  name: string;
  /** One line under the name, on phones only. */
  description: string;
  /** The desktop deck: place in the tight pile (x0, y0, r0) and when fanned out (x1, y1, r1). */
  pile: [string, string, string];
  fan: [string, string, string];
  colours: string;
  /** The small label, and the phone description. */
  labelColour: string;
};

export const WHY_CARDS: WhyCard[] = [
  {
    label: "Board",
    name: "Drag and drop",
    description: "Move work between columns in one motion.",
    pile: ["-99px", "18px", "-18deg"],
    fan: ["-270px", "40px", "-14deg"],
    colours: "bg-surface-page text-fg-primary",
    labelColour: "text-fg-muted",
  },
  {
    label: "Focus",
    name: "Priority labels",
    description: "High, Medium or Low on every card.",
    pile: ["-59px", "6px", "-11deg"],
    fan: ["-162px", "8px", "-8deg"],
    colours: "bg-surface-sunken text-fg-primary",
    labelColour: "text-fg-muted",
  },
  {
    label: "Deadlines",
    name: "Due dates",
    description: "Late tasks turn red so nothing slips.",
    pile: ["-20px", "0px", "-4deg"],
    fan: ["-54px", "-6px", "-3deg"],
    colours: "border border-fg-on-inverse/15 bg-surface-inverse-raised text-fg-on-inverse",
    labelColour: "text-fg-muted-on-inverse",
  },
  {
    label: "Team",
    name: "Owners and members",
    description: "Invite people and assign the work.",
    pile: ["20px", "0px", "4deg"],
    fan: ["54px", "-6px", "3deg"],
    colours: "bg-surface-card text-fg-primary",
    labelColour: "text-fg-muted",
  },
  {
    label: "Invites",
    name: "Email invites",
    description: "A link straight into the project.",
    pile: ["59px", "6px", "11deg"],
    fan: ["162px", "8px", "8deg"],
    colours: "bg-highlight text-fg-on-highlight",
    labelColour: "text-fg-on-highlight-secondary",
  },
  {
    label: "Progress",
    name: "A real done column",
    description: "Finished work counts on your dashboard.",
    pile: ["99px", "18px", "18deg"],
    fan: ["270px", "40px", "14deg"],
    colours: "bg-primary text-fg-on-primary",
    labelColour: "text-fg-on-primary",
  },
];
