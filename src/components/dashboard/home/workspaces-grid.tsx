"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import type { Company } from "@/lib/crm/client";
import { storeCompany } from "@/lib/workspace/workspace-context";

type WorkspacesGridProps = {
  companies: Company[];
  customerCountByCompany: Map<string, number>;
  activeCompanyId: string;
  loading?: boolean;
};

export function WorkspacesGrid({
  companies,
  customerCountByCompany,
  activeCompanyId,
  loading,
}: Readonly<WorkspacesGridProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleOpen(id: string, name: string) {
    storeCompany(id, name);
    const params = new URLSearchParams(searchParams.toString());
    params.set("company", id);
    if (name) params.set("companyName", name);
    router.push(`/dashboard/workspace?${params.toString()}`);
    // Keep pathname for linting; suppress unused warning
    void pathname;
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            className="h-[150px] animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]"
            key={i}
          />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] p-8 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          No workspaces yet
        </p>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Create your first workspace to start managing leads, deals and customers.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => {
        const active = company.id === activeCompanyId;
        const count = customerCountByCompany.get(company.id) ?? 0;
        const meta = [company.industry, company.country].filter(Boolean).join(" · ");

        return (
          <div
            className={`relative flex flex-col gap-3 rounded-[var(--radius-card-lg)] border p-5 shadow-[var(--shadow-card)] transition ${
              active
                ? "border-[var(--accent)] bg-[var(--surface)]"
                : "border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
            }`}
            key={company.id}
          >
            {active && (
              <span className="absolute right-4 top-4 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                Active
              </span>
            )}
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] text-sm font-semibold text-white"
              >
                {buildInitials(company.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                  {company.name || "Untitled"}
                </p>
                {meta ? (
                  <p className="truncate text-xs text-[var(--text-tertiary)]">{meta}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-baseline gap-2 text-sm">
              <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {count}
              </span>
              <span className="text-[var(--text-tertiary)]">
                customer{count === 1 ? "" : "s"}
              </span>
            </div>

            <button
              className="mt-auto inline-flex items-center justify-between rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--text-primary)]"
              onClick={() => handleOpen(company.id, company.name)}
              type="button"
            >
              {active ? "Open dashboard" : "Open workspace"}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function buildInitials(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
