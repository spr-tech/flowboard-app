import type { ReactNode } from "react";

/** The sections' fixed copy, shared by the page and its loading skeleton. */
export const SETTINGS_SECTIONS = {
  general: {
    id: "settings-general",
    title: "General",
    description: "The name and colour everyone sees on the board, the projects list and the dashboard.",
  },
  columns: {
    id: "settings-columns",
    title: "Columns",
    description:
      "The board's columns, left to right (the team order). Tasks in the done column count as finished on the dashboard.",
  },
  tasks: {
    id: "settings-tasks",
    title: "Tasks",
    description: "How members pick up work from the unassigned pool.",
  },
  members: {
    id: "settings-members",
    title: "Members",
    description:
      "Everyone on this board, and their roles. Managers get the permissions you choose. Invites are sent by email and the link works for 7 days.",
  },
  danger: { id: "settings-danger", title: "Danger zone" },
} as const;

type SettingsSectionProps = {
  id: string;
  title: string;
  /** Text, or a skeleton while it depends on data that is still loading. */
  description: ReactNode;
  children: ReactNode;
};

/**
 * Title and description on the left, a card on the right; stacked under 960px. The one column
 * is minmax(0, 1fr) and both cells are min-w-0, so nothing inside can make the page wider than
 * the screen (a grid track otherwise grows to fit its widest child).
 */
export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="grid grid-cols-1 gap-5 border-t border-line-divider pt-8 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] min-[960px]:gap-10"
    >
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        <div className="mt-1.5 text-sm text-fg-secondary">{description}</div>
      </div>
      <div className="min-w-0 rounded-card-lg border border-line-subtle bg-surface-card p-4 sm:p-6">{children}</div>
    </section>
  );
}
