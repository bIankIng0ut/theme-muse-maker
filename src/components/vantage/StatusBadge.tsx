type Status =
  | "queued"
  | "running"
  | "filtering"
  | "reporting"
  | "done"
  | "error"
  | string;

const styles: Record<string, string> = {
  queued: "bg-muted text-muted-foreground border-border",
  running: "bg-primary/15 text-primary border-primary/40 animate-pulse",
  filtering: "bg-primary/15 text-primary border-primary/40 animate-pulse",
  reporting: "bg-primary/15 text-primary border-primary/40 animate-pulse",
  done: "bg-success/15 text-success border-success/40",
  error: "bg-destructive/15 text-destructive border-destructive/40",
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = styles[status] ?? styles.queued;
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}
