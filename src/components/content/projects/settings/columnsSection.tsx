"use client";

import { AddColumnForm } from "@/components/content/board/forms/addColumnForm";
import { DeleteColumnDialog } from "@/components/content/board/modals/deleteColumnDialog";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { columnRights, projectCan } from "@/utilities/helpers/projectPermissions";
import { ColumnRow } from "./columnRow";

/**
 * Settings › Columns (docs/designs/project-settings.md): the team columns in the team order, with
 * what I may do to each, then Add column (by the same rules as the board: the owner, and managers
 * with manageColumns). Members see a read-only list.
 */
export function ColumnsSection({ project, meId }: { project: ProjectDetail; meId: string | null }) {
  const mayAdd = projectCan(project, meId, "column.add").allowed;

  return (
    <div className="flex flex-col gap-5">
      {!mayAdd && (
        <p className="text-sm text-fg-secondary">
          Team columns are managed by the owner and managers. You can still reorder columns for your own view on the
          board.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {project.columns.map((column, index) => (
          <ColumnRow
            key={`${column.id}|${column.name}`}
            projectId={project.id}
            column={column}
            number={index + 1}
            before={project.columns[index - 1]}
            after={project.columns[index + 1]}
            rights={columnRights(project, meId, column)}
            isOnlyColumn={project.columns.length === 1}
          />
        ))}
      </ol>

      {mayAdd && <AddColumnForm projectId={project.id} layout="row" />}
      <DeleteColumnDialog project={project} allowDeletingTasks={false} />
    </div>
  );
}
