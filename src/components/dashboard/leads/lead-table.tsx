"use client";

import { useCallback, useMemo } from "react";
import { MoreHorizontal } from "lucide-react";

import type { Lead } from "@/lib/crm/client";

import { AIScoreChip } from "./lead-ai-insights";
import {
  formatAssignmentLabel,
  formatCurrency,
  formatSourceLabel,
  statusBadgeClasses,
} from "./lead-utils";

type LeadTableProps = {
  leads: Lead[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  onRowClick: (lead: Lead) => void;
  onOpenRowMenu: (lead: Lead, anchor: HTMLElement) => void;
  activeLeadId: string | null;
  aiEnabled: boolean;
};

export function LeadTable({
  leads,
  loading,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onRowClick,
  onOpenRowMenu,
  activeLeadId,
  aiEnabled,
}: Readonly<LeadTableProps>) {
  const allSelected = useMemo(
    () => leads.length > 0 && leads.every((l) => selectedIds.has(l.id)),
    [leads, selectedIds],
  );
  const indeterminate = useMemo(
    () => selectedIds.size > 0 && !allSelected,
    [allSelected, selectedIds.size],
  );

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              className="h-12 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-inset)]"
              key={i}
            />
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-tertiary)]">
        No leads match the current filters yet.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                <th className="w-[44px] px-4 py-3">
                  <HeaderCheckbox
                    checked={allSelected}
                    indeterminate={indeterminate}
                    onChange={onToggleAll}
                  />
                </th>
                <th className="w-[28%] px-3 py-3">Name</th>
                <th className="hidden w-[14%] px-3 py-3 lg:table-cell">Phone</th>
                <th className="w-[14%] px-3 py-3">Source</th>
                <th className="w-[12%] px-3 py-3">Status</th>
                <th className="w-[12%] px-3 py-3 text-right">Value</th>
                <th className="hidden w-[14%] px-3 py-3 lg:table-cell">Assignee</th>
                {aiEnabled && (
                  <th className="hidden w-[10%] px-3 py-3 xl:table-cell">AI</th>
                )}
                <th className="w-[52px] px-3 py-3" aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  activeLeadId={activeLeadId}
                  aiEnabled={aiEnabled}
                  key={lead.id}
                  lead={lead}
                  onOpenMenu={onOpenRowMenu}
                  onRowClick={onRowClick}
                  onToggle={onToggleOne}
                  selected={selectedIds.has(lead.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card stack */}
      <div className="flex flex-col divide-y divide-[var(--border-subtle)] md:hidden">
        {leads.map((lead) => (
          <LeadCard
            activeLeadId={activeLeadId}
            aiEnabled={aiEnabled}
            key={lead.id}
            lead={lead}
            onOpenMenu={onOpenRowMenu}
            onRowClick={onRowClick}
            onToggle={onToggleOne}
            selected={selectedIds.has(lead.id)}
          />
        ))}
      </div>
    </div>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: Readonly<{
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}>) {
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = indeterminate;
    },
    [indeterminate],
  );
  return (
    <input
      aria-label="Select all"
      checked={checked}
      className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
      onChange={onChange}
      ref={setRef}
      type="checkbox"
    />
  );
}

type RowCommonProps = {
  lead: Lead;
  selected: boolean;
  activeLeadId: string | null;
  aiEnabled: boolean;
  onToggle: (id: string) => void;
  onRowClick: (lead: Lead) => void;
  onOpenMenu: (lead: Lead, anchor: HTMLElement) => void;
};

function LeadRow({
  lead,
  selected,
  activeLeadId,
  aiEnabled,
  onToggle,
  onRowClick,
  onOpenMenu,
}: Readonly<RowCommonProps>) {
  const active = lead.id === activeLeadId;
  return (
    <tr
      aria-selected={active}
      className={`cursor-pointer border-b border-[var(--border-subtle)] text-sm transition last:border-b-0 ${
        active
          ? "bg-[var(--surface-inset)]"
          : "hover:bg-[var(--surface-subtle)]"
      }`}
      onClick={() => onRowClick(lead)}
    >
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <input
          aria-label={`Select ${lead.name || "lead"}`}
          checked={selected}
          className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
          onChange={() => onToggle(lead.id)}
          type="checkbox"
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={lead.name || lead.email} />
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text-primary)]">
              {lead.name || "Unnamed lead"}
            </p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">
              {lead.email || "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-[var(--text-secondary)] lg:table-cell">
        <span className="truncate">{lead.phone || "—"}</span>
      </td>
      <td className="px-3 py-3 text-[var(--text-secondary)]">
        <span className="truncate">{formatSourceLabel(lead.source)}</span>
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeClasses(lead.status)}`}
        >
          {lead.status}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">
        {formatCurrency(lead.value)}
      </td>
      <td className="hidden px-3 py-3 text-[var(--text-secondary)] lg:table-cell">
        <span className="truncate">{formatAssignmentLabel(lead)}</span>
      </td>
      {aiEnabled && (
        <td className="hidden px-3 py-3 xl:table-cell">
          {typeof lead.aiScore === "number" ? (
            <AIScoreChip score={lead.aiScore} />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">—</span>
          )}
        </td>
      )}
      <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label="Row actions"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={(event) => onOpenMenu(lead, event.currentTarget)}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function LeadCard({
  lead,
  selected,
  activeLeadId,
  aiEnabled,
  onToggle,
  onRowClick,
  onOpenMenu,
}: Readonly<RowCommonProps>) {
  const active = lead.id === activeLeadId;
  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 text-sm transition ${
        active ? "bg-[var(--surface-inset)]" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          aria-label={`Select ${lead.name || "lead"}`}
          checked={selected}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border-default)] accent-[var(--accent)]"
          onChange={() => onToggle(lead.id)}
          type="checkbox"
        />
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onRowClick(lead)}
          type="button"
        >
          <Avatar name={lead.name || lead.email} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--text-primary)]">
              {lead.name || "Unnamed lead"}
            </p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">
              {lead.email || lead.phone || "—"}
            </p>
          </div>
        </button>
        <button
          aria-label="Row actions"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={(event) => onOpenMenu(lead, event.currentTarget)}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${statusBadgeClasses(lead.status)}`}
        >
          {lead.status}
        </span>
        <span className="text-[var(--text-tertiary)]">
          {formatSourceLabel(lead.source)}
        </span>
        <span className="ml-auto tabular-nums text-[var(--text-secondary)]">
          {formatCurrency(lead.value)}
        </span>
      </div>
      {aiEnabled && typeof lead.aiScore === "number" ? (
        <AIScoreChip score={lead.aiScore} />
      ) : null}
    </div>
  );
}

function Avatar({ name }: Readonly<{ name: string }>) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? parts[0]!.slice(0, 2).toUpperCase()
        : (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (hash * 31 + (name || "").charCodeAt(i)) & 0xffffffff;
  const palette = [
    "linear-gradient(135deg,_#6366f1,_#8b5cf6)",
    "linear-gradient(135deg,_#0ea5e9,_#22d3ee)",
    "linear-gradient(135deg,_#10b981,_#34d399)",
    "linear-gradient(135deg,_#f59e0b,_#fbbf24)",
    "linear-gradient(135deg,_#ec4899,_#f472b6)",
    "linear-gradient(135deg,_#ef4444,_#f87171)",
    "linear-gradient(135deg,_#8b5cf6,_#ec4899)",
    "linear-gradient(135deg,_#0891b2,_#10b981)",
  ];
  const gradient = palette[Math.abs(hash) % palette.length]!;
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundImage: gradient }}
    >
      {initials}
    </span>
  );
}
