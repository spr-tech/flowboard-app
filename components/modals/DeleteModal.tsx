"use client";

import { deleteProject } from "@/app/actions/projects";
import { deleteTask } from "@/app/actions/task";
import { useState } from "react";
import { toast } from "sonner";

type DeleteModalProps = {
  projectId?: string | null;
  taskId?: string | null;
  onClose: () => void;
};

export default function DeleteModal({
  projectId,
  taskId,
  onClose,
}: DeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isDeletingProject = !!projectId;
  const deleteType = isDeletingProject ? "Project" : "Task ";

  const handleDelete = async () => {
    if (!taskId && !projectId) return;

    setIsLoading(true);

    try {
      if (projectId) {
        const result = await deleteProject(projectId);
        if (result.success) {
          toast.success("Project deleted successfully");
          onClose();
        } else {
          toast.error(result.error || "Failed to delete project");
        }
      } else if (taskId) {
        const result = await deleteTask(taskId);
        if (result.success) {
          toast.success("Task deleted successfully");
          onClose();
        } else {
          toast.error(result.error || "Failed to delete task");
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-xl w-full max-w-sm mx-4">
        <h1 className="text-xl font-semibold text-slate-700">
          Delete {deleteType}
        </h1>
        <p className="mt-2 text-slate-600">
          Are you sure you want to delete this {deleteType}?
        </p>
        <div className="flex justify-end gap-3 mt-5">
          <button
            className="hover:underline hover:cursor-pointer text-slate-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:cursor-pointer hover:bg-red-400 p-2 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
