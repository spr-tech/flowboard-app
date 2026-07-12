"use client";

import { useState } from "react";
import { createTask } from "@/app/actions/projects";
import { toast } from "sonner";

type CreateTaskModalProps = {
  columnId: string;
  // projectId: string;
  onClose: () => void;
};

export default function CreateTaskModal({
  columnId,
  onClose,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "Low" | "Medium" | "High" | undefined
  >("Medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await createTask({
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        columnId,
        // projectId,
      });

      if (result.success) {
        onClose();
        toast.success("Task created successfully");
      } else {
        setError(result?.error ?? "Unable to create task");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm p-4">
      <form
        className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-4"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-semibold text-gray-900">Create Task</h2>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Design homepage hero"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            placeholder="What needs to be done?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-20 px-3 py-2 border border-gray-300 rounded-lg resize-none outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="priority"
            className="text-sm font-medium text-gray-700"
          >
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as "Low" | "Medium" | "High")
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        {/* Due Date */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="due_date"
            className="text-sm font-medium text-gray-700"
          >
            Due date
          </label>
          <input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
