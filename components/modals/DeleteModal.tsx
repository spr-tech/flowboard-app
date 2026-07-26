"use client";

import { deleteProject } from "@/app/actions/projects";
import { deleteTask } from "@/app/actions/task";
import { useState } from "react";
import { toast } from "sonner";
import { Task } from "@/types/task";

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
  tasks: Task[];
};

type DeleteModalProps = {
  projectId?: string | null;
  taskId?: string | null;
  onClose: () => void;
  setCurrentProject?: React.Dispatch<React.SetStateAction<Project | null>>;
};

export default function DeleteModal({
  projectId,
  taskId,
  onClose,
  setCurrentProject,
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
          setCurrentProject?.(null);
          toast.success("Project deleted successfully");
          onClose();
        } else {
          toast.error(result.error || "Failed to delete project");
        }
      } else if (taskId) {
        const result = await deleteTask(taskId);
        if (result.success) {
          setCurrentProject?.((prevProject) => {
            if (!prevProject) return null;
            return {
              ...prevProject,
              columns: prevProject.columns.map((column) => ({
                ...column,
                tasks: column.tasks.filter((task) => task.id !== taskId),
              })),
            };
          });

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
      <div className="w-full max-w-sm p-6 mx-4 bg-white rounded-xl">
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
            className="p-2 text-white bg-red-600 hover:cursor-pointer hover:bg-red-400 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
