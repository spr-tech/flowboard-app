"use client";

import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownmenu/dropdownMenu";

type ColumnMenuProps = {
  columnName: string;
  addedBy: string;
  /** ISO time the column was added. */
  addedAt: string;
  isDone: boolean;
  isLastColumn: boolean;
  /** The owner, or the member who added this column. */
  canRename: boolean;
  isOwner: boolean;
  onRename: () => void;
  onSetDone: () => void;
  onDelete: () => void;
};

/** "20 Nov 2026" in the viewer's own zone. */
export const addedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Every member sees who added the column. Rename for the owner and for the member who added it;
 * Set as done and Delete for the owner only (or why the last column can't be deleted).
 */
export function ColumnMenu(props: ColumnMenuProps) {
  const { columnName, addedBy, addedAt, isDone, isLastColumn, canRename, isOwner, onRename, onSetDone, onDelete } =
    props;
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
      <DropdownMenuContent align="end" className="w-60 rounded-card p-2">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-fg-muted">
          Added by {addedBy} · {addedOn(addedAt)}
        </DropdownMenuLabel>
        {(canRename || isOwner) && <DropdownMenuSeparator />}
        {canRename && (
          <DropdownMenuItem className="px-2 py-2" onSelect={onRename}>
            <Pencil aria-hidden />
            Rename
          </DropdownMenuItem>
        )}
        {isOwner && !isDone && (
          <DropdownMenuItem className="px-2 py-2" onSelect={onSetDone}>
            <CheckCircle2 aria-hidden />
            Set as done column
          </DropdownMenuItem>
        )}
        {isOwner &&
          (isLastColumn ? (
            <DropdownMenuLabel className="px-2 py-2 text-sm font-normal text-fg-muted">
              A board needs at least one column.
            </DropdownMenuLabel>
          ) : (
            <DropdownMenuItem className="px-2 py-2 text-danger focus:text-danger" onSelect={onDelete}>
              <Trash2 aria-hidden />
              Delete column
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
