import { PROJECT_COLOUR_STYLES } from "@/utilities/constants/projectColours";
import type { ProjectColour } from "@/utilities/enums/projectColours";
import { cn } from "@/utilities/helpers/cn";

const sizeClasses = {
  md: "size-14 rounded-[18px] text-[26px]",
  sm: "size-12 rounded-2xl text-[22px]",
} as const;

type ProjectTileProps = {
  name: string;
  colour: ProjectColour;
  size?: keyof typeof sizeClasses;
  className?: string;
};

/** The project's colour square with its first letter. Decorative: the name is always next to it. */
export function ProjectTile({ name, colour, size = "md", className }: ProjectTileProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-heading font-extrabold",
        sizeClasses[size],
        PROJECT_COLOUR_STYLES[colour].tile,
        className
      )}
    >
      {initial}
    </span>
  );
}
