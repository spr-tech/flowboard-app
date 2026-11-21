import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { isAppError } from "@/utilities/helpers/applyApiError";

type ProjectLoadProblemProps = {
  /** The query's error: an AppError from the base query. */
  error: unknown;
  onRetry: () => void;
};

/** A project that couldn't load: not found (or not mine; both are 404), or anything else, with a retry. */
export function ProjectLoadProblem({ error, onRetry }: ProjectLoadProblemProps) {
  const isNotFound = isAppError(error) && error.status === 404;
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {isNotFound ? "We couldn't find that project" : "We couldn't load this project"}
      </h1>
      <p className="text-fg-secondary">
        {isNotFound
          ? "It may have been deleted, or you're no longer a member."
          : "Check your connection and try again."}
      </p>
      {isNotFound ? (
        <ButtonLink href="/projects" text="Go to your projects" />
      ) : (
        <Button text="Try again" variant="secondary" onClick={onRetry} />
      )}
    </section>
  );
}
