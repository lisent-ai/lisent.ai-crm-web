"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";

import {
  CreateWorkspaceModal,
  OPEN_CREATE_WORKSPACE_EVENT,
} from "@/components/dashboard/shared/create-workspace-modal";
import { CRMClientError, type Company, listCompanies } from "@/lib/crm/client";
import { clearStoredCompany, storeCompany } from "@/lib/workspace/workspace-context";

type WorkspaceSwitcherProps = {
  companyId: string;
  companyName: string;
  demoMode: boolean;
  /** Visual variant: "pill" for topbar, "block" for mobile drawer header. */
  variant?: "pill" | "block";
};

type LoadState = "idle" | "loading" | "error";

const CACHE_TTL_MS = 60_000;

export function WorkspaceSwitcher({
  companyId,
  companyName,
  demoMode,
  variant = "pill",
}: Readonly<WorkspaceSwitcherProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFetchAt = useRef<number>(0);

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCompanies = useCallback(
    async (force = false) => {
      if (demoMode) return;
      const age = Date.now() - lastFetchAt.current;
      if (!force && age < CACHE_TTL_MS && companies.length > 0) return;
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const next = await listCompanies();
        setCompanies(next);
        lastFetchAt.current = Date.now();
        setLoadState("idle");

        // Stale detection: if the currently-selected company is no
        // longer in the list, clear state.
        if (companyId && !next.find((c) => c.id === companyId)) {
          clearStoredCompany();
        }
      } catch (error) {
        const message =
          error instanceof CRMClientError
            ? error.message
            : "Unable to load workspaces.";
        setErrorMessage(message);
        setLoadState("error");
      }
    },
    [companies.length, companyId, demoMode],
  );

  useEffect(() => {
    // Data fetch on mount; setState inside the async callback is the
    // intended pattern here. React's set-state-in-effect rule targets
    // synchronous cascades, which this is not.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (demoMode) return;
    function onOpenRequest() {
      setCreateOpen(true);
    }
    window.addEventListener(OPEN_CREATE_WORKSPACE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(OPEN_CREATE_WORKSPACE_EVENT, onOpenRequest);
    };
  }, [demoMode]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) void loadCompanies();
      return next;
    });
  }

  function handleSelect(id: string, name: string) {
    setOpen(false);
    if (id === companyId) return;

    storeCompany(id, name);
    const params = new URLSearchParams(searchParams.toString());
    params.set("company", id);
    if (name) {
      params.set("companyName", name);
    } else {
      params.delete("companyName");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const activeLabel = companyName || companyId || "Select workspace";
  const activeInitials = companyName ? buildInitials(companyName) : "—";

  const triggerClass =
    variant === "block"
      ? "flex w-full items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm transition hover:border-[var(--border-strong)]"
      : "inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] max-w-[240px] lg:max-w-[280px]";

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Switch workspace"
        className={triggerClass}
        onClick={handleOpen}
        type="button"
      >
        {variant === "block" ? (
          <>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]"
            >
              {activeInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                Workspace
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">
                {activeLabel}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{activeLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          className={`${
            variant === "block"
              ? "left-0 right-0"
              : "left-0 w-[300px] max-w-[calc(100vw-2rem)]"
          } absolute top-full z-40 mt-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2 shadow-[var(--shadow-float)]`}
          role="menu"
        >
          <div className="px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Workspaces
            </p>
          </div>

          {loadState === "loading" && companies.length === 0 && (
            <div className="px-3 py-3 text-sm text-[var(--text-tertiary)]">
              Loading workspaces…
            </div>
          )}

          {loadState === "error" && companies.length === 0 && (
            <div className="px-3 py-3">
              <p className="text-sm text-[var(--signal-red)]">
                {errorMessage ?? "Unable to load workspaces."}
              </p>
              <button
                className="mt-2 text-xs font-medium text-[var(--accent-strong)] hover:underline"
                onClick={() => void loadCompanies(true)}
                type="button"
              >
                Retry
              </button>
            </div>
          )}

          {companies.length > 0 && (
            <div className="scrollbar-thin max-h-[320px] overflow-y-auto">
              {companies.map((company) => {
                const active = company.id === companyId;
                return (
                  <button
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-[var(--surface-inset)] font-semibold text-[var(--text-primary)]"
                        : "font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    }`}
                    key={company.id}
                    onClick={() => handleSelect(company.id, company.name)}
                    role="menuitem"
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent-strong)]"
                    >
                      {buildInitials(company.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{company.name || "Untitled"}</p>
                      {company.industry || company.country ? (
                        <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                          {[company.industry, company.country].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    {active && (
                      <Check className="h-4 w-4 shrink-0 text-[var(--accent-strong)]" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={() => {
              setOpen(false);
              setCreateOpen(true);
            }}
            role="menuitem"
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create new workspace
          </button>
        </div>
      )}

      {createOpen && !demoMode && (
        <CreateWorkspaceModal
          onClose={() => setCreateOpen(false)}
          onCreated={(company) => {
            setCreateOpen(false);
            storeCompany(company.id, company.name);
            lastFetchAt.current = 0;
            void loadCompanies(true);
            const params = new URLSearchParams(searchParams.toString());
            params.set("company", company.id);
            if (company.name) params.set("companyName", company.name);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
        />
      )}
    </div>
  );
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
