"use client";

import { useEffect, useId, useRef, useState } from "react";

import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { memberTakeLimitField } from "@/models/validations/projectValidation";
import { useUpdateProjectMutation } from "@/services/projectsService";
import { TAKE_LIMIT_MAX, TAKE_LIMIT_MIN } from "@/utilities/helpers/permissions";
import { projectCan } from "@/utilities/helpers/projectPermissions";

/** A number typed into the field saves after a short pause, so "12" isn't saved as "1" first. */
const SAVE_DELAY_MS = 500;

type TasksSectionProps = { project: Pick<ProjectDetail, "id" | "me" | "memberTakeLimit"> };

/**
 * Settings › Tasks: how many open tasks a member may take from the unassigned pool ("Assign to
 * me"). The owner edits it (1 to 20, saved after a pause, with a toast); everyone else reads it.
 */
export function TasksSection({ project }: TasksSectionProps) {
  const fieldId = useId();
  const mayEdit = projectCan(project, null, "project.editSettings").allowed;
  const [text, setText] = useState(String(project.memberTakeLimit));
  const [error, setError] = useState<string | null>(null);
  const [updateProject] = useUpdateProjectMutation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (!mayEdit) {
    return (
      <p className="text-sm text-fg-secondary">
        Members can take up to {project.memberTakeLimit} open tasks at a time. Only the owner can change this.
      </p>
    );
  }

  const save = async (memberTakeLimit: number) => {
    try {
      await updateProject({ projectId: project.id, memberTakeLimit }).unwrap();
      toast({ type: "success", message: "Task settings saved" });
    } catch {
      // The base query showed why.
    }
  };

  const onChange = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    const parsed = memberTakeLimitField.safeParse(Number(value));
    if (value.trim() === "" || !parsed.success) {
      setError(`Enter a number from ${TAKE_LIMIT_MIN} to ${TAKE_LIMIT_MAX}`);
      return;
    }
    setError(null);
    if (parsed.data === project.memberTakeLimit) return;
    timer.current = setTimeout(() => void save(parsed.data), SAVE_DELAY_MS);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={fieldId}>Members can take up to</label>
        <input
          id={fieldId}
          type="number"
          inputMode="numeric"
          min={TAKE_LIMIT_MIN}
          max={TAKE_LIMIT_MAX}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-9 w-16 rounded-lg border-[1.5px] border-line-strong bg-surface-card px-2 text-center aria-invalid:border-danger"
        />
        <span>open tasks</span>
      </div>
      <p className="text-sm text-fg-muted">
        Only tasks they took with &ldquo;Assign to me&rdquo; count, until they&apos;re done. Tasks you or a manager
        assign don&apos;t.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
