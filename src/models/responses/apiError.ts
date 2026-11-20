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
