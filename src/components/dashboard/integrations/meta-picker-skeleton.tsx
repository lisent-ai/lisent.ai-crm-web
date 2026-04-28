// Generic shimmer skeleton for the page + form pickers. Renders a few
// placeholder rows with the same height as the real picker rows so the
// modal doesn't jump when data arrives. Pure CSS animation — no JS,
// no GSAP, no Framer Motion.

type SkeletonRowsProps = {
  count?: number;
  variant?: "page" | "form";
};

export function MetaPickerSkeleton({
  count = 3,
  variant = "page",
}: Readonly<SkeletonRowsProps>) {
  return (
    <ul aria-busy="true" className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <li
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2.5"
          key={i}
        >
          {variant === "page" && <Shimmer className="h-10 w-10 rounded-full" />}
          <div className="flex flex-1 flex-col gap-1.5">
            <Shimmer className="h-3.5 w-1/2 rounded" />
            <Shimmer className="h-3 w-1/3 rounded" />
          </div>
          {variant === "form" && (
            <Shimmer className="h-5 w-16 rounded-full" />
          )}
        </li>
      ))}
    </ul>
  );
}

function Shimmer({ className }: Readonly<{ className: string }>) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--surface-muted)] ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
    </div>
  );
}
