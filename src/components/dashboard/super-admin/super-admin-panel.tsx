"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

// Super Admin panel shell. Gated server-side (only super admins reach the
// page). Intentionally a placeholder — admin tools get added into the
// sections below next.
export function SuperAdminPanel() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t("superAdmin.title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("superAdmin.subtitle")}
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-10 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("superAdmin.comingSoon")}
        </p>
      </section>
    </div>
  );
}
