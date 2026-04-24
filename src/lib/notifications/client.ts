"use client";

import {
  listDeals,
  listLeads,
  listTasks,
  type Deal,
  type Lead,
  type Task,
} from "@/lib/crm/client";

export type DashboardNotificationKind =
  | "task_pending"
  | "task_due"
  | "lead_assigned"
  | "deal_assigned";

export type DashboardNotification = {
  id: string;
  kind: DashboardNotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  entityId: string;
};

const READ_KEY_PREFIX = "lisent.crm.notifications.read.v1";
const ASSIGNMENT_LOOKBACK_DAYS = 7;
const DUE_SOON_DAYS = 3;

export async function listDashboardNotifications(input: {
  companyId: string;
  companyName: string;
  userId: string;
}): Promise<DashboardNotification[]> {
  if (!input.companyId.trim() || !input.userId.trim()) {
    return [];
  }

  const [tasks, leads, deals] = await Promise.all([
    listTasks({
      companyId: input.companyId,
      assigneeUserId: input.userId,
    }),
    listLeads(input.companyId, {
      assigneeUserId: input.userId,
    }),
    listDeals(input.companyId, {
      assigneeUserId: input.userId,
    }),
  ]);

  const notifications = [
    ...buildTaskNotifications(tasks, input.companyId, input.companyName),
    ...buildLeadNotifications(leads, input.companyId, input.companyName),
    ...buildDealNotifications(deals, input.companyId, input.companyName),
  ];

  return notifications
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 20);
}

export function readNotificationState(userId: string, companyId: string) {
  if (typeof window === "undefined" || !userId.trim()) {
    return {};
  }

  const key = buildReadStorageKey(userId, companyId);
  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, true>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeNotificationState(
  userId: string,
  companyId: string,
  state: Record<string, true>,
) {
  if (typeof window === "undefined" || !userId.trim()) {
    return;
  }

  const key = buildReadStorageKey(userId, companyId);
  window.localStorage.setItem(key, JSON.stringify(state));
}

function buildReadStorageKey(userId: string, companyId: string) {
  return `${READ_KEY_PREFIX}:${userId}:${companyId || "global"}`;
}

function buildTaskNotifications(
  tasks: Task[],
  companyId: string,
  companyName: string,
) {
  const now = Date.now();
  const soonThreshold = now + DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

  return tasks.flatMap((task) => {
    const href = buildWorkspaceHref("/dashboard/tasks", companyId, companyName);
    const notifications: DashboardNotification[] = [];

    if (task.responseStatus === "pending") {
      notifications.push({
        id: `task_pending:${task.id}:${task.createdAt}`,
        kind: "task_pending",
        title: "Task awaiting your response",
        body: task.title || "A teammate assigned a task to you.",
        href,
        createdAt: task.createdAt,
        entityId: task.id,
      });
    }

    if (
      task.responseStatus === "accepted" &&
      task.status !== "done" &&
      task.status !== "canceled" &&
      task.dueDate
    ) {
      const dueAt = new Date(task.dueDate).getTime();
      if (Number.isFinite(dueAt) && dueAt <= soonThreshold) {
        notifications.push({
          id: `task_due:${task.id}:${task.dueDate}`,
          kind: "task_due",
          title: dueAt < now ? "Task overdue" : "Task due soon",
          body: task.title || "One of your accepted tasks needs attention.",
          href,
          createdAt: task.dueDate,
          entityId: task.id,
        });
      }
    }

    return notifications;
  });
}

function buildLeadNotifications(
  leads: Lead[],
  companyId: string,
  companyName: string,
) {
  return leads
    .filter((lead) => wasRecentlyTouched(lead.updatedAt, ASSIGNMENT_LOOKBACK_DAYS))
    .map<DashboardNotification>((lead) => ({
      id: `lead_assigned:${lead.id}:${lead.updatedAt}`,
      kind: "lead_assigned",
      title: "Lead assigned to you",
      body: lead.name || lead.email || "A lead now needs your attention.",
      href: buildWorkspaceHref("/dashboard/leads", companyId, companyName),
      createdAt: lead.updatedAt || lead.createdAt,
      entityId: lead.id,
    }));
}

function buildDealNotifications(
  deals: Deal[],
  companyId: string,
  companyName: string,
) {
  return deals
    .filter((deal) => deal.stage !== "won" && deal.stage !== "lost")
    .filter((deal) => wasRecentlyTouched(deal.updatedAt, ASSIGNMENT_LOOKBACK_DAYS))
    .map<DashboardNotification>((deal) => ({
      id: `deal_assigned:${deal.id}:${deal.updatedAt}`,
      kind: "deal_assigned",
      title: "Deal assigned to you",
      body: deal.name || "A deal in your pipeline was updated.",
      href: buildWorkspaceHref("/dashboard/deals", companyId, companyName),
      createdAt: deal.updatedAt || deal.createdAt,
      entityId: deal.id,
    }));
}

function buildWorkspaceHref(pathname: string, companyId: string, companyName: string) {
  const query = new URLSearchParams();
  if (companyId) {
    query.set("company", companyId);
  }
  if (companyName) {
    query.set("companyName", companyName);
  }

  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function wasRecentlyTouched(iso: string, days: number) {
  if (!iso) {
    return false;
  }

  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) {
    return false;
  }

  const lookbackMs = days * 24 * 60 * 60 * 1000;
  return Date.now() - time <= lookbackMs;
}
