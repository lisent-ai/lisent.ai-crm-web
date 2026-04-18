"use client";

import { useSearchParams } from "next/navigation";
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

function formatDate(value: string) {
  if (!value) {
    return "No due date";
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function taskStatusBadgeClasses(status: TaskStatus) {
  switch (status) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "canceled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function TaskWorkspace() {
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
              : "Failed to load the tasks workspace.",
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
    selectedCompany?.name ?? searchCompanyName ?? "Selected company";

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
              : "Failed to load tasks.",
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
              ? `${groupTasks.length} teammates`
              : firstTask.assigneeUserName || "Unassigned",
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
      setErrorMessage("Task title is required.");
      return;
    }

    const targetMembers =
      assignmentMode === "everyone"
        ? assignableMembers
        : assignableMembers.filter((member) => member.userId === assigneeUserId);

    if (targetMembers.length === 0) {
      setErrorMessage("Choose at least one eligible teammate for this task.");
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
          ? "Task published to the team."
          : "Task assigned successfully.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : "Failed to publish task.",
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
        error instanceof CRMClientError ? error.message : "Failed to update task.",
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
      setErrorMessage("Only the person who published this task can delete it.");
      return;
    }

    const isBroadcast = group.assignmentScope === "broadcast";
    const confirmed = window.confirm(
      isBroadcast
        ? "Delete this published team task for everyone who received it?"
        : "Delete this published task?",
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
          ? "The published team task was deleted."
          : "The published task was deleted.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : "Failed to delete task.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700/80">
              Tasks
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Tickets and my queue
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Publish lightweight tasks to a teammate or to the whole company. Each
              person can accept or reject their own copy, then move work forward.
            </p>
          </div>

          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#164e63)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:opacity-50"
            disabled={!selectedCompany || saving}
            onClick={() => setShowCreateModal(true)}
            type="button"
          >
            Publish task
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Company
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{companyName}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Open tickets
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.openTickets}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              My pending
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.myPending}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              In progress / done
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {summary.inProgress} / {summary.done}
            </p>
          </div>
        </div>
      </section>

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

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Open tickets
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Published work relevant to you
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Tasks still waiting for an answer from you or from recipients you assigned.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {summary.openTickets} active
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Loading tasks...
              </div>
            ) : openTicketGroups.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No published tickets yet. Create the first one for this company.
              </div>
            ) : (
              openTicketGroups.map((group) => (
                <article
                  className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(145deg,_#ffffff,_#f8fafc)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                  key={group.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-slate-950">
                        {group.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                        {group.note || "No extra notes added."}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {group.assignmentScope === "broadcast" ? "Everyone" : "Individual"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Assigned to
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {group.assigneeLabel}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Due
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {formatDate(group.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                      Pending {group.pendingCount}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      Accepted {group.acceptedCount}
                    </span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                      Rejected {group.rejectedCount}
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
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                          <button
                            className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            disabled={saving}
                            onClick={() =>
                              void handleTaskAction(pendingTaskForUser.id, {
                                responseStatus: "accepted",
                              })
                            }
                            type="button"
                          >
                            Accept
                          </button>
                          <button
                            className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50"
                            disabled={saving}
                            onClick={() =>
                              void handleTaskAction(pendingTaskForUser.id, {
                                responseStatus: "rejected",
                              })
                            }
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      );
                    })()
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-500">
                      Published by {group.createdByUserName || group.createdByUserId || "System"} on{" "}
                      {formatDate(group.createdAt)}
                    </p>

                    {account && group.createdByUserId === account.userId ? (
                      <button
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={saving}
                        onClick={() => void handleDeleteGroup(group)}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                My tasks
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Accepted work in your queue
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Tasks appear here only after you accept them.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["accepted", "Open"],
                ["in_progress", "In progress"],
                ["done", "Done"],
                ["all", "All"],
              ].map(([value, label]) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    myTaskFilter === value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
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
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Loading your tasks...
              </div>
            ) : filteredMyTasks.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No tasks matched this filter.
              </div>
            ) : (
              filteredMyTasks.map((task) => (
                <article
                  className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(145deg,_#ffffff,_#f8fafc)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                  key={task.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-slate-950">
                        {task.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                        {task.note || "No extra notes added."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${responseBadgeClasses(
                          task.responseStatus,
                        )}`}
                      >
                        {task.responseStatus}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${taskStatusBadgeClasses(
                          task.status,
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Published by
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {task.createdByUserName || task.createdByUserId || "System"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Due
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {formatDate(task.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                    {task.responseStatus === "accepted" && task.status === "open" ? (
                      <button
                        className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100 disabled:opacity-50"
                        disabled={saving}
                        onClick={() =>
                          void handleTaskAction(task.id, { status: "in_progress" })
                        }
                        type="button"
                      >
                        Start work
                      </button>
                    ) : null}

                    {task.responseStatus === "accepted" &&
                    (task.status === "open" || task.status === "in_progress") ? (
                      <button
                        className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50"
                        disabled={saving}
                        onClick={() => void handleTaskAction(task.id, { status: "done" })}
                        type="button"
                      >
                        Mark done
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
