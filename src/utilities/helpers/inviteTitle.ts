import type { InvitePreview } from "@/models/responses/memberResponses";

/** The invite page's title: "Join <project>" when the link names one, otherwise "Join a project". */
export function inviteTitle(preview: InvitePreview | null): string {
  if (preview?.state === "valid") return `Join ${preview.project.name}`;
  if (preview?.state === "expired") return `Join ${preview.projectName}`;
  return "Join a project";
}
