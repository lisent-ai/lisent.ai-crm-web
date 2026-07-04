import type { AuditEvent } from "@/lib/crm/client";

// Actions that have a localized label under audit.actions.*. Anything not in
// this set renders its raw action string (forward-compatible with new events
// before their labels are added).
export const KNOWN_AUDIT_ACTIONS = new Set<string>([
  "lead.created",
  "lead.updated",
  "lead.status_changed",
  "lead.assigned",
  "lead.reassigned",
  "lead.unassigned",
  "lead.note_added",
  "lead.note_edited",
  "lead.note_deleted",
  "lead.follow_up_set",
  "lead.follow_up_cleared",
  "lead.archived",
  "lead.unarchived",
  "lead.converted",
  "lead.ai_scored",
  // deal
  "deal.created",
  "deal.updated",
  "deal.stage_changed",
  "deal.note_added",
  "deal.deleted",
  // task
  "task.created",
  "task.updated",
  "task.status_changed",
  "task.deleted",
  // call
  "call.created",
  "call.updated",
  "call.deleted",
  // customer
  "customer.created",
  "customer.updated",
  "customer.deleted",
  // company
  "company.created",
  "company.updated",
  "company.deleted",
  // calendar event
  "calendar_event.created",
  "calendar_event.updated",
  "calendar_event.deleted",
  // announcement
  "announcement.created",
  "announcement.updated",
  "announcement.published",
  "announcement.deleted",
  "announcement.dismissed",
  // agency
  "agency.created",
  "agency.updated",
  "agency.deleted",
  "agency.imported",
  // import profile
  "import_profile.approved",
  "import_profile.applied",
  // sla
  "sla.rules_updated",
  "sla.breach_detected",
  // module access
  "module_access.updated",
  // integrations
  "integration.connected",
  "integration.disconnected",
  "integration.config_updated",
  "integration.token_rotated",
  "integration.secret_rotated",
  "integration.test_fired",
]);

export const KNOWN_ACTOR_TYPES = new Set<string>(["user", "system", "integration", "ai"]);

// Entity types with a localized label under audit.entityTypes.* ("sla" is
// label-hardcoded in auditEntityLabel — same in every language).
export const KNOWN_ENTITY_TYPES = [
  "lead",
  "deal",
  "customer",
  "task",
  "call",
  "company",
  "calendar_event",
  "announcement",
  "agency",
  "import_profile",
  "module_access",
  "integration",
  "sla",
] as const;

const KNOWN_ENTITY_TYPE_SET = new Set<string>(KNOWN_ENTITY_TYPES);

// Machine actor names (integration origins, background workers) mapped to a
// readable brand label. These are system identifiers, not user content, so a
// static map beats showing "partner_intranet" verbatim in every locale.
const MACHINE_ACTOR_LABELS: Record<string, string> = {
  partner_intranet: "Intranet",
  meta: "Meta",
  google_sheets: "Google Sheets",
  ai_qualifier: "AI Qualifier",
  ai_qualifier_webhook: "AI Qualifier",
  sla_scanner: "SLA",
};

// Payload fields rendered in the change-diff table with a localized label
// under audit.fields.*.
const KNOWN_CHANGE_FIELDS = new Set<string>([
  "name",
  "email",
  "phone",
  "notes",
  "source",
  "value",
]);

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function auditActionLabel(translate: Translate, action: string): string {
  return KNOWN_AUDIT_ACTIONS.has(action) ? translate(`audit.actions.${action}`) : action;
}

export function auditEntityLabel(translate: Translate, entityType: string): string {
  if (entityType === "sla") return "SLA";
  return KNOWN_ENTITY_TYPE_SET.has(entityType)
    ? translate(`audit.entityTypes.${entityType}`)
    : entityType;
}

export function auditActorLabel(translate: Translate, event: AuditEvent): string {
  const name = event.actorUserName?.trim();
  if (name) {
    if (event.actorType !== "user" && MACHINE_ACTOR_LABELS[name]) {
      return MACHINE_ACTOR_LABELS[name];
    }
    return name;
  }
  if (KNOWN_ACTOR_TYPES.has(event.actorType)) {
    return translate(`audit.actorType.${event.actorType}`);
  }
  return "—";
}

// The display name of the entity an event touched, snapshotted into the
// payload at write time (lead_name for lead.* events, name/title for others).
export function auditEntityName(event: AuditEvent): string {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  for (const key of ["lead_name", "name", "title", "customer_name"]) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const LEAD_STATUS_KEYS = new Set(["new", "contacted", "qualified", "disqualified", "lost", "converted"]);
const DEAL_STAGE_KEYS = new Set(["new", "qualified", "proposal", "negotiation", "won", "lost"]);
const TASK_STATUS_KEYS = new Set(["open", "in_progress", "done", "canceled"]);

function leadStatusLabel(translate: Translate, status: string): string {
  return LEAD_STATUS_KEYS.has(status) ? translate(`leads.status.${status}`) : status;
}

function dealStageLabel(translate: Translate, stage: string): string {
  return DEAL_STAGE_KEYS.has(stage) ? translate(`deals.stage.${stage}`) : stage;
}

function taskStatusLabel(translate: Translate, status: string): string {
  return TASK_STATUS_KEYS.has(status) ? translate(`tasks.status.${status}`) : status;
}

export type AuditChangeRow = { field: string; fieldLabel: string; from: string; to: string };

// Field-level diff rows from a lead.updated-style payload ({changes: {field:
// {from, to}}}). Empty array when the event carries no diff.
export function auditChangeRows(translate: Translate, event: AuditEvent): AuditChangeRow[] {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const changes = p.changes;
  if (!changes || typeof changes !== "object") return [];
  const rows: AuditChangeRow[] = [];
  for (const [field, raw] of Object.entries(changes as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const pair = raw as Record<string, unknown>;
    rows.push({
      field,
      fieldLabel: KNOWN_CHANGE_FIELDS.has(field) ? translate(`audit.fields.${field}`) : field,
      from: pair.from == null ? "" : String(pair.from),
      to: pair.to == null ? "" : String(pair.to),
    });
  }
  return rows;
}

function truncateDetail(value: string, max = 80): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

// A short human detail derived from the payload (e.g. status transition,
// assignee names, changed-field count). Shown inline next to the action label.
export function auditDetail(translate: Translate, event: AuditEvent): string {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (v == null ? "" : String(v));
  switch (event.action) {
    case "lead.status_changed": {
      const from = s(p.from);
      const to = s(p.to);
      if (from && to) return `${leadStatusLabel(translate, from)} → ${leadStatusLabel(translate, to)}`;
      return leadStatusLabel(translate, to || from);
    }
    case "deal.stage_changed": {
      const from = s(p.from);
      const to = s(p.to);
      if (from && to) return `${dealStageLabel(translate, from)} → ${dealStageLabel(translate, to)}`;
      return dealStageLabel(translate, to || from);
    }
    case "task.status_changed": {
      const from = s(p.from);
      const to = s(p.to);
      if (from && to) return `${taskStatusLabel(translate, from)} → ${taskStatusLabel(translate, to)}`;
      return taskStatusLabel(translate, to || from);
    }
    case "lead.assigned":
    case "lead.reassigned":
    case "lead.unassigned": {
      // Prefer the display-name snapshot; older rows only carry user ids.
      const from = s(p.from_name) || s(p.from);
      const to = s(p.to_name) || s(p.to);
      if (from && to) return `${from} → ${to}`;
      return to || from;
    }
    case "lead.updated":
    case "deal.updated": {
      const rows = auditChangeRows(translate, event);
      if (rows.length > 0) {
        return translate("audit.details.fieldsChanged", { count: rows.length });
      }
      return "";
    }
    case "lead.created": {
      const source = s(p.source);
      return source ? truncateDetail(source, 40) : "";
    }
    case "lead.converted": {
      const customer = s(p.customer_name);
      return customer ? truncateDetail(customer, 60) : "";
    }
    case "lead.note_added":
    case "lead.note_deleted": {
      const body = s(p.body);
      return body ? truncateDetail(body) : "";
    }
    case "lead.note_edited": {
      const to = s(p.to);
      return to ? truncateDetail(to) : "";
    }
    case "lead.ai_scored": {
      const score = s(p.ai_score);
      const prev = p.previous;
      const prevScore =
        prev && typeof prev === "object" ? s((prev as Record<string, unknown>).ai_score) : "";
      if (prevScore && score && prevScore !== score) return `${prevScore} → ${score}`;
      return score;
    }
    case "sla.breach_detected": {
      const rule = s(p.rule);
      return rule ? truncateDetail(rule, 60) : "";
    }
    default:
      return "";
  }
}

// Payload keys already folded into the summary line / entity name — the
// expanded panel's generic key/value list skips these to avoid repeating.
const PAYLOAD_KEYS_IN_SUMMARY = new Set<string>(["lead_name", "changes"]);

export type AuditPayloadRow = { key: string; value: string };

// Generic key/value rows for the expanded detail panel: every payload entry
// not already shown elsewhere, stringified compactly. The raw JSON view sits
// alongside for full fidelity.
export function auditPayloadRows(event: AuditEvent): AuditPayloadRow[] {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const rows: AuditPayloadRow[] = [];
  for (const [key, value] of Object.entries(p)) {
    if (PAYLOAD_KEYS_IN_SUMMARY.has(key)) continue;
    if (value == null || value === "") continue;
    rows.push({
      key,
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    });
  }
  return rows;
}

export function auditHasExpandableDetail(event: AuditEvent): boolean {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  return Object.keys(p).length > 0 || Boolean(event.requestId);
}
