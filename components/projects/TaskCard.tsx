"use client";

import { Delete, Edit } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types/project";

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
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
            onClick={() => onEdit(task)}
          />

          <Delete
            size={20}
            className="text-red-600 hover:text-red-300"
            onClick={() => onDelete(task.id)}
          />
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-[#6B7280] mt-1">{task.description}</p>
      )}
    </div>
  );
}
