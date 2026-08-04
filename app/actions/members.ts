"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { success } from "zod";

type InviteMembersProps = {
  projectId: string;
  email: string;
};

export async function InviteMembers({ projectId, email }: InviteMembersProps) {
  const trimmedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: trimmedEmail,
    },
  });

  if (!user) {
    return {
      success: false,
      error: "No user found with that email",
    };
  }
}
