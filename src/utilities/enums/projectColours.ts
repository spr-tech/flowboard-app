// The 8 project colours (docs/plan/03-data-model.md). The database stores the key, never hex;
// src/utilities/constants/projectColours.ts maps each key to its token classes.
import type { ProjectColour as DatabaseProjectColour } from "@/lib/generated/prisma";

export const PROJECT_COLOURS = ["vermilion", "espresso", "lime", "blue", "teal", "plum", "amber", "rose"] as const;

export type ProjectColour = (typeof PROJECT_COLOURS)[number];

// Fails to compile if this list and the Prisma enum ever drift apart, in either direction.
type SameKeys = [ProjectColour] extends [DatabaseProjectColour]
  ? [DatabaseProjectColour] extends [ProjectColour]
    ? true
    : false
  : false;
export const PROJECT_COLOURS_MATCH_DATABASE: SameKeys = true;
