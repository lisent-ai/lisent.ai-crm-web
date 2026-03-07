export function DashboardHero() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-200/68">
        Protected workspace
      </p>
      <h1 className="mt-4 text-4xl font-medium tracking-tight text-white md:text-5xl">
        Dashboard shell is protected.
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-violet-100/68 md:text-base">
        This route already sits behind SuperTokens session protection. The next
        layer is tenant resolution: attach user, company, and role context here
        and make this page the base for the CRM workspace.
      </p>
    </section>
  );
}
