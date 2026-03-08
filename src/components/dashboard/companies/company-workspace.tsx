"use client";

import { useMemo, useState } from "react";

import { type Company, useMockCrmStore } from "@/lib/dashboard/mock-crm-store";

import { CompanyCreateModal } from "./company-create-modal";
import { CompanyDeleteModal } from "./company-delete-modal";
import { CompanyDirectoryPanel } from "./company-directory-panel";
import { CompanySelectedPanel } from "./company-selected-panel";
import { CompanyWorkspaceHeader } from "./company-workspace-header";

export function CompanyWorkspace() {
  const { companies, setCompanies, customersByCompany, setCustomersByCompany } =
    useMockCrmStore();
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    companies[0]?.id ?? "",
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");

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

  function addCompany() {
    const name = companyNameInput.trim();
    const country = countryInput.trim();
    const industry = industryInput.trim();

    if (!name) {
      return;
    }

    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${companies.length + 1}`;
    const nextCompany: Company = {
      id,
      name,
      country: country || "Not set",
      industry: industry || "Not set",
    };

    setCompanies((current) => [nextCompany, ...current]);
    setCustomersByCompany((current) => ({
      ...current,
      [id]: [],
    }));
    setSelectedCompanyId(id);
    setCompanyNameInput("");
    setCountryInput("");
    setIndustryInput("");
    setSearchQuery("");
    setShowCreatePanel(false);
  }

  function deleteCompany(companyId: string) {
    const nextCompanies = companies.filter((company) => company.id !== companyId);

    setCompanies(nextCompanies);
    setCustomersByCompany((current) => {
      const next = { ...current };
      delete next[companyId];
      return next;
    });
    setSelectedCompanyId(nextCompanies[0]?.id ?? "");
    setSearchQuery("");
    setShowDeletePanel(false);
  }

  const selectedCustomerCount = selectedCompany
    ? customersByCompany[selectedCompany.id]?.length ?? 0
    : 0;

  return (
    <div className="grid gap-6">
      <CompanyWorkspaceHeader
        companyCount={companies.length}
        onToggleCreatePanel={() => setShowCreatePanel((current) => !current)}
        showCreatePanel={showCreatePanel}
      />

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <CompanyDirectoryPanel
            activeCompanyId={selectedCompany?.id}
            companies={filteredCompanies}
            getCustomerCount={(companyId) => customersByCompany[companyId]?.length ?? 0}
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

      {showDeletePanel && selectedCompany && (
        <CompanyDeleteModal
          companyName={selectedCompany.name}
          customerCount={selectedCustomerCount}
          onClose={() => setShowDeletePanel(false)}
          onConfirmDelete={() => deleteCompany(selectedCompany.id)}
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
          onCreate={addCompany}
          onIndustryChange={setIndustryInput}
        />
      )}
    </div>
  );
}
