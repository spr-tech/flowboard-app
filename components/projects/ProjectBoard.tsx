"use client";
import { useState } from "react";
import TaskModal from "../modals/TaskModal";
import { ArrowLeft } from "lucide-react";
import DeleteModal from "../modals/DeleteModal";
import type { Task } from "@/types/task";
import Link from "next/link";
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DraggableTask from "../board/DraggableTask";
import DroppableColumn from "../board/DroppableColumn";
import { moveTask } from "@/app/actions/task";

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

type ProjectBoardProps = {
  project: Project;
};

export default function ProjectBoard({ project }: ProjectBoardProps) {
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [deleteTaskConfirmation, setDeleteTaskConfirmation] = useState<
    string | null
  >(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentProject, setCurrentProject] = useState(project);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const findColumn = (taskId: string) => {
    return currentProject.columns.find((column) =>
      column.tasks.some((task) => taskId === task.id)
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const sourceColumn = findColumn(active.id as string);

    const draggedTask = sourceColumn?.tasks.find(
      (task) => task.id === active.id
    );

    if (!draggedTask) return;

    const destinationColumn = currentProject.columns.find(
      (column) => column.id === over.id
    );

    if (!destinationColumn) return;
    if (sourceColumn?.id === destinationColumn?.id) return;

    const columnsCopy = [...currentProject.columns];

    const sourceColumnCopy = columnsCopy.find(
      (column) => column.id === sourceColumn?.id
    );

    const destinationColumnCopy = columnsCopy.find(
      (column) => column.id === destinationColumn?.id
    );

    const newTaskList = sourceColumnCopy?.tasks.filter(
      (task) => task.id !== active.id
    );

    if (sourceColumnCopy) {
      sourceColumnCopy.tasks = newTaskList ?? [];
    }

    const updatedTask = { ...draggedTask, columnId: destinationColumn!.id };
    destinationColumnCopy?.tasks.push(updatedTask);
    console.log(columnsCopy);

    setCurrentProject({ ...currentProject, columns: columnsCopy });

    await moveTask(draggedTask.id as string, destinationColumn.id as string);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between w-full pb-4 mb-6 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            {currentProject?.name} Board
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag tasks between columns to update their status
          </p>
        </div>

        <Link
          href="/projects"
          className="fixed inline-flex items-center justify-center p-2 m-4 mr-4 transition-colors cursor-pointer bg-slate-600 bottom-4 right-5 md:bottom-auto md:top-18 md:right-5 group rounded-xl hover:bg-gray-50"
        >
          <ArrowLeft size={24} className="text-white hover:text-slate-600 " />
          <span className="absolute bottom-full mb-1 md:bottom-auto md:top-full left-1/2 -translate-x-1/2 bg-slate-600 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 shadow-md">
            Back to project
          </span>
        </Link>
      </div>

      {/* Project Columns */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid items-start grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {currentProject.columns.map((column) => (
            <DroppableColumn key={column.id} id={column.id}>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#111827] font-semibold">
                    {column.name}
                  </h2>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                    {column.tasks.length}
                  </span>
                </div>

                <SortableContext
                  items={column.tasks.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mb-4 space-y-37.5 min-h-90">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task) => (
                        <DraggableTask
                          key={task.id}
                          task={task}
                          onEdit={() => setSelectedTask(task)}
                          onDelete={() => setDeleteTaskConfirmation(task.id)}
                        />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-[#E5E7EB]">
                        <p className="text-sm text-[#9CA3AF]">No tasks yet</p>
                      </div>
                    )}
                  </div>
                </SortableContext>

                <button
                  onClick={() => setSelectedColumnId(column.id)}
                  className="w-full py-2 rounded-lg border border-dashed border-[#D1D5DB] text-[#7C3AED] hover:bg-[#F5F3FF] transition"
                >
                  + Add task
                </button>
              </div>
            </DroppableColumn>
          ))}
        </div>
      </DndContext>

      {/* Modals outside DndContext */}
      {selectedColumnId && (
        <TaskModal
          columnId={selectedColumnId}
          onClose={() => setSelectedColumnId(null)}
        />
      )}

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {deleteTaskConfirmation && (
        <DeleteModal
          taskId={deleteTaskConfirmation}
          onClose={() => setDeleteTaskConfirmation(null)}
        />
      )}
    </div>
  );
}
