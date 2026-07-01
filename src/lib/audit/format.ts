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
]);

export const KNOWN_ACTOR_TYPES = new Set<string>(["user", "system", "integration", "ai"]);

type Translate = (key: string) => string;

export function auditActionLabel(translate: Translate, action: string): string {
  return KNOWN_AUDIT_ACTIONS.has(action) ? translate(`audit.actions.${action}`) : action;
}

export function auditActorLabel(translate: Translate, event: AuditEvent): string {
  if (event.actorUserName?.trim()) return event.actorUserName;
  if (KNOWN_ACTOR_TYPES.has(event.actorType)) {
    return translate(`audit.actorType.${event.actorType}`);
  }
  return "—";
}

// A short human detail derived from the payload (e.g. status transition).
export function auditDetail(event: AuditEvent): string {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (v == null ? "" : String(v));
  switch (event.action) {
    case "lead.status_changed":
    case "lead.assigned":
    case "lead.reassigned":
    case "lead.unassigned": {
      const from = s(p.from);
      const to = s(p.to);
      if (from && to) return `${from} → ${to}`;
      return to || from;
    }
    case "lead.ai_scored":
      return s(p.ai_score);
    default:
      return "";
  }
}
