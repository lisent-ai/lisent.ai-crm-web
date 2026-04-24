import Link from "next/link";

export function AuthBrandPanel() {
  return (
    <section className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(164,84,255,0.45),_rgba(32,10,76,0.18)_28%,_rgba(6,8,20,1)_72%),linear-gradient(180deg,_#12051f_0%,_#080b16_100%)] p-5 text-violet-50 sm:min-h-[320px] sm:p-8 md:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(191,148,255,0.18)_1px,transparent_1px)] [background-position:0_0] [background-size:14px_14px] opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,155,255,0.18),_transparent_45%)]" />

      <div className="relative">
        <Link
          className="inline-flex items-center gap-3 text-xs font-medium uppercase tracking-[0.42em] text-violet-100/90"
          href="/"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-violet-200/25 bg-white/5 text-sm tracking-normal shadow-[0_0_24px_rgba(181,111,255,0.25)]">
            L
          </span>
          Lisent.ai
        </Link>
      </div>

      <div className="relative flex flex-1 items-center justify-center py-6 sm:py-12">
        <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[520px]">
          <div className="absolute inset-[12%] rounded-full border border-violet-200/35 blur-[0.3px]" />
          <div className="absolute inset-[10%] rotate-[14deg] rounded-[42%] border border-fuchsia-200/30" />
          <div className="absolute inset-[8%] -rotate-[12deg] rounded-[46%] border border-violet-100/25" />
          <div className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,_rgba(176,110,255,0.2)_0%,_rgba(176,110,255,0.08)_38%,_transparent_70%)] blur-2xl" />
          <div className="absolute inset-[22%] rounded-full border border-violet-100/20" />
          <div className="absolute inset-[27%] rounded-full border border-violet-100/12" />
          <div className="absolute inset-[32%] rounded-full border border-violet-100/10" />
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center sm:px-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-violet-200/70 sm:text-sm sm:tracking-[0.4em]">
                Lisent CRM
              </p>
              <h1 className="mt-4 text-2xl font-medium leading-tight tracking-tight text-white sm:mt-6 sm:text-3xl md:text-5xl">
                Understanding intent, not just words.
              </h1>
              <p className="mx-auto mt-4 max-w-[28ch] text-sm leading-6 text-violet-100/70 sm:mt-5 sm:max-w-xl sm:leading-7 md:text-base">
                Authentication lives here. Tenant context and CRM orchestration
                follow behind a trusted backend boundary.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden gap-4 md:grid md:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.28em] text-violet-200/70">
            Auth
          </p>
          <p className="mt-2 text-sm leading-6 text-violet-50/80">
            SuperTokens sessions through server-side auth endpoints.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.28em] text-violet-200/70">
            Tenant
          </p>
          <p className="mt-2 text-sm leading-6 text-violet-50/80">
            User, company, and role context stays out of the browser.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.28em] text-violet-200/70">
            Imports
          </p>
          <p className="mt-2 text-sm leading-6 text-violet-50/80">
            Groq-assisted onboarding and deterministic import application.
          </p>
        </article>
      </div>
    </section>
  );
}
