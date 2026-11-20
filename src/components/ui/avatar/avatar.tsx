import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from "@/components/ui/primitives/avatar";
import { cn } from "@/utilities/helpers/cn";

const sizeClasses = {
  sm: "size-7 text-xs",
  md: "size-9 text-[13px]",
  lg: "size-11 text-sm",
} as const;

export type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
};

/** "Ade Olusegun" → "AO"; a single word gives one letter. */
function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/** A person's picture, falling back to their initials on lime while it loads or if there is none. */
export function Avatar({ name, imageUrl, size = "md", className }: AvatarProps) {
  return (
    <AvatarRoot className={cn(sizeClasses[size], "after:border-0", className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback className="bg-highlight font-semibold text-fg-on-highlight">{getInitials(name)}</AvatarFallback>
    </AvatarRoot>
  );
}
