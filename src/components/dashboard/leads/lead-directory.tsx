"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, CheckCircle2, PencilLine, Trash2 } from "lucide-react";

import { getAccountProfile } from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import {
  CRMClientError,
  convertLead,
  createLead,
  createLeadComment,
  deleteLeadComment,
  deleteLead as deleteLeadRequest,
  fetchIntegrationCatalog,
  isAIQualifierConnected,
  listCompanies,
  listCustomers,
  listLeadComments,
  listLeads,
  type Company,
  type ConvertLeadInput,
  type Customer,
  type Lead,
  type LeadComment,
  type LeadAssignmentMethod,
  updateLeadComment,
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
import { LeadBulkAssignModal } from "./lead-bulk-assign-modal";
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

function buildLeadFilters(input: {
  tab: string;
  accountUserId: string;
  sourceFilter: string;
  assigneeFilter: string;
  searchQuery: string;
  showOnlyUnassigned: boolean;
}) {
  const assignedToMeActive = input.tab === "assigned_to_me";
  const explicitAssigneeFilter = input.assigneeFilter === "all" ? "" : input.assigneeFilter;
  const effectiveAssigneeFilter =
    explicitAssigneeFilter || (assignedToMeActive ? input.accountUserId : "");

  return {
    status: input.tab === "all" || assignedToMeActive ? "" : input.tab,
    source: input.sourceFilter === "all" ? "" : input.sourceFilter,
    assigneeUserId: effectiveAssigneeFilter,
    q: input.searchQuery,
    unassigned: assignedToMeActive ? false : input.showOnlyUnassigned,
  };
}

export function LeadDirectory() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");

  const [account, setAccount] = useState<AccountProfile | null>(null);
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
  const [leadComments, setLeadComments] = useState<LeadComment[]>([]);
  const [leadCommentsLoading, setLeadCommentsLoading] = useState(false);
  const [leadCommentDraft, setLeadCommentDraft] = useState("");
  const [editingLeadCommentId, setEditingLeadCommentId] = useState<string | null>(null);
  const [editingLeadCommentBody, setEditingLeadCommentBody] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<LeadDetailView>("profile");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [pendingDeleteLead, setPendingDeleteLead] = useState<Lead | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignUserId, setBulkAssignUserId] = useState("");
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

    async function loadAccount() {
      try {
        const nextAccount = await getAccountProfile();
        if (!cancelled) {
          setAccount(nextAccount);
        }
      } catch {
        if (!cancelled) {
          setAccount(null);
        }
      }
    }

    void loadAccount();
    return () => {
      cancelled = true;
    };
  }, []);

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
              : t("leads.errors.loadCompanies"),
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
  const accountUserId = account?.userId?.trim() ?? "";
  const leadFilters = useMemo(
    () =>
      buildLeadFilters({
        tab: statusFilter,
        accountUserId,
        sourceFilter,
        assigneeFilter,
        searchQuery,
        showOnlyUnassigned,
      }),
    [
      accountUserId,
      assigneeFilter,
      searchQuery,
      showOnlyUnassigned,
      sourceFilter,
      statusFilter,
    ],
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
        const nextLeads = await listLeads(companyId, leadFilters);

        if (!cancelled) {
          setLeads(nextLeads);
          setSelectedIds(new Set());
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError ? error.message : t("leads.errors.loadLeads"),
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
    leadFilters,
    selectedCompany?.id,
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
      { label: t("leads.filters.allSources"), value: "all" },
      ...values.map((value) => ({ label: value, value })),
    ];
  }, [leads, t]);

  const assignableMembers = useMemo(
    () =>
      members
        .filter((member) => member.role !== "viewer")
        .sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [members],
  );

  const assigneeOptions = useMemo(
    () => [
      { label: t("leads.filters.allAssignees"), value: "all" },
      ...assignableMembers.map((member) => ({
        label: member.displayName,
        value: member.userId,
      })),
    ],
    [assignableMembers, t],
  );

  const pipelineCounts = useMemo(
    () =>
      leadStatuses.map((status) => ({
        status,
        count: leads.filter((lead) => lead.status === status).length,
      })),
    [leads],
  );

  const assignedToMeCount = useMemo(
    () =>
      accountUserId
        ? leads.filter((lead) => lead.assigneeUserId === accountUserId).length
        : 0,
    [accountUserId, leads],
  );

  const customerLabel =
    selectedLead?.customerId
      ? customers.find((customer) => customer.id === selectedLead.customerId)?.name
      : undefined;

  useEffect(() => {
    if (!drawerOpen || !selectedLead?.id) {
      setLeadComments([]);
      setLeadCommentsLoading(false);
      setLeadCommentDraft("");
      setEditingLeadCommentId(null);
      setEditingLeadCommentBody("");
      return;
    }

    const leadId = selectedLead.id;
    let cancelled = false;

    async function loadLeadComments() {
      setLeadCommentsLoading(true);
      try {
        const nextComments = await listLeadComments(leadId);
        if (!cancelled) {
          setLeadComments(nextComments);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError
              ? error.message
              : t("leads.errors.loadNotes"),
          );
          setLeadComments([]);
        }
      } finally {
        if (!cancelled) {
          setLeadCommentsLoading(false);
        }
      }
    }

    void loadLeadComments();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, selectedLead?.id]);

  function updateCompanyState(nextCompany: Company) {
    setCompanies((current) =>
      current.map((company) => (company.id === nextCompany.id ? nextCompany : company)),
    );
  }

  async function reloadReferenceData(companyId: string) {
    const [nextLeads, nextCustomers, nextMembers] = await Promise.all([
      listLeads(companyId, leadFilters),
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

  function handleStatusTabChange(next: string) {
    if (next === "assigned_to_me") {
      setAssigneeFilter("all");
      setShowOnlyUnassigned(false);
    }

    setStatusFilter(next);
  }

  function handleAssigneeFilterChange(next: string) {
    setAssigneeFilter(next);

    if (!accountUserId) {
      return;
    }

    if (next === accountUserId) {
      setShowOnlyUnassigned(false);
      setStatusFilter("assigned_to_me");
      return;
    }

    if (next !== "all" && statusFilter === "assigned_to_me") {
      setStatusFilter("all");
    }
  }

  function handleShowOnlyUnassignedChange(next: boolean) {
    setShowOnlyUnassigned(next);

    if (next && statusFilter === "assigned_to_me") {
      setStatusFilter("all");
    }
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
      throw new Error(t("leads.errors.roundRobinNoMembers"));
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
      setErrorMessage(t("leads.errors.nameRequired"));
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
        editingLeadId
          ? t("leads.success.updated")
          : t("leads.success.created"),
      );
      closeLeadModal();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError || error instanceof Error
          ? error.message
          : t("leads.errors.saveLead"),
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
      setSuccessMessage(t("leads.success.removed"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.errors.deleteLead"),
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
      setSuccessMessage(t("leads.success.bulkRemoved", { count: succeeded.length }));
    } else if (succeeded.length === 0) {
      setErrorMessage(t("leads.errors.bulkDeleteFailed", { count: failed.length }));
    } else {
      setSuccessMessage(
        t("leads.success.bulkPartial", {
          succeeded: succeeded.length,
          failed: failed.length,
        }),
      );
    }
    setSaving(false);
  }

  async function handleBulkAssign() {
    if (!selectedCompany || selectedIds.size === 0) return;

    const assignee = assignableMembers.find((member) => member.userId === bulkAssignUserId);
    if (!assignee) {
      setErrorMessage(t("leads.errors.selectTeammate"));
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const rows = leads.filter((lead) => selectedIds.has(lead.id));
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const lead of rows) {
      try {
        await updateLead(lead.id, {
          assigneeUserId: assignee.userId,
          assigneeUserName: assignee.displayName,
          assignmentMethod: "manual",
        });
        succeeded.push(lead.id);
      } catch {
        failed.push(lead.id);
      }
    }

    await reloadReferenceData(selectedCompany.id);
    setSelectedIds(new Set());
    setShowBulkAssignModal(false);
    setBulkAssignUserId("");

    if (failed.length === 0) {
      setSuccessMessage(
        t("leads.success.bulkAssigned", {
          count: succeeded.length,
          assignee: assignee.displayName,
        }),
      );
    } else if (succeeded.length === 0) {
      setErrorMessage(t("leads.errors.bulkAssignFailed", { count: failed.length }));
    } else {
      setSuccessMessage(
        t("leads.success.bulkAssignPartial", {
          succeeded: succeeded.length,
          failed: failed.length,
        }),
      );
    }

    setSaving(false);
  }

  async function handleAddLeadComment() {
    if (!selectedLead || !selectedCompany || !leadCommentDraft.trim()) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createLeadComment(selectedLead.id, { body: leadCommentDraft });
      await reloadReferenceData(selectedCompany.id);
      const nextComments = await listLeadComments(selectedLead.id);
      setLeadComments(nextComments);
      setLeadCommentDraft("");
      setSuccessMessage(t("leads.success.noteAdded"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.errors.addNote"),
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditingLeadComment(comment: LeadComment) {
    setEditingLeadCommentId(comment.id);
    setEditingLeadCommentBody(comment.body);
  }

  function stopEditingLeadComment() {
    setEditingLeadCommentId(null);
    setEditingLeadCommentBody("");
  }

  async function handleSaveEditedLeadComment() {
    if (!selectedLead || !editingLeadCommentId || !editingLeadCommentBody.trim()) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateLeadComment(selectedLead.id, editingLeadCommentId, {
        body: editingLeadCommentBody,
      });
      const nextComments = await listLeadComments(selectedLead.id);
      setLeadComments(nextComments);
      stopEditingLeadComment();
      setSuccessMessage(t("leads.success.noteUpdated"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.errors.updateNote"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLeadComment(comment: LeadComment) {
    if (!selectedLead) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteLeadComment(selectedLead.id, comment.id);
      const nextComments = await listLeadComments(selectedLead.id);
      setLeadComments(nextComments);
      if (editingLeadCommentId === comment.id) {
        stopEditingLeadComment();
      }
      setSuccessMessage(t("leads.success.noteDeleted"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.errors.deleteNote"),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBulkExport() {
    const rows = leads.filter((lead) => selectedIds.has(lead.id));
    if (rows.length === 0) return;
    const csv = buildLeadCsv(rows);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCsv(`leads-${stamp}.csv`, csv);
    setSuccessMessage(t("leads.success.exported", { count: rows.length }));
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
      title: t("leads.scheduleTitle", { name: lead.name || t("leads.fallback.lead") }),
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
      setErrorMessage(t("leads.errors.customerNameRequired"));
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
          ? t("leads.success.convertedWithDeal")
          : t("leads.success.converted"),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.errors.convertLead"),
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
      setSuccessMessage(t("leads.success.aiStarted"));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("leads.errors.startQualify"),
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
        assigneeUserId: assignment.assigneeUserId,
        assigneeUserName: assignment.assigneeUserName,
        assignmentMethod: "round_robin",
      });
      await reloadReferenceData(selectedCompany.id);
      setSuccessMessage(
        t("leads.success.roundRobinAssigned", { name: assignment.assigneeUserName }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError || error instanceof Error
          ? error.message
          : t("leads.errors.assignLead"),
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
          {t("leads.emptyState.pickWorkspace")}
        </div>
      ) : (
        <section className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border-subtle)] px-4 pt-1 sm:px-5">
            <LeadStatusTabs
              assignedToMeCount={assignedToMeCount}
              assignedToMeDisabled={!accountUserId}
              counts={pipelineCounts}
              onChange={handleStatusTabChange}
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
              onAssigneeChange={handleAssigneeFilterChange}
              onSearchChange={setSearchQuery}
              onShowUnassignedChange={handleShowOnlyUnassignedChange}
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
            label={t("leads.rowMenu.edit")}
            onClick={() => openEditModal(rowMenu.lead)}
          />
          <RowMenuItem
            disabled={rowMenu.lead.status === "converted"}
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            label={t("leads.rowMenu.convert")}
            onClick={() => openConvertLeadModal(rowMenu.lead)}
          />
          <RowMenuItem
            icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
            label={t("leads.rowMenu.schedule")}
            onClick={() => {
              scheduleLead(rowMenu.lead);
              setRowMenu(null);
            }}
          />
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <RowMenuItem
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            label={t("leads.rowMenu.delete")}
            onClick={() => {
              setPendingDeleteLead(rowMenu.lead);
              setRowMenu(null);
            }}
            tone="danger"
          />
        </div>
      ) : null}

      <LeadDetailDrawer
        account={account}
        aiEnabled={aiEnabled}
        assignableMembersCount={assignableMembers.length}
        commentDraft={leadCommentDraft}
        comments={leadComments}
        commentsLoading={leadCommentsLoading}
        companyName={companyName}
        customerLabel={customerLabel}
        editingCommentBody={editingLeadCommentBody}
        editingCommentId={editingLeadCommentId}
        lead={selectedLead}
        onAddComment={() => void handleAddLeadComment()}
        onCommentDraftChange={setLeadCommentDraft}
        onDeleteComment={(comment) => void handleDeleteLeadComment(comment)}
        onEditComment={startEditingLeadComment}
        onEditingCommentBodyChange={setEditingLeadCommentBody}
        onSaveEditedComment={() => void handleSaveEditedLeadComment()}
        onStopEditingComment={stopEditingLeadComment}
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
        canAssign={assignableMembers.length > 0}
        count={selectedIds.size}
        onAssign={() => setShowBulkAssignModal(true)}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setPendingBulkDelete(true)}
        onExport={handleBulkExport}
        saving={saving}
      />

      {showBulkAssignModal ? (
        <LeadBulkAssignModal
          assigneeUserId={bulkAssignUserId}
          assignableMembers={assignableMembers}
          count={selectedIds.size}
          onAssigneeChange={setBulkAssignUserId}
          onClose={() => {
            setShowBulkAssignModal(false);
            setBulkAssignUserId("");
          }}
          onConfirm={() => void handleBulkAssign()}
          saving={saving}
        />
      ) : null}

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
  const t = useTranslations();
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
          {t("leads.bulkDelete.title", { count })}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          {t("leads.bulkDelete.description")}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t("common.cancel")}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--signal-red)] px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? t("leads.bulkDelete.deleting") : t("leads.bulkDelete.confirm", { count })}
          </button>
        </div>
      </div>
    </div>
  );
}
