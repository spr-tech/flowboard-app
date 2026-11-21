// Each project colour key → its token classes (src/app/globals.css, "Project colours").
// Written out in full because Tailwind only generates classes it can find as whole words.
import type { ProjectColour } from "@/utilities/enums/projectColours";

type ProjectColourStyle = {
  /** For the colour picker's accessible names. */
  label: string;
  /** A filled surface in the project colour with readable text: the letter tile. */
  tile: string;
  /** Just the fill: progress bars, the sidebar's colour square, swatches. */
  fill: string;
};

export const PROJECT_COLOUR_STYLES: Record<ProjectColour, ProjectColourStyle> = {
  vermilion: {
    label: "Vermilion",
    tile: "bg-project-vermilion text-project-vermilion-fg",
    fill: "bg-project-vermilion",
  },
  espresso: { label: "Espresso", tile: "bg-project-espresso text-project-espresso-fg", fill: "bg-project-espresso" },
  lime: { label: "Lime", tile: "bg-project-lime text-project-lime-fg", fill: "bg-project-lime" },
  blue: { label: "Blue", tile: "bg-project-blue text-project-blue-fg", fill: "bg-project-blue" },
  teal: { label: "Teal", tile: "bg-project-teal text-project-teal-fg", fill: "bg-project-teal" },
  plum: { label: "Plum", tile: "bg-project-plum text-project-plum-fg", fill: "bg-project-plum" },
  amber: { label: "Amber", tile: "bg-project-amber text-project-amber-fg", fill: "bg-project-amber" },
  rose: { label: "Rose", tile: "bg-project-rose text-project-rose-fg", fill: "bg-project-rose" },
};
