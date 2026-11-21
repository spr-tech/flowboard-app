import type { ReactNode } from "react";

type SettingsSectionProps = {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Title and description on the left, a card on the right; stacked under 960px. */
export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-5 border-t border-line-divider pt-8 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] min-[960px]:gap-10"
    >
      <div>
        <h2 id={id} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-fg-secondary">{description}</p>
      </div>
      <div className="rounded-card-lg border border-line-subtle bg-surface-card p-6">{children}</div>
    </section>
  );
}
