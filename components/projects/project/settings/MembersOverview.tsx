"use client";

import { Mail, Plus, Crown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  InviteMembersFormValues,
  inviteMemberSchema,
} from "@/lib/validations/members";
import { InviteMembers } from "@/app/actions/members";
import { useProject } from "@/context/ProjectProvider";
import { toast } from "sonner";

export default function MembersOverview() {
  const { currentProject } = useProject();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMembersFormValues>({
    resolver: zodResolver(inviteMemberSchema),
  });

  console.log(currentProject?.members);

  const onSubmit = async (data: InviteMembersFormValues) => {
    if (!currentProject) return;

    const result = await InviteMembers({
      projectId: currentProject.id,
      email: data.email,
    });

    if (result.success) {
      toast.success("Member invited successfully");
      reset();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl">
      {/* Header */}

      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-[#111827]">Members</h2>

        <p className="mt-1 text-sm text-[#6B7280]">
          Invite teammates to collaborate on this project.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Invite */}

        <form className="space-y-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-medium text-gray-700" htmlFor="mail">
            Invite by email
          </label>

          <div className="space-y-2">
            <div className="">
              <div
                className="flex items-center gap-2 w-full h-11 pl-3 pr-4 border border-gray-300 rounded-xl outline-none
                focus-within:border-[#7C3AED]
                focus-within:ring-4
                focus-within:ring-[#7C3AED]/10 placeholder:text-slate-400"
              >
                <Mail size={18} className="text-gray-500 " />

                <input
                  type="email"
                  id="mail"
                  placeholder="teammate@example.com"
                  {...register("email")}
                  disabled={isSubmitting}
                  className="flex-1 border-none outline-0 placeholder:text-slate-300 text-slate-700"
                />
              </div>

              {errors.email && (
                <p className="text-xs text-[#EF4444] mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-4 text-white transition bg-purple-600 h-11 rounded-xl hover:bg-purple-700 active:[0.98] disabled:bg-gray-400
disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <Plus size={18} />
              {isSubmitting ? "Inviting..." : "Invite"}
            </button>
          </div>
        </form>

        {/* Divider */}

        <div className="pt-5 border-t border-gray-200">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Current Members
          </h3>

          {/* Owner */}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 font-semibold text-white rounded-full bg-[#7C3AED]">
                M
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">
                  {currentProject?.owner?.name}
                </p>

                <p className="text-xs text-gray-500">
                  {currentProject?.owner?.email}
                </p>
              </div>
            </div>

            <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-[#7C3AED]">
              <Crown size={14} />
              Owner
            </span>
          </div>

          {/* other members */}
          <div>
            {currentProject?.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between mt-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 font-semibold text-white rounded-full bg-[#7C3AED]">
                    {member.user.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.name}
                    </p>

                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>

                <span className="px-3 py-1 text-xs text-gray-600 capitalize bg-gray-100 rounded-full">
                  {member.role}
                </span>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {currentProject?.members.length === 0 && (
            <div className="p-5 mt-5 text-center border border-gray-300 border-dashed rounded-xl">
              <p className="text-sm text-gray-500">
                No additional members yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
