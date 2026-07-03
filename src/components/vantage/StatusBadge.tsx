type Status =
  | "queued"
  | "running"
  | "filtering"
  | "reporting"
  | "done"
  | "error"
  | string;

const styles: Record<string, string> = {
  queued: "tag-neutral",
  running: "tag-info animate-pulse",
  filtering: "tag-info animate-pulse",
  reporting: "tag-info animate-pulse",
  correlate: "tag-closed animate-pulse",
  done: "tag-open",
  error: "tag-pill bg-destructive/20 text-destructive border border-destructive/50",
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = styles[status] ?? styles.queued;
  return (
    <span className={`tag-pill ${cls} uppercase tracking-wider`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}
