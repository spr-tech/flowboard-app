"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useProject } from "@/context/ProjectProvider";
import { useState } from "react";

import DeleteModal from "@/components/modals/DeleteModal";

export default function DangerZone() {
  const { currentProject } = useProject();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  return (
    <div className="border border-red-200 rounded-2xl bg-red-50">
      {/* Header */}

      <div className="flex items-center gap-3 px-6 py-3 border-b border-red-200">
        <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
          <AlertTriangle className="text-red-600" size={20} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>

          <p className="mt-1 text-sm text-red-500">
            Permanent actions for this project.
          </p>
        </div>
      </div>

      {/* Content */}

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-gray-900">Delete Project ?</h3>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Everything associated with this project will be erased and
            irrecoverable
          </p>
        </div>

        <button
          onClick={() => setSelectedProjectId(currentProject?.id ?? null)}
          className="flex items-center justify-center w-full gap-2 font-medium text-white transition bg-red-600 h-11 rounded-xl hover:bg-red-700"
        >
          <Trash2 size={18} />
          Delete Project
        </button>
      </div>

      {selectedProjectId && (
        <DeleteModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </div>
  );
};
