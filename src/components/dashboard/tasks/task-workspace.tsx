"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { getAccountProfile } from "@/lib/account/client";
import {
  CompanyMembershipClientError,
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import {
  CRMClientError,
  createTask,
  deleteTask,
  listCompanies,
  listTasks,
  updateTask,
  type Company,
  type Task,
  type TaskResponseStatus,
  type TaskStatus,
} from "@/lib/crm/client";

import { TaskCreateModal } from "./task-create-modal";

type TicketGroup = {
  id: string;
  title: string;
  note: string;
  dueDate: string;
  createdAt: string;
  createdByUserName: string;
  createdByUserId: string;
  assignmentScope: "individual" | "broadcast";
  recipientCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  tasks: Task[];
  assigneeLabel: string;
  hasActiveTask: boolean;
};

function formatDate(value: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function responseBadgeClasses(status: TaskResponseStatus) {
  switch (status) {
    case "accepted":
      return "border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] text-[var(--signal-green)]";
    case "rejected":
      return "border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] text-[var(--signal-red)]";
    default:
      return "border-[color-mix(in_srgb,_var(--signal-amber)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] text-[#92400e]";
  }
}

function taskStatusBadgeClasses(status: TaskStatus) {
  switch (status) {
    case "done":
      return "border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] text-[var(--signal-green)]";
    case "in_progress":
      return "border-[color-mix(in_srgb,_var(--accent)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--accent)_10%,_var(--surface))] text-[var(--accent-strong)]";
    case "canceled":
      return "border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] text-[var(--signal-red)]";
    default:
      return "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)]";
  }
}

export function TaskWorkspace() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName") ?? "";

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"individual" | "everyone">(
    "individual",
  );
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [myTaskFilter, setMyTaskFilter] = useState<
    "accepted" | "in_progress" | "done" | "all"
  >("accepted");

  useEffect(() => {
    setActiveCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadBase() {
      setErrorMessage(null);
      try {
        const [nextAccount, nextCompanies] = await Promise.all([
          getAccountProfile(),
          listCompanies(),
        ]);

        if (!cancelled) {
          setAccount(nextAccount);
          setCompanies(nextCompanies);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError
              ? error.message
              : t("tasks.errors.loadWorkspace"),
          );
        }
      }
    }

    void loadBase();
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

  const companyName =
    selectedCompany?.name ?? searchCompanyName ?? t("tasks.selectedCompanyFallback");

  async function reloadWorkspace(companyId: string) {
    const [nextTasks, nextMembers] = await Promise.all([
      listTasks({ companyId }),
      listCompanyMembers(companyId).catch((error) => {
        if (error instanceof CompanyMembershipClientError) {
          return [];
        }
        throw error;
      }),
    ]);

    setTasks(nextTasks);
    setMembers(nextMembers);
  }

  useEffect(() => {
    const companyId = selectedCompany?.id ?? "";
    if (!companyId) {
      setTasks([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCompanyWorkspace() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [nextTasks, nextMembers] = await Promise.all([
          listTasks({ companyId }),
          listCompanyMembers(companyId).catch((error) => {
            if (error instanceof CompanyMembershipClientError) {
              return [];
            }
            throw error;
          }),
        ]);

        if (!cancelled) {
          setTasks(nextTasks);
          setMembers(nextMembers);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError
              ? error.message
              : t("tasks.errors.loadTasks"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCompanyWorkspace();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id]);

  const assignableMembers = useMemo(
    () => members.filter((member) => member.role !== "viewer"),
    [members],
  );

  useEffect(() => {
    if (assignmentMode === "everyone") {
      setAssigneeUserId("");
      return;
    }

    if (assignableMembers.length === 0) {
      setAssigneeUserId("");
      return;
    }

    setAssigneeUserId((current) =>
      assignableMembers.some((member) => member.userId === current)
        ? current
        : assignableMembers[0].userId,
    );
  }, [assignableMembers, assignmentMode]);

  const myTasks = useMemo(() => {
    if (!account) {
      return [];
    }
    return tasks.filter(
      (task) =>
        task.assigneeUserId === account.userId &&
        task.responseStatus === "accepted",
    );
  }, [account, tasks]);

  const visibleRelevantTasks = useMemo(() => {
    if (!account) {
      return [];
    }

    return tasks.filter(
      (task) =>
        task.createdByUserId === account.userId ||
        task.assigneeUserId === account.userId,
    );
  }, [account, tasks]);

  const filteredMyTasks = useMemo(() => {
    switch (myTaskFilter) {
      case "in_progress":
        return myTasks.filter(
          (task) => task.status === "in_progress",
        );
      case "done":
        return myTasks.filter((task) => task.status === "done");
      case "all":
        return myTasks;
      default:
        return myTasks.filter((task) => task.status === "open");
    }
  }, [myTaskFilter, myTasks]);

  const openTicketGroups = useMemo<TicketGroup[]>(() => {
    const groups = new Map<string, Task[]>();

    for (const task of visibleRelevantTasks) {
      const key =
        task.assignmentScope === "broadcast" && task.broadcastGroupId
          ? task.broadcastGroupId
          : task.id;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }

    return [...groups.entries()]
      .map(([groupId, groupTasks]) => {
        const [firstTask] = groupTasks;
        const acceptedCount = groupTasks.filter(
          (task) => task.responseStatus === "accepted",
        ).length;
        const rejectedCount = groupTasks.filter(
          (task) => task.responseStatus === "rejected",
        ).length;
        const pendingCount = groupTasks.filter(
          (task) => task.responseStatus === "pending",
        ).length;
        const hasOpenTicket = groupTasks.some(
          (task) =>
            task.responseStatus === "pending" &&
            task.status !== "done" &&
            task.status !== "canceled",
        );

        return {
          id: groupId,
          title: firstTask.title,
          note: firstTask.note,
          dueDate: firstTask.dueDate,
          createdAt: firstTask.createdAt,
          createdByUserName: firstTask.createdByUserName,
          createdByUserId: firstTask.createdByUserId,
          assignmentScope: firstTask.assignmentScope,
          recipientCount: groupTasks.length,
          acceptedCount,
          rejectedCount,
          pendingCount,
          tasks: groupTasks,
          assigneeLabel:
            firstTask.assignmentScope === "broadcast"
              ? t("tasks.teammatesCount", { count: groupTasks.length })
              : firstTask.assigneeUserName || t("tasks.unassigned"),
          hasActiveTask: hasOpenTicket,
        };
      })
      .filter((group) => group.hasActiveTask)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [visibleRelevantTasks]);

  const summary = useMemo(
    () => ({
      openTickets: openTicketGroups.length,
      myPending: tasks.filter(
        (task) =>
          account &&
          task.assigneeUserId === account.userId &&
          task.responseStatus === "pending",
      ).length,
      inProgress: myTasks.filter((task) => task.status === "in_progress").length,
      done: myTasks.filter((task) => task.status === "done").length,
    }),
    [account, myTasks, openTicketGroups.length, tasks],
  );

  async function handleCreateTask() {
    if (!selectedCompany) {
      return;
    }

    const title = taskTitle.trim();
    if (!title) {
      setErrorMessage(t("tasks.errors.titleRequired"));
      return;
    }

    const targetMembers =
      assignmentMode === "everyone"
        ? assignableMembers
        : assignableMembers.filter((member) => member.userId === assigneeUserId);

    if (targetMembers.length === 0) {
      setErrorMessage(t("tasks.errors.noEligibleTeammate"));
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const broadcastGroupId =
        assignmentMode === "everyone" ? crypto.randomUUID() : undefined;

      await Promise.all(
        targetMembers.map((member) =>
          createTask({
            companyId: selectedCompany.id,
            title,
            note: taskNote,
            dueDate: taskDueDate,
            status: "open",
            responseStatus: "pending",
            assignmentScope:
              assignmentMode === "everyone" ? "broadcast" : "individual",
            assigneeUserId: member.userId,
            assigneeUserName: member.displayName || member.email,
            broadcastGroupId,
            extraData: {},
          }),
        ),
      );

      await reloadWorkspace(selectedCompany.id);
      setTaskTitle("");
      setTaskNote("");
      setTaskDueDate("");
      setAssignmentMode("individual");
      setShowCreateModal(false);
      setSuccessMessage(
        assignmentMode === "everyone"
          ? t("tasks.success.publishedTeam")
          : t("tasks.success.assigned"),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("tasks.errors.publish"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTaskAction(taskId: string, patch: Parameters<typeof updateTask>[1]) {
    if (!selectedCompany) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await updateTask(taskId, patch);
      await reloadWorkspace(selectedCompany.id);
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("tasks.errors.update"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(group: TicketGroup) {
    if (!selectedCompany || !account) {
      return;
    }

    const isCreator = group.createdByUserId === account.userId;
    if (!isCreator) {
      setErrorMessage(t("tasks.errors.onlyCreatorCanDelete"));
      return;
    }

    const isBroadcast = group.assignmentScope === "broadcast";
    const confirmed = window.confirm(
      isBroadcast
        ? t("tasks.confirm.deleteBroadcast")
        : t("tasks.confirm.delete"),
    );
    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await Promise.all(group.tasks.map((task) => deleteTask(task.id)));
      await reloadWorkspace(selectedCompany.id);
      setSuccessMessage(
        isBroadcast
          ? t("tasks.success.deletedBroadcast")
          : t("tasks.success.deleted"),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("tasks.errors.delete"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
            {t("tasks.title")}
          </h1>

          <button
            className="rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-90 disabled:opacity-50"
            disabled={!selectedCompany || saving}
            onClick={() => setShowCreateModal(true)}
            type="button"
          >
            {t("tasks.actions.publish")}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {t("tasks.summary.company")}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{companyName}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {t("tasks.summary.openTickets")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{summary.openTickets}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {t("tasks.summary.myPending")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{summary.myPending}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {t("tasks.summary.inProgressDone")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {summary.inProgress} / {summary.done}
            </p>
          </div>
        </div>
      </section>

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

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                {t("tasks.openTickets.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {t("tasks.openTickets.heading")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-tertiary)]">
                {t("tasks.openTickets.description")}
              </p>
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {t("tasks.activeCount", { count: summary.openTickets })}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
                {t("tasks.loading")}
              </div>
            ) : openTicketGroups.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
                {t("tasks.empty.openTickets")}
              </div>
            ) : (
              openTicketGroups.map((group) => (
                <article
                  className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                  key={group.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-[var(--text-primary)]">
                        {group.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {group.note || t("tasks.noExtraNotes")}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {group.assignmentScope === "broadcast" ? t("tasks.scope.everyone") : t("tasks.scope.individual")}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {t("tasks.fields.assignedTo")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {group.assigneeLabel}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {t("tasks.fields.due")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {formatDate(group.dueDate, t("tasks.noDueDate"))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-[color-mix(in_srgb,_var(--signal-amber)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] px-2.5 py-1 text-[#92400e]">
                      {t("tasks.responseStatus.pending")} {group.pendingCount}
                    </span>
                    <span className="rounded-full border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-2.5 py-1 text-[var(--signal-green)]">
                      {t("tasks.responseStatus.accepted")} {group.acceptedCount}
                    </span>
                    <span className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-2.5 py-1 text-[var(--signal-red)]">
                      {t("tasks.responseStatus.rejected")} {group.rejectedCount}
                    </span>
                  </div>

                  {account ? (
                    (() => {
                      const pendingTaskForUser = group.tasks.find(
                        (task) =>
                          task.assigneeUserId === account.userId &&
                          task.responseStatus === "pending",
                      );

                      if (!pendingTaskForUser) {
                        return null;
                      }

                      return (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                          <button
                            className="rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            disabled={saving}
                            onClick={() =>
                              void handleTaskAction(pendingTaskForUser.id, {
                                responseStatus: "accepted",
                              })
                            }
                            type="button"
                          >
                            {t("tasks.actions.accept")}
                          </button>
                          <button
                            className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-1.5 text-sm font-semibold text-[var(--signal-red)] transition hover:border-[color-mix(in_srgb,_var(--signal-red)_55%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:opacity-50"
                            disabled={saving}
                            onClick={() =>
                              void handleTaskAction(pendingTaskForUser.id, {
                                responseStatus: "rejected",
                              })
                            }
                            type="button"
                          >
                            {t("tasks.actions.reject")}
                          </button>
                        </div>
                      );
                    })()
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {t("tasks.publishedBy", {
                        author: group.createdByUserName || group.createdByUserId || t("tasks.systemUser"),
                        date: formatDate(group.createdAt, t("tasks.noDueDate")),
                      })}
                    </p>

                    {account && group.createdByUserId === account.userId ? (
                      <button
                        className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-1.5 text-sm font-semibold text-[var(--signal-red)] transition hover:border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={saving}
                        onClick={() => void handleDeleteGroup(group)}
                        type="button"
                      >
                        {t("tasks.actions.delete")}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                {t("tasks.myTasks.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {t("tasks.myTasks.heading")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-tertiary)]">
                {t("tasks.myTasks.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["accepted", t("tasks.filter.open")],
                ["in_progress", t("tasks.filter.inProgress")],
                ["done", t("tasks.filter.done")],
                ["all", t("tasks.filter.all")],
              ].map(([value, label]) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    myTaskFilter === value
                      ? "bg-[var(--text-primary)] text-white"
                      : "border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  }`}
                  key={value}
                  onClick={() =>
                    setMyTaskFilter(
                      value as "accepted" | "in_progress" | "done" | "all",
                    )
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
                {t("tasks.loadingMy")}
              </div>
            ) : filteredMyTasks.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
                {t("tasks.empty.filtered")}
              </div>
            ) : (
              filteredMyTasks.map((task) => (
                <article
                  className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                  key={task.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-[var(--text-primary)]">
                        {task.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {task.note || t("tasks.noExtraNotes")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${responseBadgeClasses(
                          task.responseStatus,
                        )}`}
                      >
                        {t(`tasks.responseStatus.${task.responseStatus}`)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${taskStatusBadgeClasses(
                          task.status,
                        )}`}
                      >
                        {t(`tasks.status.${task.status}`)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {t("tasks.fields.publishedBy")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {task.createdByUserName || task.createdByUserId || t("tasks.systemUser")}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {t("tasks.fields.due")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {formatDate(task.dueDate, t("tasks.noDueDate"))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                    {task.responseStatus === "accepted" && task.status === "open" ? (
                      <button
                        className="rounded-full border border-[color-mix(in_srgb,_var(--accent)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--accent)_10%,_var(--surface))] px-3 py-1.5 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,_var(--accent)_18%,_var(--surface))] disabled:opacity-50"
                        disabled={saving}
                        onClick={() =>
                          void handleTaskAction(task.id, { status: "in_progress" })
                        }
                        type="button"
                      >
                        {t("tasks.actions.startWork")}
                      </button>
                    ) : null}

                    {task.responseStatus === "accepted" &&
                    (task.status === "open" || task.status === "in_progress") ? (
                      <button
                        className="rounded-full border border-[color-mix(in_srgb,_var(--signal-green)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] px-3 py-1.5 text-sm font-semibold text-[var(--signal-green)] transition hover:border-[color-mix(in_srgb,_var(--signal-green)_55%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-green)_18%,_var(--surface))] disabled:opacity-50"
                        disabled={saving}
                        onClick={() => void handleTaskAction(task.id, { status: "done" })}
                        type="button"
                      >
                        {t("tasks.actions.markDone")}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {showCreateModal ? (
        <TaskCreateModal
          assigneeUserId={assigneeUserId}
          assignmentMode={assignmentMode}
          dueDate={taskDueDate}
          members={assignableMembers}
          note={taskNote}
          onAssigneeUserIdChange={setAssigneeUserId}
          onAssignmentModeChange={setAssignmentMode}
          onClose={() => setShowCreateModal(false)}
          onCreate={() => void handleCreateTask()}
          onDueDateChange={setTaskDueDate}
          onNoteChange={setTaskNote}
          onTitleChange={setTaskTitle}
          saving={saving}
          title={taskTitle}
        />
      ) : null}
    </div>
  );
}
