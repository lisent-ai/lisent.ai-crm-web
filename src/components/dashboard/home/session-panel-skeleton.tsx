export function SessionPanelSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--surface-inset)]" />
        <div className="h-9 w-44 animate-pulse rounded-full bg-[var(--surface-inset)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-72 animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]" />
        <div className="h-72 animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]" />
      </div>
    </div>
  );
}
