"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Archive, Calendar, CheckCircle2, History, PencilLine } from "lucide-react";

import { getAccountProfile } from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { getCompanyRoleForAccess } from "@/lib/auth/access-control";
import {
  CRMClientError,
  convertLead,
  createCalendarEvent,
  createLead,
  createLeadComment,
  deleteLeadComment,
  archiveLead as archiveLeadRequest,
  fetchIntegrationCatalog,
  getLeadStats,
  isAIQualifierConnected,
  listCompanies,
  listCustomers,
  listLeadComments,
  listLeads,
  listLeadsPage,
  type Company,
  type ConvertLeadInput,
  type Customer,
  type Lead,
  type LeadComment,
  type LeadAssignmentMethod,
  type LeadStats,
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

import {
  campaignLabelForLead,
  leadCampaignKey,
  leadHasCampaign,
  saveCampaignRuleAndBackfill,
} from "@/components/dashboard/marketing/campaign-rules";

import { LeadBulkActionBar } from "./lead-bulk-action-bar";
import { LeadBulkAssignModal } from "./lead-bulk-assign-modal";
import { LeadConvertModal } from "./lead-convert-modal";
import { LeadArchiveModal } from "./lead-archive-modal";
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
import {
  buildLeadCsv,
  computeFollowUpDate,
  downloadCsv,
  findDuplicateContacts,
  parseLeadValue,
  type DuplicateMatch,
} from "./lead-utils";

const LEADS_PAGE_SIZE = 25;

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
  const locale = useLocale() as import("@/lib/i18n/config").SupportedLocale;
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");
  // Marketing → Campaigns deep-links land on this page with
  // ?source=meta_test&campaign=<id|name>. We hydrate the source filter
  // from the URL on first render and apply the campaign as a client-side
  // post-filter (campaign isn't a backend filter — leads.extra_data
  // holds the campaign_id/name we group by).
  const searchSource = searchParams.get("source")?.trim() ?? "";
  const searchCampaign = searchParams.get("campaign")?.trim() ?? "";
  // Deep-link target: /dashboard/leads?lead=<id> opens that lead's card
  // (used by the dashboard "today's calls" panel).
  const searchLeadId = searchParams.get("lead")?.trim() ?? "";

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  // Full company-scoped leads, loaded LAZILY only while the create/edit modal
  // is open — used solely for duplicate-contact detection and resolving the
  // lead being edited. It is NOT used for counts/KPIs anymore (those come from
  // the server-side /lead-stats aggregate), so the list view no longer pulls
  // every row on load.
  const [companyLeads, setCompanyLeads] = useState<Lead[]>([]);
  // Server-computed aggregates for tab badges + KPI cards + source filter.
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  // Server-side pagination of the visible list.
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState(searchSource || "all");
  const [campaignFilter, setCampaignFilter] = useState(searchCampaign);
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
  // PDF export options modal — opens before the actual download so the
  // user can opt into pulling per-lead comments (extra round-trips per
  // selected lead, hence opt-in rather than default).
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfIncludeComments, setPdfIncludeComments] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
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
  const openedDeepLinkLeadRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  // Keep source + campaign filters in sync with URL so deep-links from
  // Marketing → Campaigns work even when navigating between campaigns
  // without a full page reload.
  useEffect(() => {
    setSourceFilter(searchSource || "all");
  }, [searchSource]);
  useEffect(() => {
    setCampaignFilter(searchCampaign);
  }, [searchCampaign]);

  // Clear selection whenever the visible set narrows (filter change) so
  // a stale "all" selection from a wider view can't be carried into a
  // bulk action against a different scope. handleBulkDelete /
  // handleBulkAssign also defend with a visible-only filter, but
  // resetting here keeps the selection counter visually honest too.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [campaignFilter, sourceFilter, statusFilter]);

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
  // Member role is scoped to leads assigned to themselves. Backend BFF
  // forces the assignee filter regardless, but we mirror it in the UI so
  // members don't see assignee/unassigned filters or bulk-assign for rows
  // they couldn't act on anyway. super_admin and other roles are unaffected.
  const companyRole = useMemo(() => {
    if (!account || !selectedCompany) return null;
    return getCompanyRoleForAccess(account.access, selectedCompany.id);
  }, [account, selectedCompany]);
  const isMemberRole = companyRole === "member" && !account?.access.isSuperAdmin;
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

  // displayLeads applies the campaign post-filter on the server-filtered
  // leads. Backend filters by status/source/assignee/q at SQL level
  // (cheap), but campaign lives in extra_data JSONB so we filter in JS.
  // Match by campaign_id first (Meta-attributed leads), fall back to
  // campaign_name for older payloads.
  const displayLeads = useMemo(() => {
    if (!campaignFilter) return leads;
    return leads.filter((lead) => {
      const extra = (lead.extraData ?? {}) as Record<string, unknown>;
      return (
        extra.campaign_id === campaignFilter ||
        extra.campaign_name === campaignFilter
      );
    });
  }, [leads, campaignFilter]);

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

  // Lazy full-company load for duplicate detection — only while the create/
  // edit modal is open (a rare action), so the common list view stays light.
  useEffect(() => {
    if (!selectedCompany?.id || !showLeadModal) {
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadCompanyLeads() {
      try {
        const all = await listLeads(companyId, {});
        if (!cancelled) {
          setCompanyLeads(all);
        }
      } catch {
        if (!cancelled) {
          setCompanyLeads([]);
        }
      }
    }

    void loadCompanyLeads();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id, showLeadModal]);

  // Server-side aggregates: tab badges, KPI cards, source filter, header total.
  useEffect(() => {
    if (!selectedCompany?.id) {
      setLeadStats(null);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadStats() {
      try {
        const stats = await getLeadStats(companyId, accountUserId);
        if (!cancelled) {
          setLeadStats(stats);
        }
      } catch {
        if (!cancelled) {
          setLeadStats(null);
        }
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id, accountUserId]);

  // Loads the visible list. Normal case: one server page (fast, indexed).
  // Campaign deep-link case: campaign lives in extra_data (not a SQL filter),
  // so we fall back to loading the full filtered set and post-filter by
  // campaign in displayLeads — pagination is disabled for that focused view.
  const loadLeadsView = useCallback(
    async (companyId: string): Promise<{ data: Lead[]; total: number; paged: boolean }> => {
      if (campaignFilter) {
        const all = await listLeads(companyId, leadFilters);
        return { data: all, total: all.length, paged: false };
      }
      const result = await listLeadsPage(companyId, leadFilters, {
        limit: LEADS_PAGE_SIZE,
        offset: page * LEADS_PAGE_SIZE,
      });
      return { data: result.data, total: result.total, paged: true };
    },
    [campaignFilter, leadFilters, page],
  );

  // Reset to the first page whenever the filter set (or campaign) changes.
  useEffect(() => {
    setPage(0);
  }, [leadFilters, campaignFilter]);

  useEffect(() => {
    if (!selectedCompany?.id) {
      setLeads([]);
      setLeadsTotal(0);
      setLeadsLoading(false);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadLeadList() {
      setLeadsLoading(true);
      setErrorMessage(null);
      try {
        const view = await loadLeadsView(companyId);

        if (!cancelled) {
          setLeads(view.data);
          setLeadsTotal(view.total);
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
  }, [selectedCompany?.id, loadLeadsView, t]);

  // Open the deep-linked lead's card once the list contains it. Fires once
  // per id (ref guard) so closing the drawer doesn't reopen it.
  useEffect(() => {
    if (!searchLeadId || openedDeepLinkLeadRef.current === searchLeadId) return;
    if (leads.some((lead) => lead.id === searchLeadId)) {
      openedDeepLinkLeadRef.current = searchLeadId;
      setSelectedLeadId(searchLeadId);
      setDrawerView("profile");
      setDrawerOpen(true);
    }
  }, [searchLeadId, leads]);

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
      new Set((leadStats?.sources ?? []).map((source) => source.trim()).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { label: t("leads.filters.allSources"), value: "all" },
      ...values.map((value) => ({ label: value, value })),
    ];
  }, [leadStats, t]);

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
        count: leadStats?.byStatus?.[status] ?? 0,
      })),
    [leadStats],
  );

  const assignedToMeCount = leadStats?.mine ?? 0;

  const customerLabel =
    selectedLead?.customerId
      ? customers.find((customer) => customer.id === selectedLead.customerId)?.name
      : undefined;

  // Warn (not block) when the lead being created/edited shares a phone or
  // email with an existing lead/customer in this workspace. companyLeads is
  // the full unfiltered set, so this catches duplicates outside the current
  // tab/filter too.
  const duplicateMatches = useMemo(() => {
    if (!showLeadModal) return [];
    return findDuplicateContacts({
      phone: leadForm.phone,
      email: leadForm.email,
      leads: companyLeads,
      customers,
      excludeLeadId: editingLeadId,
    }).slice(0, 5);
  }, [showLeadModal, leadForm.phone, leadForm.email, companyLeads, customers, editingLeadId]);

  // The campaign label of the lead being edited (null when it has no campaign
  // to key an auto-assign rule on). Gates the inline auto-assign toggle.
  const editingLeadCampaignLabel = useMemo(() => {
    if (!editingLeadId) return null;
    const lead = companyLeads.find((item) => item.id === editingLeadId);
    if (!lead || !leadHasCampaign(lead)) return null;
    return campaignLabelForLead(lead);
  }, [editingLeadId, companyLeads]);

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
    const [view, nextCustomers, nextMembers, nextStats] = await Promise.all([
      loadLeadsView(companyId).catch(() => ({ data: [] as Lead[], total: 0, paged: !campaignFilter })),
      listCustomers(companyId).catch(() => []),
      listCompanyMembers(companyId).catch(() => []),
      getLeadStats(companyId, accountUserId).catch(() => null),
    ]);

    setLeads(view.data);
    setLeadsTotal(view.total);
    setCustomers(nextCustomers);
    setMembers(nextMembers);
    if (nextStats) {
      setLeadStats(nextStats);
    }
    setSelectedLeadId((current) => {
      if (current && view.data.some((lead) => lead.id === current)) {
        return current;
      }
      return null;
    });
    return view.data;
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

  function openExistingFromDuplicate(match: DuplicateMatch) {
    // Customers have no drawer here; only jump for matched leads.
    if (match.kind !== "lead") return;
    closeLeadModal();
    setSelectedLeadId(match.id);
    setDrawerView("profile");
    setDrawerOpen(true);
  }

  async function handleSaveLead({ andSchedule = false }: { andSchedule?: boolean } = {}) {
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
      const editingLead = editingLeadId
        ? leads.find((lead) => lead.id === editingLeadId) ??
          companyLeads.find((lead) => lead.id === editingLeadId) ??
          null
        : null;
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
        extraData: editingLead?.extraData ?? {},
      };

      const savedLead = editingLeadId
        ? await updateLead(editingLeadId, payload)
        : await createLead(payload);

      // Inline follow-up: when the rep marks a lead "contacted" and picks a
      // preset, drop a scheduled call on the calendar so it surfaces in the
      // dashboard "today's calls" panel. Best-effort — the lead is already
      // saved, so a calendar hiccup must not fail the primary action.
      if (leadForm.status === "contacted" && leadForm.followUpPreset) {
        let startAt: string | null;
        if (leadForm.followUpPreset === "custom") {
          const picked = leadForm.followUpAt ? new Date(leadForm.followUpAt) : null;
          startAt = picked && !Number.isNaN(picked.getTime()) ? picked.toISOString() : null;
        } else {
          startAt = computeFollowUpDate(leadForm.followUpPreset);
        }
        if (startAt) {
          try {
            await createCalendarEvent({
              companyId: assignment.company.id,
              title: t("leads.followUp.eventTitle", {
                name: savedLead.name || t("leads.fallback.lead"),
              }),
              description: "",
              eventType: "call",
              status: "scheduled",
              startAt,
              allDay: false,
              assigneeUserId: assignment.assigneeUserId,
              assigneeUserName: assignment.assigneeUserName,
              linkedEntityType: "lead",
              linkedEntityId: savedLead.id,
              location: "",
              meetingUrl: "",
              reminderMinutesBefore: 30,
            });
            // Mirror the follow-up onto the lead so lists/cards can show it.
            await updateLead(savedLead.id, { nextFollowUpAt: startAt });
          } catch {
            // Non-critical; surface nothing and keep the save successful.
          }
        }
      }

      // Inline campaign auto-assign: when editing a campaign lead with a manual
      // assignee and the toggle ticked, persist a campaign -> rep rule and
      // backfill existing unassigned leads. Best-effort; never fails the save.
      let autoAssignedCount: number | null = null;
      if (
        leadForm.autoAssignCampaign &&
        editingLead &&
        leadHasCampaign(editingLead) &&
        assignment.assignmentMethod === "manual" &&
        assignment.assigneeUserId
      ) {
        try {
          const result = await saveCampaignRuleAndBackfill({
            company: assignment.company,
            campaignKey: leadCampaignKey(editingLead),
            label: campaignLabelForLead(editingLead),
            userId: assignment.assigneeUserId,
            userName: assignment.assigneeUserName,
            leads: companyLeads,
          });
          updateCompanyState(result.company);
          autoAssignedCount = result.assigned;
        } catch {
          // Non-critical; the lead itself is already saved.
        }
      }

      await reloadReferenceData(assignment.company.id);
      setSelectedLeadId(savedLead.id);
      setSuccessMessage(
        autoAssignedCount !== null
          ? t("leads.autoAssignCampaign.applied", { count: autoAssignedCount })
          : editingLeadId
            ? t("leads.success.updated")
            : t("leads.success.created"),
      );
      closeLeadModal();

      if (andSchedule) {
        await scheduleLead(savedLead);
        return;
      }
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

  // Archive replaces delete. The lead is preserved and an admin can restore
  // it from the archived-leads view; nothing is destroyed here.
  async function handleArchiveLead() {
    if (!pendingDeleteLead || !selectedCompany) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await archiveLeadRequest(pendingDeleteLead.id);
      const nextLeads = await reloadReferenceData(selectedCompany.id);
      if (selectedLeadId === pendingDeleteLead.id) {
        setSelectedLeadId(nextLeads[0]?.id ?? null);
        setDrawerOpen(false);
      }
      setPendingDeleteLead(null);
      setSuccessMessage(t("leads.success.archived"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.errors.archiveLead"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkArchive() {
    if (!selectedCompany || selectedIds.size === 0) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    // Defense in depth: even if a stale selection survived a filter
    // change, only archive leads currently visible in the table.
    // Belt-and-braces with the visible-aware toggleAll above.
    const visibleIds = new Set(displayLeads.map((l) => l.id));
    const ids = Array.from(selectedIds).filter((id) => visibleIds.has(id));
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await archiveLeadRequest(id);
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }
    await reloadReferenceData(selectedCompany.id);
    setSelectedIds(new Set());
    setPendingBulkDelete(false);
    if (failed.length === 0) {
      setSuccessMessage(t("leads.success.bulkArchived", { count: succeeded.length }));
    } else if (succeeded.length === 0) {
      setErrorMessage(t("leads.errors.bulkArchiveFailed", { count: failed.length }));
    } else {
      setSuccessMessage(
        t("leads.success.bulkArchivePartial", {
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

    // Same visible-only safety as handleBulkDelete: only act on rows the
    // user can currently see in the table. Stale selection (e.g. from
    // before a filter change) is silently dropped.
    const rows = displayLeads.filter((lead) => selectedIds.has(lead.id));
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
      await promoteToContactedIfNew(selectedLead);
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

  function handleBulkExportPdf() {
    if (selectedIds.size === 0) return;
    // Defer the actual download to the options modal so the user can
    // pick whether to include comments (which costs one /comments call
    // per selected lead).
    setPdfIncludeComments(false);
    setShowPdfOptions(true);
  }

  async function runBulkExportPdf({ includeComments }: { includeComments: boolean }) {
    const rows = leads.filter((lead) => selectedIds.has(lead.id));
    if (rows.length === 0) {
      setShowPdfOptions(false);
      return;
    }
    setPdfExporting(true);
    try {
      const { downloadLeadPdf } = await import("@/lib/leads/pdf-export");

      let commentsByLeadId: Map<string, LeadComment[]> | undefined;
      if (includeComments) {
        // Fetch in parallel; one failed lead must not block the rest of
        // the export — fall back to an empty list for that lead and let
        // the PDF render the localized "no comments" placeholder.
        const entries = await Promise.all(
          rows.map(async (lead) => {
            try {
              const comments = await listLeadComments(lead.id);
              return [lead.id, comments] as const;
            } catch {
              return [lead.id, [] as LeadComment[]] as const;
            }
          }),
        );
        commentsByLeadId = new Map(entries);
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadLeadPdf(rows, `leads-${stamp}.pdf`, t as never, locale, {
        includeComments,
        commentsByLeadId,
      });
      setSuccessMessage(t("leads.success.exported", { count: rows.length }));
      setShowPdfOptions(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("leads.errors.exportPdf"),
      );
    } finally {
      setPdfExporting(false);
    }
  }

  async function promoteToContactedIfNew(lead: Lead) {
    if (lead.status !== "new") {
      return;
    }
    try {
      await updateLead(lead.id, { status: "contacted" });
    } catch {
      // Promotion is a non-critical follow-up to the user's primary action; surface nothing.
    }
  }

  async function scheduleLead(lead: Lead) {
    if (!selectedCompany) {
      return;
    }

    await promoteToContactedIfNew(lead);

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
    // CRITICAL: select-all must reflect what the user SEES (displayLeads
    // after the campaign filter), not the underlying server-filtered set.
    // Otherwise a campaign-scoped view's "select all" silently picks up
    // hidden rows and bulk delete wipes out leads the user can't see.
    // Lost real data once because of this — keep this comment as a
    // tripwire if anyone replaces displayLeads with leads here.
    setSelectedIds((current) => {
      const visibleIds = displayLeads.map((l) => l.id);
      const allVisibleSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => current.has(id));
      if (allVisibleSelected) {
        // Toggle off only the visible ones (preserve any selection
        // the user had on rows hidden by a previous filter).
        const next = new Set(current);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(current);
      for (const id of visibleIds) next.add(id);
      return next;
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
      <LeadHeader companyName={companyName} leadCount={leadStats?.total ?? 0} />

      {companyRole === "owner" && selectedCompany ? (
        <div className="flex flex-wrap justify-end gap-4">
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
            href={`/dashboard/leads/archived?${new URLSearchParams({
              company: selectedCompany.id,
              ...(companyName ? { companyName } : {}),
            }).toString()}`}
          >
            <Archive aria-hidden="true" className="h-4 w-4" />
            {t("leads.archived.openButton")}
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
            href={`/dashboard/audit?${new URLSearchParams({
              company: selectedCompany.id,
              ...(companyName ? { companyName } : {}),
            }).toString()}`}
          >
            <History aria-hidden="true" className="h-4 w-4" />
            {t("audit.openButton")}
          </Link>
        </div>
      ) : null}

      <LeadKpiStrip stats={leadStats} loading={companiesLoading || leadsLoading} />

      {errorMessage && !showLeadModal ? (
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
              hideAssignedToMe={isMemberRole}
              onChange={handleStatusTabChange}
              totalCount={leadStats?.total ?? 0}
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
              restrictedToSelf={isMemberRole}
              searchQuery={searchQuery}
              showOnlyUnassigned={showOnlyUnassigned}
              sourceFilter={sourceFilter}
              sourceOptions={sourceOptions}
            />
          </div>

          {campaignFilter && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--accent-soft)] px-4 py-2 text-sm sm:px-5">
              <span className="text-[var(--accent-strong)]">
                {t("leads.filters.byCampaign", { name: campaignFilter })}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("leads.filters.byCampaignCount", {
                  shown: displayLeads.length,
                  total: leads.length,
                })}
              </span>
              <button
                className="ml-auto rounded-full border border-[var(--accent-strong)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)] hover:bg-[var(--accent)] hover:text-white"
                onClick={() => setCampaignFilter("")}
                type="button"
              >
                {t("leads.filters.clearCampaign")}
              </button>
            </div>
          )}

          <LeadTable
            activeLeadId={drawerOpen ? selectedLeadId : null}
            aiEnabled={aiEnabled}
            leads={displayLeads}
            loading={companiesLoading || leadsLoading}
            onAIScoreClick={handleAIClick}
            onOpenRowMenu={openRowMenu}
            onRowClick={handleRowClick}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            selectedIds={selectedIds}
          />

          {!campaignFilter && leadsTotal > LEADS_PAGE_SIZE ? (
            <LeadPager
              disabled={leadsLoading}
              offset={page * LEADS_PAGE_SIZE}
              onNext={() => setPage((p) => p + 1)}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              pageSize={LEADS_PAGE_SIZE}
              total={leadsTotal}
            />
          ) : null}
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
              void scheduleLead(rowMenu.lead);
              setRowMenu(null);
            }}
          />
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <RowMenuItem
            icon={<Archive className="h-4 w-4" aria-hidden="true" />}
            label={t("leads.rowMenu.archive")}
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
        assignableMembersCount={isMemberRole ? 0 : assignableMembers.length}
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
        canAssign={!isMemberRole && assignableMembers.length > 0}
        count={selectedIds.size}
        onAssign={() => setShowBulkAssignModal(true)}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setPendingBulkDelete(true)}
        onExport={handleBulkExport}
        onExportPdf={handleBulkExportPdf}
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
          campaignAutoAssignLabel={editingLeadCampaignLabel}
          duplicateMatches={duplicateMatches}
          editingLeadId={editingLeadId}
          errorMessage={errorMessage}
          leadForm={leadForm}
          onClose={closeLeadModal}
          onLeadFormChange={(updater) => setLeadForm((current) => updater(current))}
          onOpenExisting={openExistingFromDuplicate}
          onSave={() => void handleSaveLead()}
          onSaveAndSchedule={() => void handleSaveLead({ andSchedule: true })}
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
        <LeadArchiveModal
          lead={pendingDeleteLead}
          onClose={() => setPendingDeleteLead(null)}
          onConfirm={handleArchiveLead}
          saving={saving}
        />
      ) : null}

      {pendingBulkDelete ? (
        <BulkArchiveConfirmModal
          count={selectedIds.size}
          onClose={() => setPendingBulkDelete(false)}
          onConfirm={() => void handleBulkArchive()}
          saving={saving}
        />
      ) : null}

      {showPdfOptions ? (
        <PdfExportOptionsModal
          count={selectedIds.size}
          exporting={pdfExporting}
          includeComments={pdfIncludeComments}
          onClose={() => {
            if (pdfExporting) return;
            setShowPdfOptions(false);
          }}
          onConfirm={() =>
            void runBulkExportPdf({ includeComments: pdfIncludeComments })
          }
          onIncludeCommentsChange={setPdfIncludeComments}
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

function BulkArchiveConfirmModal({
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
          {t("leads.bulkArchive.title", { count })}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          {t("leads.bulkArchive.description")}
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
            {saving ? t("leads.bulkArchive.archiving") : t("leads.bulkArchive.confirm", { count })}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadPager({
  offset,
  pageSize,
  total,
  disabled,
  onPrev,
  onNext,
}: Readonly<{
  offset: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
}>) {
  const t = useTranslations();
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + pageSize, total);
  const currentPage = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;

  const buttonClass =
    "inline-flex h-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="text-xs text-[var(--text-tertiary)]">
        {t("pagination.showing", { from, to, total })}
      </span>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          className={buttonClass}
          disabled={disabled || !canPrev}
          onClick={onPrev}
          type="button"
        >
          {t("pagination.previous")}
        </button>
        <span className="whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">
          {t("pagination.page", { page: currentPage, pages: totalPages })}
        </span>
        <button
          className={buttonClass}
          disabled={disabled || !canNext}
          onClick={onNext}
          type="button"
        >
          {t("pagination.next")}
        </button>
      </div>
    </div>
  );
}

function PdfExportOptionsModal({
  count,
  exporting,
  includeComments,
  onClose,
  onConfirm,
  onIncludeCommentsChange,
}: Readonly<{
  count: number;
  exporting: boolean;
  includeComments: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onIncludeCommentsChange: (value: boolean) => void;
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
          {t("leads.pdf.options.title")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          {t("leads.pdf.options.description", { count })}
        </p>
        <label
          className="mt-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-secondary)]"
        >
          <input
            checked={includeComments}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent-primary)]"
            disabled={exporting}
            onChange={(event) => onIncludeCommentsChange(event.target.checked)}
            type="checkbox"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium text-[var(--text-primary)]">
              {t("leads.pdf.options.includeComments")}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {t("leads.pdf.options.includeCommentsHint")}
            </span>
          </span>
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
            disabled={exporting}
            onClick={onClose}
            type="button"
          >
            {t("common.cancel")}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--text-primary)] px-5 text-sm font-medium text-[var(--surface)] transition hover:opacity-90 disabled:opacity-50"
            disabled={exporting}
            onClick={onConfirm}
            type="button"
          >
            {exporting
              ? t("leads.pdf.options.exporting")
              : t("leads.pdf.options.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
