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
import type { ColumnRights } from "@/utilities/helpers/projectPermissions";

type ColumnMenuProps = {
  columnName: string;
  addedBy: string;
  /** ISO time the column was added. */
  addedAt: string;
  isDone: boolean;
  isLastColumn: boolean;
  /** What I may do to this column (from can()). */
  rights: ColumnRights;
  onRename: () => void;
  onSetDone: () => void;
  onDelete: () => void;
};

/** "20 Nov 2026" in the viewer's own zone. */
export const addedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Every member sees who added the column. Rename for the owner and managers with manageColumns;
 * Set as done for the owner only; Delete for the owner and managers with deleteColumns (or why the
 * last column can't be deleted).
 */
export function ColumnMenu(props: ColumnMenuProps) {
  const { columnName, addedBy, addedAt, isDone, isLastColumn, rights, onRename, onSetDone, onDelete } = props;
  const canSetDone = rights.setDone && !isDone;
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
        {(rights.rename || canSetDone || rights.delete) && <DropdownMenuSeparator />}
        {rights.rename && (
          <DropdownMenuItem className="px-2 py-2" onSelect={onRename}>
            <Pencil aria-hidden />
            Rename
          </DropdownMenuItem>
        )}
        {canSetDone && (
          <DropdownMenuItem className="px-2 py-2" onSelect={onSetDone}>
            <CheckCircle2 aria-hidden />
            Set as done column
          </DropdownMenuItem>
        )}
        {rights.delete &&
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
