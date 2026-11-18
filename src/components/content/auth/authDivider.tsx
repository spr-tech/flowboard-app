/** "or use your email" rule between the GitHub button and the form. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-7 flex items-center gap-3.5 text-sm text-fg-muted">
      <span className="h-px flex-1 bg-line-divider" />
      {label}
      <span className="h-px flex-1 bg-line-divider" />
    </div>
  );
}
