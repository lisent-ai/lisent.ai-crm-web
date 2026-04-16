"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CRMClientError,
  convertLead,
  createLead,
  deleteLead as deleteLeadRequest,
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

import { LeadConvertModal } from "./lead-convert-modal";
import { LeadDeleteModal } from "./lead-delete-modal";
import { LeadDetailPanel } from "./lead-detail-panel";
import { LeadFilters } from "./lead-filters";
import { LeadFormModal } from "./lead-form-modal";
import { LeadHeader } from "./lead-header";
import { LeadList } from "./lead-list";
import {
  buildConvertState,
  buildLeadForm,
  emptyLeadForm,
  leadStatuses,
  type LeadConvertState,
  type LeadFormState,
} from "./lead-types";
import { parseLeadValue } from "./lead-utils";

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
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [pendingDeleteLead, setPendingDeleteLead] = useState<Lead | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm);
  const [convertState, setConvertState] = useState<LeadConvertState | null>(null);

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
      setMembers([]);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [nextCustomers, nextMembers] = await Promise.all([
          listCustomers(companyId).catch(() => []),
          listCompanyMembers(companyId).catch((error) => {
            if (error instanceof CompanyMembershipClientError) {
              return [];
            }
            throw error;
          }),
        ]);

        if (!cancelled) {
          setCustomers(nextCustomers);
          setMembers(nextMembers);
        }
      } catch {
        if (!cancelled) {
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
          setSelectedLeadId((current) => {
            if (current && nextLeads.some((lead) => lead.id === current)) {
              return current;
            }
            return nextLeads[0]?.id ?? null;
          });
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

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null,
    [leads, selectedLeadId],
  );

  const companyName = useMemo(() => {
    if (searchCompanyName?.trim()) {
      return searchCompanyName;
    }
    return selectedCompany?.name ?? "Selected company";
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
    selectedLead?.customerId &&
    customers.find((customer) => customer.id === selectedLead.customerId)?.name;

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
      return nextLeads[0]?.id ?? null;
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

  function openConvertLeadModal(lead: Lead) {
    setConvertState(buildConvertState(lead));
    setSelectedLeadId(lead.id);
    setShowConvertModal(true);
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

  return (
    <div className="grid gap-6">
      <LeadHeader
        company={selectedCompany}
        companyName={companyName}
        leadCount={leads.length}
        onCreate={openCreateModal}
        pipelineCounts={pipelineCounts}
        saving={saving}
      />

      <LeadFilters
        assigneeFilter={assigneeFilter}
        assigneeOptions={assigneeOptions}
        errorMessage={errorMessage}
        onAssigneeChange={setAssigneeFilter}
        onSearchChange={setSearchQuery}
        onShowUnassignedChange={setShowOnlyUnassigned}
        onSourceChange={setSourceFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        showOnlyUnassigned={showOnlyUnassigned}
        sourceFilter={sourceFilter}
        sourceOptions={sourceOptions}
        statusFilter={statusFilter}
        successMessage={successMessage}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <LeadList
          companiesLoading={companiesLoading}
          leads={leads}
          leadsLoading={leadsLoading}
          onSelectLead={setSelectedLeadId}
          selectedLeadId={selectedLeadId}
        />

        <LeadDetailPanel
          assignableMembersCount={assignableMembers.length}
          customerLabel={customerLabel}
          lead={selectedLead}
          onAssignRoundRobin={assignLeadRoundRobin}
          onConvert={openConvertLeadModal}
          onDelete={setPendingDeleteLead}
          onEdit={openEditModal}
          saving={saving}
        />
      </div>

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
    </div>
  );
}
