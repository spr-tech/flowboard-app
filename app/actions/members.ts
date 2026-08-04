"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/get-current-user";

type InviteMembersProps = {
  projectId: string;
  email: string;
};

export async function InviteMembers({ projectId, email }: InviteMembersProps) {
  const trimmedEmail = email.trim().toLowerCase();
  const currentUserLoggedIn = await getCurrentUser();

  if (!currentUserLoggedIn) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  // to check if logged in user is the owner of the project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: currentUserLoggedIn.id,
    },
  });

  if (!project) {
    return {
      success: false,
      error: "You are not authorized to invite members to this project",
    };
  }

  //to find invited user
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

  const existingMember = await prisma.member.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      },
    },
  });

  if (existingMember) {
    return {
      success: false,
      error: "User is already a member of this project",
    };
  }

  if (user.id === currentUserLoggedIn.id) {
    return {
      success: false,
      error: "You are already the owner of this project.",
    };
  }

  const newMember = await prisma.member.create({
    data: {
      userId: user.id,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}/settings`);

  return {
    success: true,
    newMember,
  };
}
