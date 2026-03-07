import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(163,78,255,0.55),_rgba(54,21,111,0.26)_22%,_rgba(7,10,21,1)_66%),linear-gradient(180deg,_#0a0617_0%,_#050814_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(171,133,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />
      <div className="absolute left-1/2 top-16 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(188,119,255,0.26),_rgba(109,46,203,0.12)_42%,_transparent_72%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-8 md:px-10">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.42em] text-violet-100/85">
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-violet-200/25 bg-white/5 text-sm tracking-normal shadow-[0_0_24px_rgba(181,111,255,0.25)]">
              L
            </span>
            Lisent.ai
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-violet-100/80 transition hover:border-violet-300/35 hover:text-white"
              href="/auth/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="rounded-full bg-[linear-gradient(90deg,_rgba(124,58,237,0.96),_rgba(205,98,255,0.92))] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(168,85,247,0.34)] transition hover:brightness-110"
              href="/auth/sign-up"
            >
              Start now
            </Link>
          </div>
        </header>

        <section className="grid min-h-[72vh] gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="relative">
            <div className="absolute left-[8%] top-[4%] size-24 rounded-full border border-violet-200/20 blur-[1px]" />
            <div className="absolute left-[18%] top-[18%] size-[28rem] rounded-full border border-violet-200/20 opacity-70" />
            <div className="absolute left-[9%] top-[10%] size-[33rem] rotate-[15deg] rounded-[46%] border border-fuchsia-200/25 opacity-80" />
            <div className="absolute left-[12%] top-[14%] size-[31rem] -rotate-[14deg] rounded-[44%] border border-violet-100/20 opacity-70" />
            <div className="absolute left-[17%] top-[20%] size-[25rem] rounded-full bg-[radial-gradient(circle,_rgba(210,159,255,0.2),_rgba(210,159,255,0.08)_36%,_transparent_72%)] blur-2xl" />

            <div className="relative z-10 max-w-3xl pt-14 lg:pt-20">
              <p className="text-sm font-semibold uppercase tracking-[0.38em] text-violet-200/72">
                Voice-native CRM platform
              </p>
              <h1 className="mt-6 text-5xl font-medium leading-[1.02] tracking-tight text-white md:text-7xl">
                Understanding intent, not just words.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-violet-100/72 md:text-lg">
                Lisent CRM combines authentication, tenant-aware workflows,
                import-profile onboarding, and a protected application shell for
                company operators. The web app owns user-facing flows. The Go
                CRM service stays behind a trusted backend boundary.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  className="rounded-full bg-[linear-gradient(90deg,_rgba(124,58,237,0.96),_rgba(205,98,255,0.92))] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(168,85,247,0.34)] transition hover:brightness-110"
                  href="/auth/sign-up"
                >
                  Create workspace access
                </Link>
                <Link
                  className="rounded-full border border-white/14 px-6 py-3 text-sm font-semibold text-violet-100/85 transition hover:border-violet-300/35 hover:text-white"
                  href="/dashboard"
                >
                  Open protected shell
                </Link>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-violet-200/65">
                Current stack
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-violet-50/80">
                <li>Next.js 16 App Router</li>
                <li>TypeScript + Tailwind CSS 4</li>
                <li>SuperTokens Email/Password + Session</li>
                <li>Go CRM service behind a BFF boundary</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-violet-200/65">
                What this app owns
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <h2 className="text-sm font-semibold text-white">Auth</h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">
                    Sign-in, sign-up, and session validation via
                    <code className="mx-1 rounded bg-white/8 px-1.5 py-0.5 text-[11px]">
                      /api/auth
                    </code>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <h2 className="text-sm font-semibold text-white">
                    Tenant context
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">
                    The next layer will resolve
                    <code className="mx-1 rounded bg-white/8 px-1.5 py-0.5 text-[11px]">
                      user_id
                    </code>
                    ,
                    <code className="mx-1 rounded bg-white/8 px-1.5 py-0.5 text-[11px]">
                      company_id
                    </code>
                    , and role per session.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <h2 className="text-sm font-semibold text-white">BFF CRM</h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">
                    Browser calls should stop at this app. Trusted server routes
                    will talk to the internal CRM service.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
