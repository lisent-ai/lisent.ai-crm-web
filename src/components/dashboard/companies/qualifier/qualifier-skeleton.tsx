export function TableSkeleton() {
  return (
    <div className="stagger-children space-y-2">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-6 py-4">
        <div className="h-4 w-10 skeleton-shimmer rounded" />
        <div className="h-4 w-20 skeleton-shimmer rounded" />
        <div className="h-4 w-12 skeleton-shimmer rounded" />
        <div className="h-4 w-16 skeleton-shimmer rounded" />
        <div className="ml-auto h-4 w-20 skeleton-shimmer rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl px-6 py-4">
          <div className="h-4 w-4 skeleton-shimmer rounded" />
          <div className="h-4 w-28 skeleton-shimmer rounded" />
          <div className="h-4 w-24 skeleton-shimmer rounded" />
          <div className="h-6 w-10 skeleton-shimmer rounded-full" />
          <div className="h-4 w-16 skeleton-shimmer rounded" />
          <div className="ml-auto h-4 w-20 skeleton-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

export function SessionsSkeleton() {
  return (
    <div className="stagger-children grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 skeleton-shimmer rounded" />
            <div className="h-3 w-3 skeleton-shimmer rounded-full" />
          </div>
          <div className="h-3 w-20 skeleton-shimmer rounded" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 skeleton-shimmer rounded-full" />
            <div className="h-3 w-16 skeleton-shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="stagger-children space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-16 skeleton-shimmer rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-48 skeleton-shimmer rounded" />
          <div className="h-4 w-32 skeleton-shimmer rounded" />
        </div>
        <div className="h-8 w-20 skeleton-shimmer rounded-full" />
      </div>
      {/* AI Summary */}
      <div className="rounded-xl bg-violet-50/30 p-4 space-y-2">
        <div className="h-4 w-24 skeleton-shimmer rounded" />
        <div className="h-3 w-full skeleton-shimmer rounded" />
        <div className="h-3 w-3/4 skeleton-shimmer rounded" />
      </div>
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-slate-50 px-3 py-3 space-y-1">
            <div className="h-2.5 w-14 skeleton-shimmer rounded" />
            <div className="h-4 w-20 skeleton-shimmer rounded" />
          </div>
        ))}
      </div>
      {/* Score + BANT */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-5 space-y-3">
          <div className="h-4 w-28 skeleton-shimmer rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-20 skeleton-shimmer rounded" />
              <div className="h-3 flex-1 skeleton-shimmer rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-5 space-y-3">
          <div className="h-4 w-24 skeleton-shimmer rounded" />
          <div className="h-44 w-44 mx-auto skeleton-shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}
