"use server";
// import { resend } from "@/lib/resend";
import { sendInviteEmail } from "@/lib/send-email";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/get-current-user";

type InviteMembersProps = {
  projectId: string;
  email: string;
};

// export async function sendTestEmail() {
//   const data = await resend.emails.send({
//     from: "FlowBoard <onboarding@resend.dev>",
//     to: "opeyemimuizz2@gmail.com",
//     subject: "FlowBoard Test Email",
//     html: `
//       <h1>It works! 🎉</h1>
//       <p>This email was sent using Resend.</p>
//     `,
//   });
//   console.log(data);
//   return data;
// }

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
  const invitedUser = await prisma.user.findUnique({
    where: {
      email: trimmedEmail,
    },
  });

  if (!invitedUser) {
    return {
      success: false,
      error: "No user found with that email",
    };
  }

  const existingMember = await prisma.member.findUnique({
    where: {
      userId_projectId: {
        userId: invitedUser.id,
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

  if (invitedUser.id === currentUserLoggedIn.id) {
    return {
      success: false,
      error: "You are already the owner of this project.",
    };
  }

  try {
    await sendInviteEmail({
      to: invitedUser.email,
      projectName: project.name,
      invitedBy: currentUserLoggedIn.name ?? "FlowBoard User",
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);

    return {
      success: false,
      error: "Failed to send invitation email.",
    };
  }

  const newMember = await prisma.member.create({
    data: {
      userId: invitedUser.id,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}/settings`);

  return {
    success: true,
    newMember,
  };
}
