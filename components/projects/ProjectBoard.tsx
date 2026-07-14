"use client";
import { useState } from "react";
import TaskModal from "../modals/TaskModal";
import { Delete, Edit, ArrowLeft } from "lucide-react";
import DeleteModal from "../modals/DeleteModal";
import type { Task } from "@/types/task";
import Link from "next/link";
import { Priority } from "@/lib/generated/prisma";

type Project = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  status: string;
  columns: Column[];
};

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: Priority;
    dueDate: Date | null;
  }[];
};

type ProjectBoardProps = {
  project: Project;
};
export default function ProjectBoard({ project }: ProjectBoardProps) {
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [deleteTaskConfirmation, setDeleteTaskConfirmation] = useState<
    string | null
  >(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <div>
      {/* Header */}

      <div className="flex justify-between items-center w-full border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-gray-900 font-bold text-lg tracking-tight">
            {project?.name} Board
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag tasks between columns to update their status
          </p>
        </div>

        {/* Right Side: Back Button Component Wrapper */}
        <Link
          href="/projects"
          className="relative group cursor-pointer inline-flex items-center justify-center p-2 mr-4 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600 " />

          {/* Tooltip positioned perfectly AT THE TOP */}
          <span className="absolute bottom-8  left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 shadow-md">
            Back to project
          </span>
        </Link>
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
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-[#111827]">
                        {task.title.toUpperCase()}
                      </p>
                      <div className="flex gap-2">
                        <Edit
                          size={20}
                          className="text-slate-600 hover:text-slate-400"
                          onClick={() => setSelectedTask(task as Task)}
                        />
                        <Delete
                          size={20}
                          className="text-red-600 hover:text-red-300"
                          onClick={() => setDeleteTaskConfirmation(task.id)}
                        />
                      </div>
                    </div>

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
          </div>
        ))}
        {selectedColumnId && (
          <TaskModal
            columnId={selectedColumnId}
            onClose={() => setSelectedColumnId(null)}
          />
        )}

        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}

        {deleteTaskConfirmation && (
          <DeleteModal
            taskId={deleteTaskConfirmation}
            onClose={() => setDeleteTaskConfirmation(null)}
          />
        )}
      </div>
    </div>
  );
}
