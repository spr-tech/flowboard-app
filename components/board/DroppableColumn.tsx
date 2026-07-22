"use client";

import { useDroppable } from "@dnd-kit/core";

type DroppableColumnProps = {
  id: string;
  children: React.ReactNode;
};

export default function DroppableColumn({
  id,
  children,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  
  return (
    <div
      ref={setNodeRef}
      className={isOver ? "bg-purple-50 rounded-xl" : ""}
    >
      {children}
    </div>
  );
}