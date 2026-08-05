import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export type InviteMembersFormValues = z.infer<typeof inviteMemberSchema>;
