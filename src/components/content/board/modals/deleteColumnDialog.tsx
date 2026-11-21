"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button/button";
import { Dialog } from "@/components/ui/dialog/dialog";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { useDeleteColumnMutation } from "@/services/columnsService";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { dialogClosed, selectOpenDialog } from "@/stores/uiSlice";
import { isAppError } from "@/utilities/helpers/applyApiError";

type DeleteColumnDialogProps = {
  project: Pick<ProjectDetail, "id" | "columns" | "tasks">;
  /**
   * The board offers both choices; project settings only offers moving the tasks
   * (docs/designs/project-settings.md: deleting the tasks too is only on the board).
   */
  allowDeletingTasks?: boolean;
};

const plural = (count: number) => `${count} task${count === 1 ? "" : "s"}`;

/** Opened through uiSlice's dialog slot ({ kind: "deleteColumn", columnId }). */
export function DeleteColumnDialog({ project, allowDeletingTasks = true }: DeleteColumnDialogProps) {
  const dispatch = useAppDispatch();
  const openDialog = useAppSelector(selectOpenDialog);
  const columnId = openDialog?.kind === "deleteColumn" ? openDialog.columnId : null;
  const column = project.columns.find((candidate) => candidate.id === columnId);
  const close = () => dispatch(dialogClosed());

  return (
    <Dialog isOpen={!!column} onClose={close} title={column ? `Delete “${column.name}”?` : "Delete column"}>
      {column && (
        <DeleteColumnForm
          key={column.id}
          projectId={project.id}
          column={column}
          taskCount={project.tasks.filter((task) => task.columnId === column.id).length}
          otherColumns={project.columns.filter((other) => other.id !== column.id)}
          allowDeletingTasks={allowDeletingTasks}
          onDone={close}
        />
      )}
    </Dialog>
  );
}

type DeleteColumnFormProps = {
  projectId: string;
  column: { id: string; name: string };
  taskCount: number;
  otherColumns: { id: string; name: string }[];
  allowDeletingTasks: boolean;
  onDone: () => void;
};

function DeleteColumnForm({
  projectId,
  column,
  taskCount,
  otherColumns,
  allowDeletingTasks,
  onDone,
}: DeleteColumnFormProps) {
  const [deleteColumn, { isLoading }] = useDeleteColumnMutation();
  const [choice, setChoice] = useState<"move" | "wipe">("move");
  const [moveTo, setMoveTo] = useState(otherColumns[0]?.id ?? "");
  const [typed, setTyped] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const ids = { select: useId(), confirm: useId(), group: useId() };

  const isWipe = taskCount > 0 && choice === "wipe";
  const label =
    taskCount === 0 ? "Delete column" : isWipe ? `Delete column and ${plural(taskCount)}` : "Move tasks and delete";
  const canConfirm = isWipe ? typed.trim() === column.name : true;

  const confirm = async () => {
    try {
      // An empty column moves nothing, so "move" is right for it too.
      const body = isWipe ? { confirmName: typed.trim() } : { moveTasksTo: moveTo };
      await deleteColumn({ projectId, columnId: column.id, ...body }).unwrap();
      onDone();
      toast({ type: "success", message: `${column.name} deleted` });
    } catch (error) {
      if (isAppError(error) && error.fields?.confirmName) setNameError(error.fields.confirmName);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {taskCount === 0 ? (
        <p className="text-fg-secondary">This column is empty, so nothing else is affected.</p>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-fg-secondary">This column has {plural(taskCount)}.</legend>

          <label className="flex cursor-pointer gap-3 rounded-card border border-line-subtle p-3.5 has-checked:border-fg-primary">
            <input type="radio" name={ids.group} checked={choice === "move"} onChange={() => setChoice("move")} />
            <span className="flex flex-1 flex-col gap-2">
              <span className="font-semibold">Move them, then delete the column</span>
              <span className="flex flex-col gap-1 text-sm">
                <span id={ids.select}>Move {plural(taskCount)} to</span>
                <select
                  aria-labelledby={ids.select}
                  value={moveTo}
                  onChange={(event) => setMoveTo(event.target.value)}
                  disabled={choice !== "move"}
                  className="h-10 rounded-input border-[1.5px] border-line-strong bg-surface-card px-2"
                >
                  {otherColumns.map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.name}
                    </option>
                  ))}
                </select>
              </span>
            </span>
          </label>

          {allowDeletingTasks ? (
            <label className="flex cursor-pointer gap-3 rounded-card border border-line-subtle p-3.5 has-checked:border-danger">
              <input type="radio" name={ids.group} checked={choice === "wipe"} onChange={() => setChoice("wipe")} />
              <span className="flex flex-1 flex-col gap-2">
                <span className="font-semibold text-danger">Delete the column and its {plural(taskCount)}</span>
                {choice === "wipe" && (
                  <span className="flex flex-col gap-1 text-sm">
                    <label htmlFor={ids.confirm}>
                      Type <strong>{column.name}</strong> to confirm. This can&apos;t be undone.
                    </label>
                    <input
                      id={ids.confirm}
                      value={typed}
                      autoFocus
                      autoComplete="off"
                      onChange={(event) => {
                        setTyped(event.target.value);
                        setNameError(null);
                      }}
                      aria-invalid={nameError ? true : undefined}
                      className="h-10 rounded-input border-[1.5px] border-line-strong bg-surface-card px-2"
                    />
                    {nameError && (
                      <span role="alert" className="text-danger">
                        {nameError}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </label>
          ) : (
            <p className="text-sm text-fg-muted">To delete the tasks too, use the column&apos;s menu on the board.</p>
          )}
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button text="Cancel" variant="outline" onClick={onDone} />
        <Button text={label} variant="danger" onClick={confirm} disabled={!canConfirm} isLoading={isLoading} />
      </div>
    </div>
  );
}
