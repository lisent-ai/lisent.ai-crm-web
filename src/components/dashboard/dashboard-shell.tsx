export function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(146,76,255,0.38),_rgba(40,16,94,0.18)_24%,_rgba(7,10,21,1)_68%),linear-gradient(180deg,_#0a0617_0%,_#050814_100%)] px-6 py-8 text-white md:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(171,133,255,0.16)_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
      <div className="relative mx-auto max-w-7xl">{children}</div>
    </main>
  );
}
