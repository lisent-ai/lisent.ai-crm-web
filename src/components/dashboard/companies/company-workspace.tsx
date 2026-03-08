"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CRMClientError,
  createCompany,
  deleteCompany as deleteCompanyRequest,
  listAllCustomers,
  listCompanies,
  type Company,
} from "@/lib/crm/client";

import { CompanyCreateModal } from "./company-create-modal";
import { CompanyDeleteModal } from "./company-delete-modal";
import { CompanyDirectoryPanel } from "./company-directory-panel";
import { CompanySelectedPanel } from "./company-selected-panel";
import { CompanyWorkspaceHeader } from "./company-workspace-header";

export function CompanyWorkspace() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [nextCompanies, allCustomers] = await Promise.all([
        listCompanies(),
        listAllCustomers(),
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
          : "Failed to load CRM workspace.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return companies;
    }

    return companies.filter((company) =>
      [company.name, company.country, company.industry, company.id]
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

  async function addCompany() {
    const name = companyNameInput.trim();
    const country = countryInput.trim();
    const industry = industryInput.trim();

    if (!name) {
      return;
    }

    try {
      setErrorMessage(null);
      const createdCompany = await createCompany({ name, country, industry });
      setCompanies((current) => [createdCompany, ...current]);
      setCustomerCounts((current) => ({ ...current, [createdCompany.id]: 0 }));
      setSelectedCompanyId(createdCompany.id);
      setCompanyNameInput("");
      setCountryInput("");
      setIndustryInput("");
      setSearchQuery("");
      setShowCreatePanel(false);
    } catch (error) {
      const message =
        error instanceof CRMClientError ? error.message : "Failed to create company.";
      setErrorMessage(message);
    }
  }

  async function deleteCompany(companyId: string) {
    try {
      setErrorMessage(null);
      await deleteCompanyRequest(companyId);

      const nextCompanies = companies.filter((company) => company.id !== companyId);
      setCompanies(nextCompanies);
      setCustomerCounts((current) => {
        const next = { ...current };
        delete next[companyId];
        return next;
      });
      setSelectedCompanyId(nextCompanies[0]?.id ?? "");
      setSearchQuery("");
      setShowDeletePanel(false);
    } catch (error) {
      const message =
        error instanceof CRMClientError ? error.message : "Failed to delete company.";
      setErrorMessage(message);
    }
  }

  const selectedCustomerCount = selectedCompany
    ? customerCounts[selectedCompany.id] ?? 0
    : 0;

  return (
    <div className="grid gap-6">
      <CompanyWorkspaceHeader
        companyCount={companies.length}
        onToggleCreatePanel={() => setShowCreatePanel((current) => !current)}
        showCreatePanel={showCreatePanel}
      />

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <CompanyDirectoryPanel
            activeCompanyId={selectedCompany?.id}
            companies={filteredCompanies}
            getCustomerCount={(companyId) => customerCounts[companyId] ?? 0}
            onSearchQueryChange={setSearchQuery}
            onSelectCompany={setSelectedCompanyId}
            searchQuery={searchQuery}
          />
        </div>

        <CompanySelectedPanel
          company={selectedCompany}
          customerCount={selectedCustomerCount}
          onDelete={() => setShowDeletePanel(true)}
        />
      </section>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading companies...
        </div>
      )}

      {showDeletePanel && selectedCompany && (
        <CompanyDeleteModal
          companyName={selectedCompany.name}
          customerCount={selectedCustomerCount}
          onClose={() => setShowDeletePanel(false)}
          onConfirmDelete={() => void deleteCompany(selectedCompany.id)}
        />
      )}

      {showCreatePanel && (
        <CompanyCreateModal
          companyName={companyNameInput}
          country={countryInput}
          industry={industryInput}
          onClose={() => setShowCreatePanel(false)}
          onCompanyNameChange={setCompanyNameInput}
          onCountryChange={setCountryInput}
          onCreate={() => void addCompany()}
          onIndustryChange={setIndustryInput}
        />
      )}
    </div>
  );
}
