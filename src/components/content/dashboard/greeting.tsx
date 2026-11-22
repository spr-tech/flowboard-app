import { Highlight } from "@/components/ui/typography/highlight";
import type { DashboardSummary } from "@/models/responses/dashboardResponses";

/** "Morning", "Afternoon" or "Evening" by the viewer's own clock. */
export function partOfDay(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/** "Morning, Alex." with the name highlighted, and "You have N overdue and N due this week." */
export function Greeting({ summary, hour }: { summary: DashboardSummary; hour: number }) {
  return (
    <header>
      <h1 className="text-display-section leading-none font-extrabold tracking-tighter">
        {partOfDay(hour)}
        {summary.firstName ? (
          <>
            , <Highlight>{summary.firstName}</Highlight>.
          </>
        ) : (
          "."
        )}
      </h1>
      <p className="mt-3 text-fg-secondary">
        You have <strong className="text-fg-primary">{summary.overdue} overdue</strong> and{" "}
        <strong className="text-fg-primary">{summary.dueThisWeek} due this week</strong>.
      </p>
    </header>
  );
}
