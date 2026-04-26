"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CompanyMembershipClientError,
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";
import {
  CRMClientError,
  createDealComment,
  createDeal,
  deleteDeal as deleteDealRequest,
  fetchIntegrationCatalog,
  isAIQualifierConnected,
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
import { DealBoard } from "./deal-board";
import { DealDetailPanel } from "./deal-detail-panel";
import { DealFilters } from "./deal-filters";
import { DealFormModal } from "./deal-form-modal";
import { DealHeader } from "./deal-header";
import {
  buildDealForm,
  dealStageOptions,
  emptyDealForm,
  supportedDealCurrencies,
  type DealFormState,
} from "./deal-types";
import { parseDealAmount } from "./deal-utils";

export function DealDirectory() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [openDetailDealId, setOpenDetailDealId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [pendingDeleteDeal, setPendingDeleteDeal] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState<DealFormState>(emptyDealForm);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    setActiveCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyList() {
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
              : t("deals.errors.loadCompanies"),
          );
        }
      }
    }

    void loadCompanyList();
    return () => {
      cancelled = true;
    };
  }, [t]);

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

  const [aiEnabled, setAIEnabled] = useState(false);

  useEffect(() => {
    if (!selectedCompany?.id) {
      setCustomers([]);
      setLeads([]);
      setMembers([]);
      setAIEnabled(false);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [nextCustomers, nextLeads, nextMembers, catalog] = await Promise.all([
          listCustomers(companyId).catch(() => []),
          listLeads(companyId).catch(() => []),
          listCompanyMembers(companyId).catch((error) => {
            if (error instanceof CompanyMembershipClientError) {
              return [];
            }
            throw error;
          }),
          fetchIntegrationCatalog(companyId).catch(() => null),
        ]);

        if (!cancelled) {
          setCustomers(nextCustomers);
          setLeads(nextLeads);
          setMembers(nextMembers);
          setAIEnabled(isAIQualifierConnected(catalog));
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setLeads([]);
          setMembers([]);
          setAIEnabled(false);
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

    async function loadDealList(showLoading: boolean) {
      if (showLoading) {
        setDealsLoading(true);
      }
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
            error instanceof CRMClientError ? error.message : t("deals.errors.loadDeals"),
          );
        }
      } finally {
        if (!cancelled) {
          setDealsLoading(false);
        }
      }
    }

    void loadDealList(true);
    const intervalId = window.setInterval(() => {
      void loadDealList(false);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [assigneeFilter, searchQuery, selectedCompany?.id, stageFilter, t]);

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) ?? deals[0] ?? null,
    [deals, selectedDealId],
  );

  const detailDeal = useMemo(
    () => deals.find((deal) => deal.id === openDetailDealId) ?? null,
    [deals, openDetailDealId],
  );

  const companyName = useMemo(() => {
    if (searchCompanyName?.trim()) {
      return searchCompanyName;
    }
    return selectedCompany?.name ?? t("deals.selectedCompany");
  }, [searchCompanyName, selectedCompany?.name, t]);

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
      dealStageOptions.map((stage) => ({
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
    setOpenDetailDealId(null);
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
    setOpenDetailDealId((current) =>
      current && filteredDeals.some((deal) => deal.id === current) ? current : null,
    );
    return filteredDeals;
  }

  async function saveDeal() {
    if (!selectedCompany) {
      return;
    }

    const name = dealForm.name.trim();
    if (!name) {
      setErrorMessage(t("deals.errors.nameRequired"));
      return;
    }
    if (!supportedDealCurrencies.includes(dealForm.currency as (typeof supportedDealCurrencies)[number])) {
      setErrorMessage(t("deals.errors.unsupportedCurrency"));
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
        editingDealId ? t("deals.success.updated") : t("deals.success.created"),
      );
      setCommentDraft("");
      closeFormModal();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("deals.errors.saveDeal"),
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
      setSuccessMessage(t("deals.success.deleted"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("deals.errors.deleteDeal"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    if (!selectedDeal || !commentDraft.trim() || !selectedCompany) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await createDealComment(selectedDeal.id, { body: commentDraft });
      const nextDeals = await reloadDeals(selectedCompany.id);
      const refreshedDeal =
        nextDeals.find((deal) => deal.id === selectedDeal.id) ?? nextDeals[0] ?? null;
      setSelectedDealId(refreshedDeal?.id ?? null);
      setCommentDraft("");
      setSuccessMessage(t("deals.success.commentAdded"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("deals.errors.addComment"),
      );
    } finally {
      setSaving(false);
    }
  }

  function scheduleDeal(deal: Deal) {
    if (!selectedCompany) {
      return;
    }

    const nextSearch = new URLSearchParams({
      company: selectedCompany.id,
      companyName,
      compose: "1",
      linkedType: "deal",
      linkedId: deal.id,
      title: t("deals.meetingTitle", { name: deal.name || t("deals.deal") }),
      eventType: "meeting",
    });

    if (deal.customerId) {
      nextSearch.set("customerId", deal.customerId);
    }

    window.location.assign(`/dashboard/calendar?${nextSearch.toString()}`);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <DealHeader
        company={selectedCompany}
        companyName={companyName}
        dealCount={deals.length}
        onCreate={openCreateModal}
        pipelineCounts={pipelineCounts}
        saving={saving}
      />

      {errorMessage ? (
        <div className="rounded-[var(--radius-card-lg)] border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[var(--radius-card-lg)] border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
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

      <div className="grid min-w-0 gap-6">
        <DealBoard
          customerLabelById={customerLabelById}
          deals={deals}
          dealsLoading={dealsLoading}
          onSelectDeal={(dealId) => {
            setSelectedDealId(dealId);
            setOpenDetailDealId(dealId);
          }}
          selectedDealId={selectedDealId}
        />
        <section className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          {t("deals.boardHint")}
        </section>
      </div>

      {detailDeal ? (
        <DealDetailPanel
          aiEnabled={aiEnabled}
          commentDraft={commentDraft}
          companyLabel={companyName}
          customerLabel={customerLabelById.get(detailDeal.customerId) ?? "—"}
          deal={detailDeal}
          onAddComment={addComment}
          onClose={() => setOpenDetailDealId(null)}
          onCommentDraftChange={setCommentDraft}
          onDelete={setPendingDeleteDeal}
          onEdit={openEditModal}
          onSchedule={scheduleDeal}
          saving={saving}
          sourceLeadLabel={leadLabelById.get(detailDeal.sourceLeadId) ?? "—"}
        />
      ) : null}

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
