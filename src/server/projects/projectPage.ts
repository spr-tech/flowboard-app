import { notFound } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { findProjectName } from "./projectName.service";

/**
 * For the /projects/[projectId] pages: the project's name, or the not-found page when it doesn't
 * exist or I'm not a member. `cache` makes generateMetadata and the page share one lookup per request.
 *
 * With no session the app layout is already sending the browser to /auth/session-ended, so the
 * name is simply left out.
 */
export const projectNameOrNotFound = cache(async (projectId: string): Promise<string | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const name = await findProjectName(userId, projectId);
  if (name === null) notFound();
  return name;
});
