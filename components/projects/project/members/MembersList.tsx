"use client";

import Link from "next/link";
import { ArrowLeft, Crown, Search, UserPlus, MoreVertical } from "lucide-react";
import { useProject } from "@/context/ProjectProvider";
import { useState } from "react";

export default function MembersList() {
  const { currentProject } = useProject();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (!currentProject) return null;

  return (
    <div className="max-w-5xl px-8 py-8 mx-auto">
      {/* Header */}

      <div className="mb-8">
        <Link
          href={`/projects/${currentProject.id}/settings`}
          className="inline-flex items-center gap-2 text-sm text-[#7C3AED] hover:underline font-medium hover:-translate-x-1 transition-all duration-200 underline-offset-2"
        >
          <ArrowLeft size={18} />
          Back to Project Settings
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Project Members
        </h1>

        <p className="mt-2 text-gray-500">
          Manage everyone who has access to this project.
        </p>
      </div>

      {/* Toolbar */}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute text-gray-400 -translate-y-1/2 left-4 top-1/2"
          />

          <input
            type="text"
            placeholder="Search members..."
            className="w-full pr-4 text-gray-700 border border-gray-300 h-11 pl-11 rounded-xl bg-gray-50"
          />
        </div>

        <button className="flex items-center gap-2 px-5 text-white transition bg-purple-600 h-11 rounded-xl hover:bg-purple-700">
          <UserPlus size={18} />
          Invite Member
        </button>
      </div>

      {/* Card */}

      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
        {/* Owner */}

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#7C3AED] text-white font-semibold">
              {currentProject.owner?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>

            <div>
              <p className="font-medium text-gray-900">
                {currentProject.owner?.name}
              </p>

              <p className="text-sm text-gray-500">
                {currentProject.owner?.email}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-[#7C3AED]">
            <Crown size={14} />
            Owner
          </span>
        </div>

        {/* Members */}

        {currentProject.members.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No members have been invited yet.</p>
          </div>
        ) : (
          currentProject.members.map((member) => (
            <div
              key={member.id}
              className="relative flex items-center justify-between px-6 py-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#7C3AED] text-white font-semibold">
                  {member.user.name?.charAt(0).toUpperCase() ?? "?"}
                </div>

                <div>
                  <p className="font-medium text-gray-900">
                    {member.user.name}
                  </p>

                  <p className="text-sm text-gray-500">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-xs font-medium text-gray-600 capitalize bg-gray-100 rounded-full">
                  {member.role}
                </span>

                <button
                  onClick={() =>
                    setOpenMenu(openMenu === member.id ? null : member.id)
                  }
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </button>

                {openMenu === member.id && (
                  <div className="absolute w-48 bg-white border border-gray-200 shadow-lg right-6 top-14 rounded-xl">
                    <button className="w-full px-4 py-3 text-sm text-left text-red-600 hover:bg-red-50">
                      Remove Member
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
