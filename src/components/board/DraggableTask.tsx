import type { Task } from "@/types/task";
import { Edit, Delete } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type DraggableTaskProps = {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
};

export default function DraggableTask({
  task,
  onEdit,
  onDelete,
}: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityStyles = {
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-100",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-rose-50 text-rose-700 border-rose-100",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="  bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-2 mb-3 hover:border-[#7C3AED] transition-colors cursor-pointer "
    >
      <div className="flex justify-between">
        <p className="text-sm font-medium text-[#111827]">
          {task.title.toUpperCase()}
        </p>
        <div className="flex gap-1">
          <Edit
            size={20}
            className="transition-colors rounded-md cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Edit icon clicked");
              onEdit();
            }}
          />
          <Delete
            size={20}
            className="text-red-500 transition-colors rounded-md cursor-pointer hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-[#6B7280] mt-1 ">{task.description}</p>
      )}

      <div className="flex justify-between mt-3 ">
        {task.priority && (
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border tracking-wider uppercase ${priorityStyles[task.priority]}`}
          >
            {task.priority.toLowerCase()}
          </span>
        )}

        {task.dueDate && (
          <span className="text-sm text-slate-600">
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
