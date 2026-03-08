type DashboardHeroProps = {
  userId?: string;
  onSignOut?: () => void;
  demoMode?: boolean;
};

export function DashboardHero({
  userId,
  onSignOut,
  demoMode = false,
}: Readonly<DashboardHeroProps>) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#0f766e)] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.16)] md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/78">
        Workspace home
      </p>
      <h1 className="mt-4 text-4xl font-medium tracking-tight text-white md:text-5xl">
        Create a company, open it, and manage customer imports from one place.
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-sky-50/78 md:text-base">
        After sign-in, the user lands here first. This screen now represents
        the missing company layer between authentication and the import flow.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/70">
            {demoMode ? "UI mode" : "Signed in user"}
          </p>
          <p className="mt-2 break-all text-sm text-white/88">
            {demoMode ? "Dashboard auth is bypassed for UI work." : userId ?? "Loading user context..."}
          </p>
        </div>

        {demoMode ? (
          <span className="rounded-full border border-white/10 bg-white/12 px-5 py-3 text-sm font-semibold text-cyan-50/85">
            Mock session active
          </span>
        ) : (
          <button
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(255,255,255,0.16)] transition hover:bg-slate-100"
            onClick={onSignOut}
            type="button"
          >
            Sign out
          </button>
        )}
      </div>
    </section>
  );
}
