"use client";

import { useState } from "react";
import { createTask } from "@/app/actions/task";
import { toast } from "sonner";
import { editTask } from "@/app/actions/task";
import type { Task } from "@/types/task";
import { Priority } from "@/lib/generated/prisma";

type TaskModalProps = {
  columnId?: string;
  task?: Task;
  onClose: () => void;
  onTaskCreated?: (newTask: Task) => void;
};

export default function TaskModal({
  columnId,
  task,
  onClose,
  onTaskCreated,
}: TaskModalProps) {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(
    (task?.priority as Priority) ?? "MEDIUM"
  );
  const existingDueDate = task?.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";
  const [dueDate, setDueDate] = useState(existingDueDate);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createNewTask = async () => {
    try {
      const result = await createTask({
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        columnId: columnId!,
        // projectId,
      });

      if (result.success && result.newTask) {
        const cleanTask: Task = {
          id: result.newTask.id,
          title: result.newTask.title,
          description: result.newTask.description,
          priority: result.newTask.priority as Priority,
          dueDate: result.newTask.dueDate,
          columnId: result.newTask.columnId,
        };

        onTaskCreated?.(cleanTask);
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

  const editExistingTask = async (task: Task) => {
    try {
      const result = await editTask({
        id: task.id,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
      });

      if (result.success) {
        onClose();
        toast.success("Task updated successfully");
      } else {
        setError(result?.error ?? "Unable to update task");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (isEditing) {
      await editExistingTask(task);
    } else {
      await createNewTask();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
      <form
        className="w-full max-w-md p-6 space-y-4 bg-white shadow-xl rounded-xl"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? "Edit Task" : "Create Task"}
        </h2>

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
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 transition border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading
              ? isEditing
                ? "Updating"
                : "creating"
              : isEditing
                ? "Update"
                : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
