"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CompanyMembershipClientError,
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";
import {
  CRMClientError,
  createDeal,
  deleteDeal as deleteDealRequest,
  listCompanies,
  listCustomers,
  listDeals,
  listLeads,
  type Company,
  type Customer,
  type Deal,
  type DealStage,
  type Lead,
  updateDeal,
} from "@/lib/crm/client";

import { DealDeleteModal } from "./deal-delete-modal";
import { DealDetailPanel } from "./deal-detail-panel";
import { DealFilters } from "./deal-filters";
import { DealFormModal } from "./deal-form-modal";
import { DealHeader } from "./deal-header";
import { DealList } from "./deal-list";
import {
  buildDealForm,
  dealStages,
  emptyDealForm,
  supportedDealCurrencies,
  type DealFormState,
} from "./deal-types";
import { parseDealAmount } from "./deal-utils";

export function DealDirectory() {
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [pendingDeleteDeal, setPendingDeleteDeal] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState<DealFormState>(emptyDealForm);

  useEffect(() => {
    setActiveCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyList() {
      setCompaniesLoading(true);
      setErrorMessage(null);
      try {
        const nextCompanies = await listCompanies();
        if (!cancelled) {
          setCompanies(nextCompanies);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError
              ? error.message
              : "Failed to load companies.",
          );
        }
      } finally {
        if (!cancelled) {
          setCompaniesLoading(false);
        }
      }
    }

    void loadCompanyList();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (companies.length === 0) {
      return;
    }

    setActiveCompanyId((current) => {
      if (current && companies.some((company) => company.id === current)) {
        return current;
      }
      return companies[0].id;
    });
  }, [companies]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

  useEffect(() => {
    if (!selectedCompany?.id) {
      setCustomers([]);
      setLeads([]);
      setMembers([]);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [nextCustomers, nextLeads, nextMembers] = await Promise.all([
          listCustomers(companyId).catch(() => []),
          listLeads(companyId).catch(() => []),
          listCompanyMembers(companyId).catch((error) => {
            if (error instanceof CompanyMembershipClientError) {
              return [];
            }
            throw error;
          }),
        ]);

        if (!cancelled) {
          setCustomers(nextCustomers);
          setLeads(nextLeads);
          setMembers(nextMembers);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setLeads([]);
          setMembers([]);
        }
      }
    }

    void loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id]);

  useEffect(() => {
    if (!selectedCompany?.id) {
      setDeals([]);
      setDealsLoading(false);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadDealList() {
      setDealsLoading(true);
      setErrorMessage(null);
      try {
        const nextDeals = await listDeals(companyId, {
          stage: stageFilter === "all" ? "" : stageFilter,
          assigneeUserId:
            assigneeFilter === "all" || assigneeFilter === "unassigned"
              ? ""
              : assigneeFilter,
          q: searchQuery,
        });

        const filteredDeals =
          assigneeFilter === "unassigned"
            ? nextDeals.filter((deal) => !deal.assigneeUserId)
            : nextDeals;

        if (!cancelled) {
          setDeals(filteredDeals);
          setSelectedDealId((current) => {
            if (current && filteredDeals.some((deal) => deal.id === current)) {
              return current;
            }
            return filteredDeals[0]?.id ?? null;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError ? error.message : "Failed to load deals.",
          );
        }
      } finally {
        if (!cancelled) {
          setDealsLoading(false);
        }
      }
    }

    void loadDealList();
    return () => {
      cancelled = true;
    };
  }, [assigneeFilter, searchQuery, selectedCompany?.id, stageFilter]);

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) ?? deals[0] ?? null,
    [deals, selectedDealId],
  );

  const companyName = useMemo(() => {
    if (searchCompanyName?.trim()) {
      return searchCompanyName;
    }
    return selectedCompany?.name ?? "Selected company";
  }, [searchCompanyName, selectedCompany?.name]);

  const customerLabelById = useMemo(
    () =>
      new Map(customers.map((customer) => [customer.id, customer.name || customer.email])),
    [customers],
  );

  const leadLabelById = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead.name || lead.email || lead.id])),
    [leads],
  );

  const pipelineCounts = useMemo(
    () =>
      dealStages.map((stage) => ({
        stage: stage.value,
        count: deals.filter((deal) => deal.stage === stage.value).length,
      })) as Array<{ stage: DealStage; count: number }>,
    [deals],
  );

  function resetDealForm() {
    setDealForm({
      ...emptyDealForm,
      currency: selectedCompany?.extraData.default_currency?.trim() || "EUR",
    });
    setEditingDealId(null);
  }

  function openCreateModal() {
    resetDealForm();
    setShowFormModal(true);
  }

  function closeFormModal() {
    resetDealForm();
    setShowFormModal(false);
  }

  function openEditModal(deal: Deal) {
    setDealForm(buildDealForm(deal));
    setEditingDealId(deal.id);
    setShowFormModal(true);
  }

  async function reloadDeals(companyId: string) {
    const nextDeals = await listDeals(companyId, {
      stage: stageFilter === "all" ? "" : stageFilter,
      assigneeUserId:
        assigneeFilter === "all" || assigneeFilter === "unassigned"
          ? ""
          : assigneeFilter,
      q: searchQuery,
    });

    const filteredDeals =
      assigneeFilter === "unassigned"
        ? nextDeals.filter((deal) => !deal.assigneeUserId)
        : nextDeals;

    setDeals(filteredDeals);
    return filteredDeals;
  }

  async function saveDeal() {
    if (!selectedCompany) {
      return;
    }

    const name = dealForm.name.trim();
    if (!name) {
      setErrorMessage("Deal name is required.");
      return;
    }
    if (!supportedDealCurrencies.includes(dealForm.currency as (typeof supportedDealCurrencies)[number])) {
      setErrorMessage("Please choose a supported currency.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = {
        companyId: selectedCompany.id,
        customerId: dealForm.customerId.trim(),
        sourceLeadId: dealForm.sourceLeadId.trim(),
        name,
        stage: dealForm.stage,
        amount: parseDealAmount(dealForm.amount),
        currency: dealForm.currency.trim() || "EUR",
        closeDate: dealForm.closeDate,
        terminationDate: dealForm.terminationDate,
        wonReason: dealForm.wonReason,
        lossReason: dealForm.lossReason,
        assigneeUserId: dealForm.assigneeUserId,
        assigneeUserName: dealForm.assigneeUserName,
        extraData: {},
      };

      const savedDeal = editingDealId
        ? await updateDeal(editingDealId, payload)
        : await createDeal(payload);

      const nextDeals = await reloadDeals(selectedCompany.id);
      setSelectedDealId(savedDeal.id || (nextDeals[0]?.id ?? null));
      setSuccessMessage(
        editingDealId ? "Deal updated successfully." : "Deal created successfully.",
      );
      closeFormModal();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : "Failed to save deal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteDeal() {
    if (!pendingDeleteDeal || !selectedCompany) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteDealRequest(pendingDeleteDeal.id);
      const nextDeals = await reloadDeals(selectedCompany.id);
      setSelectedDealId((current) =>
        current === pendingDeleteDeal.id ? nextDeals[0]?.id ?? null : current,
      );
      setPendingDeleteDeal(null);
      setSuccessMessage("Deal deleted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : "Failed to delete deal.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <DealHeader
        company={selectedCompany}
        companyName={companyName}
        dealCount={deals.length}
        onCreate={openCreateModal}
        pipelineCounts={pipelineCounts}
        saving={saving}
      />

      {errorMessage ? (
        <div className="rounded-[1.3rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <DealFilters
        assigneeFilter={assigneeFilter}
        members={members}
        onAssigneeFilterChange={setAssigneeFilter}
        onSearchQueryChange={setSearchQuery}
        onStageFilterChange={setStageFilter}
        searchQuery={searchQuery}
        stageFilter={stageFilter}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <DealList
          companiesLoading={companiesLoading}
          customerLabelById={customerLabelById}
          deals={deals}
          dealsLoading={dealsLoading}
          onSelectDeal={setSelectedDealId}
          selectedDealId={selectedDealId}
        />

        <DealDetailPanel
          companyLabel={companyName}
          customerLabel={
            selectedDeal ? customerLabelById.get(selectedDeal.customerId) ?? "—" : "—"
          }
          deal={selectedDeal}
          onDelete={setPendingDeleteDeal}
          onEdit={openEditModal}
          saving={saving}
          sourceLeadLabel={
            selectedDeal ? leadLabelById.get(selectedDeal.sourceLeadId) ?? "—" : "—"
          }
        />
      </div>

      {showFormModal ? (
        <DealFormModal
          customers={customers}
          editing={Boolean(editingDealId)}
          form={dealForm}
          leads={leads}
          members={members}
          onClose={closeFormModal}
          onFormChange={(updater) => setDealForm((current) => updater(current))}
          onSave={saveDeal}
          saving={saving}
        />
      ) : null}

      {pendingDeleteDeal ? (
        <DealDeleteModal
          deal={pendingDeleteDeal}
          onClose={() => setPendingDeleteDeal(null)}
          onConfirm={confirmDeleteDeal}
          saving={saving}
        />
      ) : null}
    </div>
  );
}
