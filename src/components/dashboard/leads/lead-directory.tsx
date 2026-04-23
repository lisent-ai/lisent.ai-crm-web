"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CheckCircle2, PencilLine, Trash2 } from "lucide-react";

import {
  CRMClientError,
  convertLead,
  createLead,
  deleteLead as deleteLeadRequest,
  fetchIntegrationCatalog,
  isAIQualifierConnected,
  listCompanies,
  listCustomers,
  listLeads,
  type Company,
  type ConvertLeadInput,
  type Customer,
  type Lead,
  type LeadAssignmentMethod,
  updateCompanyExtraData,
  updateLead,
} from "@/lib/crm/client";
import {
  CompanyMembershipClientError,
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";

import { startLeadQualify } from "@/lib/qualifier/client";

import { LeadBulkActionBar } from "./lead-bulk-action-bar";
import { LeadConvertModal } from "./lead-convert-modal";
import { LeadDeleteModal } from "./lead-delete-modal";
import { LeadDetailDrawer, type LeadDetailView } from "./lead-detail-drawer";
import { LeadFormModal } from "./lead-form-modal";
import { LeadHeader } from "./lead-header";
import { LeadKpiStrip } from "./lead-kpi-strip";
import { LeadStatusTabs } from "./lead-status-tabs";
import { LeadTable } from "./lead-table";
import { LeadToolbar } from "./lead-toolbar";
import {
  buildConvertState,
  buildLeadForm,
  emptyLeadForm,
  leadStatuses,
  type LeadConvertState,
  type LeadFormState,
} from "./lead-types";
import { buildLeadCsv, downloadCsv, parseLeadValue } from "./lead-utils";

export function LeadDirectory() {
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<LeadDetailView>("profile");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [pendingDeleteLead, setPendingDeleteLead] = useState<Lead | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm);
  const [convertState, setConvertState] = useState<LeadConvertState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [rowMenu, setRowMenu] = useState<{
    lead: Lead;
    top: number;
    left: number;
  } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

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

  const [aiEnabled, setAIEnabled] = useState(false);

  useEffect(() => {
    if (!selectedCompany?.id) {
      setCustomers([]);
      setMembers([]);
      setAIEnabled(false);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [nextCustomers, nextMembers, catalog] = await Promise.all([
          listCustomers(companyId).catch(() => []),
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
          setMembers(nextMembers);
          setAIEnabled(isAIQualifierConnected(catalog));
        }
      } catch {
        if (!cancelled) {
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
      setLeads([]);
      setLeadsLoading(false);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadLeadList() {
      setLeadsLoading(true);
      setErrorMessage(null);
      try {
        const nextLeads = await listLeads(companyId, {
          status: statusFilter === "all" ? "" : statusFilter,
          source: sourceFilter === "all" ? "" : sourceFilter,
          assigneeUserId: assigneeFilter === "all" ? "" : assigneeFilter,
          q: searchQuery,
          unassigned: showOnlyUnassigned,
        });

        if (!cancelled) {
          setLeads(nextLeads);
          setSelectedIds(new Set());
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError ? error.message : "Failed to load leads.",
          );
        }
      } finally {
        if (!cancelled) {
          setLeadsLoading(false);
        }
      }
    }

    void loadLeadList();
    return () => {
      cancelled = true;
    };
  }, [
    assigneeFilter,
    searchQuery,
    selectedCompany?.id,
    showOnlyUnassigned,
    sourceFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (!rowMenu) return;
    function onPointer(event: MouseEvent) {
      if (!rowMenuRef.current?.contains(event.target as Node)) {
        setRowMenu(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRowMenu(null);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [rowMenu]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

  const companyName = useMemo(() => {
    if (searchCompanyName?.trim()) {
      return searchCompanyName;
    }
    return selectedCompany?.name ?? "";
  }, [searchCompanyName, selectedCompany?.name]);

  const sourceOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        leads
          .map((lead) => lead.source.trim())
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right)),
      ),
    );
    return [
      { label: "All sources", value: "all" },
      ...values.map((value) => ({ label: value, value })),
    ];
  }, [leads]);

  const assignableMembers = useMemo(
    () =>
      members
        .filter((member) => member.role !== "viewer")
        .sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [members],
  );

  const assigneeOptions = useMemo(
    () => [
      { label: "All assignees", value: "all" },
      ...assignableMembers.map((member) => ({
        label: member.displayName,
        value: member.userId,
      })),
    ],
    [assignableMembers],
  );

  const pipelineCounts = useMemo(
    () =>
      leadStatuses.map((status) => ({
        status,
        count: leads.filter((lead) => lead.status === status).length,
      })),
    [leads],
  );

  const customerLabel =
    selectedLead?.customerId
      ? customers.find((customer) => customer.id === selectedLead.customerId)?.name
      : undefined;

  function updateCompanyState(nextCompany: Company) {
    setCompanies((current) =>
      current.map((company) => (company.id === nextCompany.id ? nextCompany : company)),
    );
  }

  async function reloadReferenceData(companyId: string) {
    const [nextLeads, nextCustomers, nextMembers] = await Promise.all([
      listLeads(companyId, {
        status: statusFilter === "all" ? "" : statusFilter,
        source: sourceFilter === "all" ? "" : sourceFilter,
        assigneeUserId: assigneeFilter === "all" ? "" : assigneeFilter,
        q: searchQuery,
        unassigned: showOnlyUnassigned,
      }),
      listCustomers(companyId).catch(() => []),
      listCompanyMembers(companyId).catch(() => []),
    ]);

    setLeads(nextLeads);
    setCustomers(nextCustomers);
    setMembers(nextMembers);
    setSelectedLeadId((current) => {
      if (current && nextLeads.some((lead) => lead.id === current)) {
        return current;
      }
      return null;
    });
    return nextLeads;
  }

  async function resolveAssignment(
    company: Company,
    input: LeadFormState,
  ): Promise<{
    assigneeUserId: string;
    assigneeUserName: string;
    assignmentMethod: LeadAssignmentMethod;
    company: Company;
  }> {
    if (input.assignmentMethod !== "round_robin") {
      return {
        assigneeUserId: input.assigneeUserId.trim(),
        assigneeUserName: input.assigneeUserName.trim(),
        assignmentMethod: "manual",
        company,
      };
    }

    if (input.assigneeUserId.trim()) {
      return {
        assigneeUserId: input.assigneeUserId.trim(),
        assigneeUserName: input.assigneeUserName.trim(),
        assignmentMethod: "round_robin",
        company,
      };
    }

    if (assignableMembers.length === 0) {
      throw new Error("Round-robin requires at least one assignable team member.");
    }

    const lastUserId = company.extraData.lead_assignment_last_user_id?.trim() || "";
    const currentIndex = assignableMembers.findIndex(
      (member) => member.userId === lastUserId,
    );
    const nextMember =
      assignableMembers[(currentIndex + 1 + assignableMembers.length) % assignableMembers.length];

    const nextCompany = await updateCompanyExtraData(company.id, {
      ...company.extraData,
      lead_assignment_last_user_id: nextMember.userId,
      lead_assignment_strategy: "round_robin",
    });
    updateCompanyState(nextCompany);

    return {
      assigneeUserId: nextMember.userId,
      assigneeUserName: nextMember.displayName,
      assignmentMethod: "round_robin",
      company: nextCompany,
    };
  }

  function openCreateModal() {
    setEditingLeadId(null);
    setLeadForm(emptyLeadForm);
    setShowLeadModal(true);
  }

  function openEditModal(lead: Lead) {
    setEditingLeadId(lead.id);
    setLeadForm(buildLeadForm(lead));
    setShowLeadModal(true);
    setRowMenu(null);
  }

  function closeLeadModal() {
    setEditingLeadId(null);
    setLeadForm(emptyLeadForm);
    setShowLeadModal(false);
  }

  async function handleSaveLead() {
    if (!selectedCompany) {
      return;
    }

    if (!leadForm.name.trim()) {
      setErrorMessage("Lead name is required.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const assignment = await resolveAssignment(selectedCompany, leadForm);
      const payload = {
        companyId: assignment.company.id,
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone,
        notes: leadForm.notes,
        status: leadForm.status,
        source: leadForm.source,
        assigneeUserId: assignment.assigneeUserId,
        assigneeUserName: assignment.assigneeUserName,
        assignmentMethod: assignment.assignmentMethod,
        value: parseLeadValue(leadForm.value),
        extraData:
          editingLeadId
            ? leads.find((lead) => lead.id === editingLeadId)?.extraData ?? {}
            : {},
      };

      const savedLead = editingLeadId
        ? await updateLead(editingLeadId, payload)
        : await createLead(payload);

      await reloadReferenceData(assignment.company.id);
      setSelectedLeadId(savedLead.id);
      setSuccessMessage(
        editingLeadId ? "Lead updated successfully." : "Lead created successfully.",
      );
      closeLeadModal();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError || error instanceof Error
          ? error.message
          : "Failed to save lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLead() {
    if (!pendingDeleteLead || !selectedCompany) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteLeadRequest(pendingDeleteLead.id);
      const nextLeads = await reloadReferenceData(selectedCompany.id);
      if (selectedLeadId === pendingDeleteLead.id) {
        setSelectedLeadId(nextLeads[0]?.id ?? null);
        setDrawerOpen(false);
      }
      setPendingDeleteLead(null);
      setSuccessMessage("Lead removed.");
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : "Failed to delete lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkDelete() {
    if (!selectedCompany || selectedIds.size === 0) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const ids = Array.from(selectedIds);
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await deleteLeadRequest(id);
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }
    await reloadReferenceData(selectedCompany.id);
    setSelectedIds(new Set());
    setPendingBulkDelete(false);
    if (failed.length === 0) {
      setSuccessMessage(`${succeeded.length} lead${succeeded.length === 1 ? "" : "s"} removed.`);
    } else if (succeeded.length === 0) {
      setErrorMessage(`Failed to delete ${failed.length} lead${failed.length === 1 ? "" : "s"}.`);
    } else {
      setSuccessMessage(`${succeeded.length} deleted, ${failed.length} failed.`);
    }
    setSaving(false);
  }

  function handleBulkExport() {
    const rows = leads.filter((lead) => selectedIds.has(lead.id));
    if (rows.length === 0) return;
    const csv = buildLeadCsv(rows);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCsv(`leads-${stamp}.csv`, csv);
    setSuccessMessage(`${rows.length} lead${rows.length === 1 ? "" : "s"} exported.`);
  }

  function scheduleLead(lead: Lead) {
    if (!selectedCompany) {
      return;
    }

    const nextSearch = new URLSearchParams({
      company: selectedCompany.id,
      companyName: companyName || selectedCompany.name,
      compose: "1",
      linkedType: "lead",
      linkedId: lead.id,
      title: `Follow up: ${lead.name || "Lead"}`,
      eventType: "follow_up",
    });

    if (lead.customerId) {
      nextSearch.set("customerId", lead.customerId);
    }

    window.location.assign(`/dashboard/calendar?${nextSearch.toString()}`);
  }

  function openConvertLeadModal(lead: Lead) {
    setConvertState(buildConvertState(lead));
    setSelectedLeadId(lead.id);
    setShowConvertModal(true);
    setRowMenu(null);
  }

  function closeConvertModal() {
    setShowConvertModal(false);
    setConvertState(null);
  }

  async function handleConvertLead() {
    if (!selectedLead || !selectedCompany || !convertState) {
      return;
    }

    if (!convertState.name.trim()) {
      setErrorMessage("Customer name is required for conversion.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload: ConvertLeadInput = {
        customer: {
          name: convertState.name,
          email: convertState.email,
          phone: convertState.phone,
          preferredLanguage: convertState.preferredLanguage,
          countryCode: convertState.countryCode,
        },
        deal: convertState.createDeal
          ? {
              stage: convertState.dealStage,
              amount: parseLeadValue(convertState.dealAmount),
              closeDate: convertState.dealCloseDate,
            }
          : null,
      };

      await convertLead(selectedLead.id, payload);
      await reloadReferenceData(selectedCompany.id);
      closeConvertModal();
      setSuccessMessage(
        convertState.createDeal
          ? "Lead converted to customer and deal."
          : "Lead converted to customer.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : "Failed to convert lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function startQualifyLead(lead: Lead) {
    if (!selectedCompany) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await startLeadQualify(selectedCompany.id, lead.id);
      await reloadReferenceData(selectedCompany.id);
      setSuccessMessage("AI qualification started for this lead.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start qualification.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignLeadRoundRobin(lead: Lead) {
    if (!selectedCompany) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const assignment = await resolveAssignment(selectedCompany, {
        ...buildLeadForm(lead),
        assignmentMethod: "round_robin",
      });
      await updateLead(lead.id, {
        companyId: selectedCompany.id,
        customerId: lead.customerId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes,
        status: lead.status,
        source: lead.source,
        assigneeUserId: assignment.assigneeUserId,
        assigneeUserName: assignment.assigneeUserName,
        assignmentMethod: "round_robin",
        value: lead.value,
        extraData: lead.extraData,
      });
      await reloadReferenceData(selectedCompany.id);
      setSuccessMessage(`Assigned to ${assignment.assigneeUserName} via round-robin.`);
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError || error instanceof Error
          ? error.message
          : "Failed to assign lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((current) => {
      if (current.size === leads.length) return new Set();
      return new Set(leads.map((l) => l.id));
    });
  }

  function handleRowClick(lead: Lead) {
    setSelectedLeadId(lead.id);
    setDrawerView("profile");
    setDrawerOpen(true);
  }

  function handleAIClick(lead: Lead) {
    setSelectedLeadId(lead.id);
    setDrawerView("ai");
    setDrawerOpen(true);
  }

  function openRowMenu(lead: Lead, anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    setRowMenu({
      lead,
      top: rect.bottom + window.scrollY + 6,
      left: Math.max(8, rect.right - 180 + window.scrollX),
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <LeadHeader companyName={companyName} leadCount={leads.length} />

      <LeadKpiStrip leads={leads} loading={companiesLoading || leadsLoading} />

      {errorMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-green)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {successMessage}
        </div>
      ) : null}

      {!selectedCompany && !companiesLoading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          Pick a workspace from the top bar to see leads.
        </div>
      ) : (
        <section className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border-subtle)] px-4 pt-1 sm:px-5">
            <LeadStatusTabs
              counts={pipelineCounts}
              onChange={setStatusFilter}
              totalCount={leads.length}
              value={statusFilter}
            />
          </div>

          <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
            <LeadToolbar
              assigneeFilter={assigneeFilter}
              assigneeOptions={assigneeOptions}
              canAdd={!!selectedCompany && !saving}
              onAdd={openCreateModal}
              onAssigneeChange={setAssigneeFilter}
              onSearchChange={setSearchQuery}
              onShowUnassignedChange={setShowOnlyUnassigned}
              onSourceChange={setSourceFilter}
              searchQuery={searchQuery}
              showOnlyUnassigned={showOnlyUnassigned}
              sourceFilter={sourceFilter}
              sourceOptions={sourceOptions}
            />
          </div>

          <LeadTable
            activeLeadId={drawerOpen ? selectedLeadId : null}
            aiEnabled={aiEnabled}
            leads={leads}
            loading={companiesLoading || leadsLoading}
            onAIScoreClick={handleAIClick}
            onOpenRowMenu={openRowMenu}
            onRowClick={handleRowClick}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            selectedIds={selectedIds}
          />
        </section>
      )}

      {rowMenu ? (
        <div
          className="absolute z-40 w-[180px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1 shadow-[var(--shadow-float)]"
          ref={rowMenuRef}
          role="menu"
          style={{ top: rowMenu.top, left: rowMenu.left }}
        >
          <RowMenuItem
            icon={<PencilLine className="h-4 w-4" aria-hidden="true" />}
            label="Edit"
            onClick={() => openEditModal(rowMenu.lead)}
          />
          <RowMenuItem
            disabled={rowMenu.lead.status === "converted"}
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            label="Convert"
            onClick={() => openConvertLeadModal(rowMenu.lead)}
          />
          <RowMenuItem
            icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
            label="Schedule"
            onClick={() => {
              scheduleLead(rowMenu.lead);
              setRowMenu(null);
            }}
          />
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <RowMenuItem
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            label="Delete"
            onClick={() => {
              setPendingDeleteLead(rowMenu.lead);
              setRowMenu(null);
            }}
            tone="danger"
          />
        </div>
      ) : null}

      <LeadDetailDrawer
        aiEnabled={aiEnabled}
        assignableMembersCount={assignableMembers.length}
        customerLabel={customerLabel}
        lead={selectedLead}
        onAssignRoundRobin={assignLeadRoundRobin}
        onChangeView={setDrawerView}
        onClose={() => setDrawerOpen(false)}
        onConvert={openConvertLeadModal}
        onDelete={(lead) => setPendingDeleteLead(lead)}
        onEdit={openEditModal}
        onSchedule={scheduleLead}
        onStartQualify={startQualifyLead}
        open={drawerOpen && !!selectedLead}
        saving={saving}
        view={drawerView}
      />

      <LeadBulkActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setPendingBulkDelete(true)}
        onExport={handleBulkExport}
        saving={saving}
      />

      {showLeadModal ? (
        <LeadFormModal
          assignableMembers={assignableMembers}
          editingLeadId={editingLeadId}
          leadForm={leadForm}
          onClose={closeLeadModal}
          onLeadFormChange={(updater) => setLeadForm((current) => updater(current))}
          onSave={handleSaveLead}
          saving={saving}
        />
      ) : null}

      {showConvertModal && selectedLead && convertState ? (
        <LeadConvertModal
          convertState={convertState}
          lead={selectedLead}
          onClose={closeConvertModal}
          onConvert={handleConvertLead}
          onConvertStateChange={(updater) =>
            setConvertState((current) => (current ? updater(current) : current))
          }
          saving={saving}
        />
      ) : null}

      {pendingDeleteLead ? (
        <LeadDeleteModal
          lead={pendingDeleteLead}
          onClose={() => setPendingDeleteLead(null)}
          onConfirm={handleDeleteLead}
          saving={saving}
        />
      ) : null}

      {pendingBulkDelete ? (
        <BulkDeleteConfirmModal
          count={selectedIds.size}
          onClose={() => setPendingBulkDelete(false)}
          onConfirm={() => void handleBulkDelete()}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

function RowMenuItem({
  icon,
  label,
  onClick,
  tone,
  disabled,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger";
  disabled?: boolean;
}>) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition disabled:opacity-40 ${
        tone === "danger"
          ? "text-[var(--signal-red)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      }`}
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function BulkDeleteConfirmModal({
  count,
  onClose,
  onConfirm,
  saving,
}: Readonly<{
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}>) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(11,15,25,0.45)] px-4 py-8 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-auto w-full max-w-md rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Delete {count} lead{count === 1 ? "" : "s"}?
        </h2>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          This permanently removes the selected leads from the workspace. This
          action cannot be undone.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--signal-red)] px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? "Deleting…" : `Delete ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
