export function SessionPanelSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-40 animate-pulse rounded-[2rem] border border-white/10 bg-white/6 backdrop-blur-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-[1.6rem] border border-white/10 bg-white/6 backdrop-blur-xl" />
        <div className="h-72 animate-pulse rounded-[1.6rem] border border-white/10 bg-white/6 backdrop-blur-xl" />
      </div>
    </div>
  );
}
