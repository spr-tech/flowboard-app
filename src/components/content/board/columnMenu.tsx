"use client";

import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownmenu/dropdownMenu";

type ColumnMenuProps = {
  columnName: string;
  isDone: boolean;
  isLastColumn: boolean;
  onRename: () => void;
  onSetDone: () => void;
  onDelete: () => void;
};

/** Owner only: Rename, Set as done column, Delete column (or why it can't be deleted). */
export function ColumnMenu({ columnName, isDone, isLastColumn, onRename, onSetDone, onDelete }: ColumnMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          startIcon={<MoreHorizontal aria-hidden />}
          aria-label={`Column options for ${columnName}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-card p-2">
        <DropdownMenuItem className="px-2 py-2" onSelect={onRename}>
          <Pencil aria-hidden />
          Rename
        </DropdownMenuItem>
        {!isDone && (
          <DropdownMenuItem className="px-2 py-2" onSelect={onSetDone}>
            <CheckCircle2 aria-hidden />
            Set as done column
          </DropdownMenuItem>
        )}
        {isLastColumn ? (
          <DropdownMenuLabel className="px-2 py-2 text-sm font-normal text-fg-muted">
            A board needs at least one column.
          </DropdownMenuLabel>
        ) : (
          <DropdownMenuItem className="px-2 py-2 text-danger focus:text-danger" onSelect={onDelete}>
            <Trash2 aria-hidden />
            Delete column
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
