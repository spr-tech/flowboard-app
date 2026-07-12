"use client";
import { useState } from "react";
import CreateTaskModal from "../modals/CreateTaskModal";
import { toast } from "sonner";

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
  }[];
};

type Project = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  status: string;
  columns: Column[];
};

type ProjectBoardProps = {
  project: Project;
};
export default function ProjectBoard({ project }: ProjectBoardProps) {
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-800 font-semibold ">{project?.name} Board</p>
        <span className="text-[12px] text-gray-700">
          Drag tasks between columns to update their status
        </span>
      </div>

      {/* Project Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {project?.columns.map((column) => (
          <div
            key={column.id}
            className="bg-white border border-[#E5E7EB] rounded-xl p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#111827] font-semibold">{column.name}</h2>

              <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                {column.tasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-55">
              {column.tasks.length > 0 ? (
                column.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 hover:border-[#7C3AED] transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-medium text-[#111827]">
                      {task.title.toUpperCase()}
                    </p>

                    {task.description && (
                      <p className="text-sm text-[#6B7280] mt-1 ">
                        {task.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-[#E5E7EB]">
                  <p className="text-sm text-[#9CA3AF]">No tasks yet</p>
                </div>
              )}

              <button
                onClick={() => setSelectedColumnId(column.id)}
                className="w-full py-2 rounded-lg border border-dashed border-[#D1D5DB] text-[#7C3AED] hover:bg-[#F5F3FF] transition"
              >
                + Add Task
              </button>
            </div>

            {selectedColumnId && (
              <CreateTaskModal
                columnId={selectedColumnId}
                onClose={() => setSelectedColumnId(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
