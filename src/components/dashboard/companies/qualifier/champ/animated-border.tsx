"use client";

export function AnimatedBorder({
  active,
  color,
  children,
}: {
  active: boolean;
  color: string;
  children: React.ReactNode;
}) {
  if (!active) {
    return (
      <div className="rounded-2xl border border-slate-200/80 transition-shadow hover:shadow-lg hover:shadow-slate-200/50">
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl p-[2px] animate-[rotateBorder_3s_linear_infinite]"
      style={{
        background: `conic-gradient(from var(--angle, 0deg), transparent 0%, ${color} 10%, transparent 20%, transparent 80%, ${color} 90%, transparent 100%)`,
      }}
    >
      <div className="rounded-[14px] bg-white h-full">{children}</div>
    </div>
  );
}
