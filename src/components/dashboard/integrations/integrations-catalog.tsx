"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getAccountProfile } from "@/lib/account/client";
import { hasCompanyPermissionInAccess } from "@/lib/auth/access-control";
import type { AccountProfile } from "@/lib/auth/account-profile";
import {
  CRMClientError,
  fetchIntegrationCatalog,
  type IntegrationCatalog,
} from "@/lib/crm/client";

import { CompanyPickerModal } from "./company-picker-modal";
import { IntegrationCard } from "./integration-card";

export function IntegrationsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCompanyId = searchParams.get("company")?.trim() ?? "";
  const selectedCompanyName = searchParams.get("companyName")?.trim() ?? "";

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalog, setCatalog] = useState<IntegrationCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAccountProfile()
      .then((p) => {
        if (!cancelled) setAccount(p);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canManageSelected = useMemo(() => {
    if (!account || !selectedCompanyId) return false;
    return hasCompanyPermissionInAccess(
      account.access,
      selectedCompanyId,
      "integrations.manage",
    );
  }, [account, selectedCompanyId]);

  // Reset derived state on input change, at render time. React bails out of a
  // re-render when the setter receives the identical value, so this is the
  // idiomatic alternative to synchronous setState inside useEffect.
  const [lastInputs, setLastInputs] = useState({
    companyId: selectedCompanyId,
    canManage: canManageSelected,
  });
  if (
    lastInputs.companyId !== selectedCompanyId ||
    lastInputs.canManage !== canManageSelected
  ) {
    setLastInputs({ companyId: selectedCompanyId, canManage: canManageSelected });
    setCatalog(null);
    setErrorMessage(null);
    setLoading(Boolean(selectedCompanyId && canManageSelected));
  }

  useEffect(() => {
    if (!selectedCompanyId || !canManageSelected) return;
    let cancelled = false;
    fetchIntegrationCatalog(selectedCompanyId)
      .then((res) => {
        if (!cancelled) setCatalog(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof CRMClientError
            ? err.message
            : "Could not load integrations",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId, canManageSelected]);

  function handleCompanyPick(c: { companyId: string; companyName: string }) {
    setPickerOpen(false);
    const params = new URLSearchParams();
    params.set("company", c.companyId);
    params.set("companyName", c.companyName);
    router.push(`/dashboard/integrations?${params.toString()}`);
  }

  if (!account) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Loading your profile…
      </section>
    );
  }

  const hasManageableCompanies =
    account.access.isSuperAdmin ||
    account.access.companyMemberships.some((m) =>
      hasCompanyPermissionInAccess(account.access, m.companyId, "integrations.manage"),
    );
  if (!hasManageableCompanies) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Integrations
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You need to be the owner of at least one workspace to manage integrations.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Create one from the workspace switcher in the top bar, then return here.
        </p>
      </section>
    );
  }

  if (!selectedCompanyId) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Integrations
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pick a company to manage its integrations. Each company has its own
          credentials and webhooks.
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-6 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          Pick a company
        </button>
        <CompanyPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleCompanyPick}
          account={account}
        />
      </section>
    );
  }

  if (!canManageSelected) {
    return (
      <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-800">
        <h1 className="text-3xl font-semibold tracking-tight text-rose-900">
          Access denied
        </h1>
        <p className="mt-3 leading-6">
          Integration management is restricted to the company owner. You don&apos;t
          have the owner role on this company.
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-6 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
        >
          Pick another company
        </button>
        <CompanyPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleCompanyPick}
          account={account}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Integrations
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configuring{" "}
            <span className="font-semibold text-slate-900">
              {selectedCompanyName || selectedCompanyId}
            </span>
            . Each tenant / company has its own credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Switch company
        </button>
      </header>

      {loading ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading integrations…
        </div>
      ) : errorMessage ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : catalog ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.available.map((integration) => (
            <IntegrationCard
              key={integration.slug}
              integration={integration}
              companyId={selectedCompanyId}
              companyName={selectedCompanyName}
              onConnected={() => {
                // After Connect, re-fetch so the card flips from
                // "Connect" to "Configure" and sub-components refresh.
                void fetchIntegrationCatalog(selectedCompanyId)
                  .then((res) => setCatalog(res))
                  .catch(() => {});
              }}
            />
          ))}
        </div>
      ) : null}

      <CompanyPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCompanyPick}
        account={account}
      />
    </section>
  );
}
