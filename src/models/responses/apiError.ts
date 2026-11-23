/** Every API error has this shape (see CLAUDE.md). */
export type ApiErrorBody = {
  error: {
    /** Stable, machine-readable, e.g. "EMAIL_TAKEN". Screens branch on this, never on the message. */
    code: string;
    /** Written for a person; screens can show it as is. */
    message: string;
    /** Per-field messages for a 400, keyed by field name (e.g. { email: "Enter a valid email address" }). */
    fields?: Record<string, string>;
  };
};

/**
 * Every failed request, as the browser sees it (made by src/configs/baseQuery.ts from whatever
 * went wrong: our error body, no network, a page that isn't JSON). Screens branch on `code`.
 */
export type AppError = {
  /** The HTTP status, or "NETWORK" when no answer arrived (offline, server unreachable). */
  status: number | "NETWORK";
  code: string;
  /** Written for a person; safe to show as is. */
  message: string;
  /** Per-field messages; when present, the form shows them and no toast is shown. */
  fields?: Record<string, string>;
};
