"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getAccountProfile } from "@/lib/account/client";
import { getCompanyMembershipSummary } from "@/lib/auth/access-control";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { getCompanyRoleLabel } from "@/lib/auth/roles";
import {
  CRMClientError,
  listAllCustomers,
  listCompanies,
  type Company,
} from "@/lib/crm/client";

import { CompanyAccessPanel } from "./company-access-panel";
import { CompanyDirectoryPanel } from "./company-directory-panel";
import { DetailMetric } from "./company-ui";

export function CompanyAccessWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState(searchCompanyId);
  const [searchQuery, setSearchQuery] = useState("");
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [nextCompanies, allCustomers, nextAccount] = await Promise.all([
        listCompanies(),
        listAllCustomers(),
        getAccountProfile(),
      ]);

      const nextCounts: Record<string, number> = {};
      for (const customer of allCustomers) {
        if (!customer.companyId) {
          continue;
        }
        nextCounts[customer.companyId] = (nextCounts[customer.companyId] ?? 0) + 1;
      }

      setCompanies(nextCompanies);
      setCustomerCounts(nextCounts);
      setAccount(nextAccount);
      setSelectedCompanyId((current) => {
        if (current && nextCompanies.some((company) => company.id === current)) {
          return current;
        }
        return nextCompanies[0]?.id ?? "";
      });
    } catch (error) {
      const message =
        error instanceof CRMClientError
          ? error.message
          : "Failed to load the team access workspace.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    setSelectedCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return companies;
    }

    return companies.filter((company) =>
      [
        company.name,
        company.country,
        company.industry,
        company.id,
        company.createdByUserName,
        company.createdByUserId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [companies, searchQuery]);

  const selectedCompany = useMemo(() => {
    return (
      companies.find((company) => company.id === selectedCompanyId) ??
      filteredCompanies[0] ??
      companies[0]
    );
  }, [companies, filteredCompanies, selectedCompanyId]);

  const selectedMembership =
    selectedCompany && account
      ? getCompanyMembershipSummary(account.access, selectedCompany.id)
      : null;

  const getRoleLabel = useCallback(
    (companyId: string) => {
      if (!account) {
        return null;
      }

      const membership = getCompanyMembershipSummary(account.access, companyId);
      if (membership) {
        return getCompanyRoleLabel(membership.role);
      }

      return account.access.isSuperAdmin ? "Super Admin" : null;
    },
    [account],
  );

  useEffect(() => {
    if (!selectedCompany?.id) {
      return;
    }

    const currentCompanyId = searchParams.get("company") ?? "";
    const currentCompanyName = searchParams.get("companyName") ?? "";
    if (
      currentCompanyId === selectedCompany.id &&
      currentCompanyName === selectedCompany.name
    ) {
      return;
    }

    const nextSearch = new URLSearchParams(searchParams.toString());
    nextSearch.set("company", selectedCompany.id);
    nextSearch.set("companyName", selectedCompany.name);
    router.replace(`/dashboard/access?${nextSearch.toString()}`, {
      scroll: false,
    });
  }, [router, searchParams, selectedCompany?.id, selectedCompany?.name]);

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_#eff6ff,_#ffffff_46%,_#f8fafc)] p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
          Team access
        </p>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Role management in a dedicated workspace
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Pick a company from the directory and manage its owner, admin,
              member, and viewer access from one focused page.
            </p>
          </div>
          {selectedCompany ? (
            <Link
              className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href={`/dashboard/companies?company=${selectedCompany.id}&companyName=${encodeURIComponent(selectedCompany.name)}`}
            >
              Open company workspace
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailMetric label="Companies" value={String(companies.length)} />
          <DetailMetric
            label="Selected company"
            value={selectedCompany?.name ?? "None selected"}
          />
          <DetailMetric
            label="Your role"
            value={
              selectedMembership
                ? getCompanyRoleLabel(selectedMembership.role)
                : account?.access.isSuperAdmin
                  ? "Super Admin"
                  : "-"
            }
          />
          <DetailMetric
            label="Customers"
            value={selectedCompany ? String(customerCounts[selectedCompany.id] ?? 0) : "0"}
          />
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <CompanyDirectoryPanel
          activeCompanyId={selectedCompany?.id}
          companies={filteredCompanies}
          getCustomerCount={(companyId) => customerCounts[companyId] ?? 0}
          getRoleLabel={getRoleLabel}
          onSearchQueryChange={setSearchQuery}
          onSelectCompany={setSelectedCompanyId}
          searchQuery={searchQuery}
        />

        <div className="grid gap-4">
          {selectedCompany && account ? (
            <CompanyAccessPanel
              access={account.access}
              companyId={selectedCompany.id}
              companyName={selectedCompany.name}
              onMembershipsChanged={() => void loadWorkspace()}
            />
          ) : (
            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Access
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Select a company
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Choose a company from the directory to inspect memberships and manage
                team roles from this page.
              </p>
            </section>
          )}
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading team access...
        </div>
      ) : null}
    </div>
  );
}
