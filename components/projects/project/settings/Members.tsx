"use client";

import { Mail, Plus, Crown } from "lucide-react";

export default function Members() {
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Invite by email
          </label>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail
                size={18}
                className="absolute text-gray-400 -translate-y-1/2 left-4 top-1/2"
              />

              <input
                type="email"
                placeholder="teammate@example.com"
                className="w-full h-11 pl-11 pr-4 border border-gray-300 rounded-xl outline-none
                focus:border-[#7C3AED]
                focus:ring-4
                focus:ring-[#7C3AED]/10"
              />
            </div>

            <button className="flex items-center gap-2 px-4 text-white transition bg-purple-600 h-11 rounded-xl hover:bg-purple-700 active:[0.98]">
              <Plus size={18} />
              Invite
            </button>
          </div>
        </div>

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
                <p className="text-sm font-medium text-gray-900">Muizz Jamiu</p>

                <p className="text-xs text-gray-500">muizz@example.com</p>
              </div>
            </div>

            <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-[#7C3AED]">
              <Crown size={14} />
              Owner
            </span>
          </div>

          {/* Empty state */}

          <div className="p-5 mt-5 text-center border border-gray-300 border-dashed rounded-xl">
            <p className="text-sm text-gray-500">No additional members yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
