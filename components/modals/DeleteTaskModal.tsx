"use client";

import { deleteTask } from "@/app/actions/projects";
import { useState } from "react";
import { toast } from "sonner";

type DeleteTaskModalProps = {
  taskId: string | null;
  onClose: () => void;
};

export default function DeleteTaskModal({
  taskId,
  onClose,
}: DeleteTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!taskId) return;

    setIsLoading(true);
    console.log(isLoading);

    try {
      const result = await deleteTask(taskId);
      if (result.success) {
        onClose();
        toast.success("Task deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete task");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white p-6 rounded-xl w-full max-w-sm mx-4">
        <h1 className="text-xl font-semibold">Delete Task?</h1>
        <p className="mt-2 text-slate-500">
          Are you sure you want to delete this task?
        </p>
        <div className="flex justify-end gap-3 mt-5">
          <button className="hover:underline" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-400 p-2 rounded-xl text-white disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
