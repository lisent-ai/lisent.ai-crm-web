"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

import { CRMClientError, listCompanyAuditLog, type AuditEvent } from "@/lib/crm/client";
import {
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";
import {
  KNOWN_AUDIT_ACTIONS,
  KNOWN_ENTITY_TYPES,
  auditActionLabel,
  auditActorLabel,
  auditChangeRows,
  auditDetail,
  auditEntityLabel,
  auditEntityName,
  auditHasExpandableDetail,
  auditPayloadRows,
} from "@/lib/audit/format";
import { formatDateTime } from "@/components/dashboard/leads/lead-utils";

const PAGE_SIZE = 30;

type Translate = (key: string, params?: Record<string, string | number>) => string;

// Company-wide audit log (admin). Shows who did what, to which item, when —
// with per-row expandable detail (field diffs + full payload) and
// entity/action/actor filters. Server enforces owner/super_admin (403 →
// access-denied state).
export function AuditLogWorkspace() {
  const t = useTranslations();
  const translate = t as unknown as Translate;
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") ?? "";
  const companyName = searchParams.get("companyName") ?? "";

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const backHref = companyId
    ? `/dashboard/leads?${new URLSearchParams({ company: companyId, ...(companyName ? { companyName } : {}) }).toString()}`
    : "/dashboard/leads";

  useEffect(() => {
    if (!companyId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    listCompanyMembers(companyId)
      .then((next) => {
        if (!cancelled) setMembers(next);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Filter setters go through here so every filter change atomically jumps
  // back to page 1 and collapses the open row IN THE SAME RENDER — two
  // separate effects would fire one fetch with the stale offset and a second
  // with page 0, racing each other's responses.
  function applyFilterChange(apply: () => void) {
    apply();
    setPage(0);
    setExpandedId(null);
  }

  function handleEntityFilterChange(next: string) {
    applyFilterChange(() => {
      setEntityFilter(next);
      // Keep the action filter consistent when the entity filter narrows.
      setActionFilter((current) =>
        current !== "all" && next !== "all" && !current.startsWith(`${next}.`) ? "all" : current,
      );
    });
  }

  // A company switch invalidates member-scoped filters (the actor ids belong
  // to the previous company's roster).
  useEffect(() => {
    setEntityFilter("all");
    setActionFilter("all");
    setActorFilter("all");
    setPage(0);
    setExpandedId(null);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setEvents([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await listCompanyAuditLog(
          companyId,
          { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
          {
            entityType: entityFilter === "all" ? "" : entityFilter,
            action: actionFilter === "all" ? "" : actionFilter,
            // "type:<actor_type>" selects machine actors (AI, integrations,
            // system); anything else is a member's user id.
            actorUserId:
              actorFilter === "all" || actorFilter.startsWith("type:") ? "" : actorFilter,
            actorType: actorFilter.startsWith("type:") ? actorFilter.slice(5) : "",
          },
        );
        if (cancelled) return;
        setEvents(result.data);
        setTotal(result.total);
        setAccessDenied(false);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof CRMClientError && error.status === 403) {
          setAccessDenied(true);
          setEvents([]);
          setTotal(0);
        } else {
          setErrorMessage(error instanceof CRMClientError ? error.message : t("audit.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [companyId, page, entityFilter, actionFilter, actorFilter, t]);

  // Action options grouped by entity so same-named actions from different
  // entities (e.g. lead vs deal "Note added") stay distinguishable.
  const actionGroups = useMemo(() => {
    const groups = new Map<string, Array<{ value: string; label: string }>>();
    for (const action of KNOWN_AUDIT_ACTIONS) {
      const entity = action.split(".")[0] ?? "";
      if (entityFilter !== "all" && entity !== entityFilter) continue;
      const list = groups.get(entity) ?? [];
      list.push({ value: action, label: auditActionLabel(translate, action) });
      groups.set(entity, list);
    }
    return Array.from(groups.entries())
      .map(([entity, options]) => ({
        entity,
        entityLabel: auditEntityLabel(translate, entity),
        options: options.sort((left, right) => left.label.localeCompare(right.label)),
      }))
      .sort((left, right) => left.entityLabel.localeCompare(right.entityLabel));
  }, [entityFilter, translate]);

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;
  const btn =
    "inline-flex h-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40";
  const selectClass =
    "h-10 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("audit.backToLeads")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t("audit.title")}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-tertiary)]">{t("audit.subtitle")}</p>
      </div>

      {errorMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}

      {accessDenied ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {t("audit.accessDenied")}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t("audit.filters.entity")}
              className={selectClass}
              onChange={(event) => handleEntityFilterChange(event.target.value)}
              value={entityFilter}
            >
              <option value="all">{t("audit.filters.allEntities")}</option>
              {KNOWN_ENTITY_TYPES.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {auditEntityLabel(translate, entityType)}
                </option>
              ))}
            </select>
            <select
              aria-label={t("audit.filters.action")}
              className={selectClass}
              onChange={(event) =>
                applyFilterChange(() => setActionFilter(event.target.value))
              }
              value={actionFilter}
            >
              <option value="all">{t("audit.filters.allActions")}</option>
              {actionGroups.length === 1
                ? actionGroups[0].options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                : actionGroups.map((group) => (
                    <optgroup key={group.entity} label={group.entityLabel}>
                      {group.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </select>
            <select
              aria-label={t("audit.filters.actor")}
              className={selectClass}
              onChange={(event) =>
                applyFilterChange(() => setActorFilter(event.target.value))
              }
              value={actorFilter}
            >
              <option value="all">{t("audit.filters.allActors")}</option>
              {members.length > 0 ? (
                <optgroup label={t("audit.actorType.user")}>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName || member.email}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label={t("audit.filters.machineActors")}>
                <option value="type:ai">{t("audit.actorType.ai")}</option>
                <option value="type:integration">{t("audit.actorType.integration")}</option>
                <option value="type:system">{t("audit.actorType.system")}</option>
              </optgroup>
            </select>
            {entityFilter !== "all" || actionFilter !== "all" || actorFilter !== "all" ? (
              <button
                className="text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
                onClick={() =>
                  applyFilterChange(() => {
                    setEntityFilter("all");
                    setActionFilter("all");
                    setActorFilter("all");
                  })
                }
                type="button"
              >
                {t("audit.filters.reset")}
              </button>
            ) : null}
          </div>

          <section className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            {loading && events.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
                {t("audit.loading")}
              </div>
            ) : events.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
                {t("audit.empty")}
              </div>
            ) : (
              <div className={loading ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                        <th className="px-5 py-3 font-medium">{t("audit.columns.time")}</th>
                        <th className="px-5 py-3 font-medium">{t("audit.columns.actor")}</th>
                        <th className="px-5 py-3 font-medium">{t("audit.columns.action")}</th>
                        <th className="px-5 py-3 font-medium">{t("audit.columns.entity")}</th>
                        <th className="w-[56px] px-3 py-3" aria-label={t("audit.details.show")} />
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => {
                        const detail = auditDetail(translate, event);
                        const entityName = auditEntityName(event);
                        const expandable = auditHasExpandableDetail(event);
                        const expanded = expandedId === event.id;
                        return (
                          <Fragment key={event.id}>
                            <tr
                              className={`border-b border-[var(--border-subtle)] last:border-0 ${
                                expandable ? "cursor-pointer hover:bg-[var(--surface-subtle)]" : ""
                              } ${expanded ? "bg-[var(--surface-subtle)]" : ""}`}
                              onClick={() => {
                                if (expandable) setExpandedId(expanded ? null : event.id);
                              }}
                            >
                              <td className="whitespace-nowrap px-5 py-3 text-[var(--text-secondary)]">
                                {formatDateTime(event.createdAt)}
                              </td>
                              <td className="px-5 py-3 text-[var(--text-secondary)]">
                                {auditActorLabel(translate, event)}
                              </td>
                              <td className="px-5 py-3 text-[var(--text-primary)]">
                                {auditActionLabel(translate, event.action)}
                                {detail ? (
                                  <span className="text-[var(--text-tertiary)]"> · {detail}</span>
                                ) : null}
                              </td>
                              <td className="px-5 py-3 text-[var(--text-tertiary)]">
                                {auditEntityLabel(translate, event.entityType)}
                                {entityName ? (
                                  <span className="text-[var(--text-secondary)]"> · {entityName}</span>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 text-end">
                                {expandable ? (
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)]">
                                    {expanded ? (
                                      <ChevronUp aria-hidden="true" className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                                    )}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                            {expanded ? (
                              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] last:border-0">
                                <td colSpan={5} className="px-5 py-4">
                                  <AuditEventDetail event={event} translate={translate} />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="flex flex-col gap-3 p-4 md:hidden">
                  {events.map((event) => {
                    const detail = auditDetail(translate, event);
                    const entityName = auditEntityName(event);
                    const expandable = auditHasExpandableDetail(event);
                    const expanded = expandedId === event.id;
                    return (
                      <div
                        className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
                        key={event.id}
                      >
                        <button
                          className="w-full text-left"
                          disabled={!expandable}
                          onClick={() => setExpandedId(expanded ? null : event.id)}
                          type="button"
                        >
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {auditActionLabel(translate, event.action)}
                            {detail ? (
                              <span className="font-normal text-[var(--text-secondary)]"> · {detail}</span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                            {auditActorLabel(translate, event)} · {formatDateTime(event.createdAt)} ·{" "}
                            {auditEntityLabel(translate, event.entityType)}
                            {entityName ? ` · ${entityName}` : ""}
                          </p>
                        </button>
                        {expanded ? (
                          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                            <AuditEventDetail event={event} translate={translate} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {total > PAGE_SIZE ? (
                  <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {t("pagination.showing", { from, to, total })}
                    </span>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <button
                        className={btn}
                        disabled={loading || !canPrev}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        type="button"
                      >
                        {t("pagination.previous")}
                      </button>
                      <span className="whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">
                        {t("pagination.page", { page: page + 1, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) })}
                      </span>
                      <button
                        className={btn}
                        disabled={loading || !canNext}
                        onClick={() => setPage((p) => p + 1)}
                        type="button"
                      >
                        {t("pagination.next")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// Expanded per-event panel: entity reference, field-level diff table, the
// remaining payload entries, correlation id, and the raw JSON for full
// fidelity. Shared by the audit table and (via import) the lead timeline.
export function AuditEventDetail({
  event,
  translate,
}: Readonly<{ event: AuditEvent; translate: Translate }>) {
  const changeRows = auditChangeRows(translate, event);
  const payloadRows = auditPayloadRows(event);
  const entityName = auditEntityName(event);

  return (
    <div className="flex flex-col gap-3 text-sm">
      {event.entityId || entityName ? (
        <p className="text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">
            {translate("audit.details.entity")}:
          </span>{" "}
          {auditEntityLabel(translate, event.entityType)}
          {entityName ? ` · ${entityName}` : ""}
          {event.entityId ? (
            <span
              className="ms-2 rounded bg-[var(--surface-inset)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-tertiary)]"
              dir="ltr"
            >
              {event.entityId}
            </span>
          ) : null}
        </p>
      ) : null}

      {changeRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full max-w-2xl text-sm">
            <thead>
              <tr className="text-start text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                <th className="py-1.5 pe-4 text-start font-medium">{translate("audit.details.field")}</th>
                <th className="py-1.5 pe-4 text-start font-medium">{translate("audit.details.from")}</th>
                <th className="py-1.5 text-start font-medium">{translate("audit.details.to")}</th>
              </tr>
            </thead>
            <tbody>
              {changeRows.map((row) => (
                <tr className="border-t border-[var(--border-subtle)]" key={row.field}>
                  <td className="py-1.5 pe-4 font-medium text-[var(--text-secondary)]">
                    {row.fieldLabel}
                  </td>
                  <td className="whitespace-pre-wrap break-words py-1.5 pe-4 text-[var(--text-tertiary)]">
                    {row.from || "—"}
                  </td>
                  <td className="whitespace-pre-wrap break-words py-1.5 text-[var(--text-primary)]">
                    {row.to || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {payloadRows.length > 0 ? (
        <dl className="grid gap-1">
          {payloadRows.map((row) => (
            <div className="flex flex-wrap gap-2" key={row.key}>
              <dt className="font-mono text-xs text-[var(--text-tertiary)]">{row.key}</dt>
              <dd className="min-w-0 break-words text-xs text-[var(--text-secondary)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {event.requestId ? (
        <p className="text-xs text-[var(--text-tertiary)]">
          {translate("audit.details.requestId")}:{" "}
          <span className="font-mono" dir="ltr">{event.requestId}</span>
        </p>
      ) : null}

      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
          {translate("audit.details.rawPayload")}
        </summary>
        <pre
          className="mt-2 max-h-64 overflow-auto rounded-[var(--radius-card)] bg-[var(--surface-inset)] p-3 text-start font-mono text-[11px] leading-5 text-[var(--text-secondary)]"
          dir="ltr"
        >
          {JSON.stringify(event.payload ?? {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}
