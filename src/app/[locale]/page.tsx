import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("marketing");

  const codeChunk = (chunks: React.ReactNode) => (
    <code className="mx-1 rounded bg-white/8 px-1.5 py-0.5 text-[11px]">
      {chunks}
    </code>
  );

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(163,78,255,0.55),_rgba(54,21,111,0.26)_22%,_rgba(7,10,21,1)_66%),linear-gradient(180deg,_#0a0617_0%,_#050814_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(171,133,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />
      <div className="absolute left-1/2 top-12 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(188,119,255,0.26),_rgba(109,46,203,0.12)_42%,_transparent_72%)] blur-3xl sm:top-16 sm:h-[34rem] sm:w-[34rem]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 sm:py-8 md:gap-10 md:px-10">
        <header className="flex items-center justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-violet-100/85 sm:text-xs sm:tracking-[0.42em]">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-violet-200/25 bg-white/5 text-sm tracking-normal shadow-[0_0_24px_rgba(181,111,255,0.25)] sm:size-10">
              L
            </span>
            <span className="truncate">{t("brand")}</span>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-violet-100/80 transition hover:border-violet-300/35 hover:text-white"
              href="/auth/sign-in"
            >
              {t("navSignIn")}
            </Link>
            <Link
              className="rounded-full bg-[linear-gradient(90deg,_rgba(124,58,237,0.96),_rgba(205,98,255,0.92))] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(168,85,247,0.34)] transition hover:brightness-110"
              href="/auth/sign-up"
            >
              {t("navStartNow")}
            </Link>
          </div>
        </header>

        <section className="grid gap-8 overflow-hidden lg:min-h-[72vh] lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
          <div className="relative overflow-hidden rounded-[2rem] px-1 py-6 sm:px-2 sm:py-8 lg:rounded-none lg:px-0 lg:py-0">
            <div className="absolute left-[4%] top-[5%] size-16 rounded-full border border-violet-200/20 blur-[1px] sm:size-24" />
            <div className="absolute left-[8%] top-[20%] size-[16rem] rounded-full border border-violet-200/20 opacity-70 sm:left-[18%] sm:size-[28rem]" />
            <div className="absolute left-[2%] top-[12%] size-[19rem] rotate-[15deg] rounded-[46%] border border-fuchsia-200/25 opacity-80 sm:left-[9%] sm:size-[33rem]" />
            <div className="absolute left-[4%] top-[15%] size-[18rem] -rotate-[14deg] rounded-[44%] border border-violet-100/20 opacity-70 sm:left-[12%] sm:size-[31rem]" />
            <div className="absolute left-[10%] top-[24%] size-[14rem] rounded-full bg-[radial-gradient(circle,_rgba(210,159,255,0.2),_rgba(210,159,255,0.08)_36%,_transparent_72%)] blur-2xl sm:left-[17%] sm:size-[25rem]" />

            <div className="relative z-10 max-w-3xl pt-8 sm:pt-14 lg:pt-20">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200/72 sm:text-sm sm:tracking-[0.38em]">
                {t("heroEyebrow")}
              </p>
              <h1 className="mt-4 max-w-[12ch] text-4xl font-medium leading-[0.98] tracking-tight text-white sm:mt-6 sm:text-5xl md:text-7xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-violet-100/72 md:max-w-2xl md:text-lg">
                {t("heroLead")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,_rgba(124,58,237,0.96),_rgba(205,98,255,0.92))] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(168,85,247,0.34)] transition hover:brightness-110"
                  href="/auth/sign-up"
                >
                  {t("ctaCreateWorkspace")}
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 px-6 py-3 text-sm font-semibold text-violet-100/85 transition hover:border-violet-300/35 hover:text-white"
                  href="/dashboard"
                >
                  {t("ctaOpenShell")}
                </Link>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.32em] text-violet-200/65">
                {t("currentStack")}
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-violet-50/80">
                <li>{t("stackItems.next")}</li>
                <li>{t("stackItems.ts")}</li>
                <li>{t("stackItems.auth")}</li>
                <li>{t("stackItems.crm")}</li>
              </ul>
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.32em] text-violet-200/65">
                {t("whatThisAppOwns")}
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <h2 className="text-sm font-semibold text-white">{t("authTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">
                    {t.rich("authBody", { code: codeChunk })}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <h2 className="text-sm font-semibold text-white">
                    {t("tenantTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">
                    {t.rich("tenantBody", { code: codeChunk })}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <h2 className="text-sm font-semibold text-white">{t("bffTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-violet-100/68">
                    {t("bffBody")}
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
