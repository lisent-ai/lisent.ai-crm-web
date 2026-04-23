"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  CheckCircle2,
  PencilLine,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

import type { Lead } from "@/lib/crm/client";
import { CompactMeta, DetailSectionCompact } from "@/components/dashboard/customers/customer-ui";

import { LeadAIInsights } from "./lead-ai-insights";
import {
  formatAssignmentLabel,
  formatCurrency,
  formatDateTime,
  formatSourceLabel,
  statusBadgeClasses,
} from "./lead-utils";

type LeadDetailDrawerProps = {
  lead: Lead | null;
  open: boolean;
  customerLabel: string | undefined;
  saving: boolean;
  assignableMembersCount: number;
  aiEnabled: boolean;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onAssignRoundRobin: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onSchedule: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStartQualify: (lead: Lead) => void;
};

export function LeadDetailDrawer(props: Readonly<LeadDetailDrawerProps>) {
  const { open, onClose } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[95] ${open ? "" : "pointer-events-none"}`}
    >
      <button
        aria-label="Close details"
        className={`absolute inset-0 bg-[rgba(11,15,25,0.45)] transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        type="button"
      />
      <aside
        aria-labelledby="lead-drawer-title"
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-[var(--surface)] shadow-[var(--shadow-float)] transition-transform duration-200 sm:w-[480px] md:w-[520px] lg:w-[560px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        {props.lead ? (
          <DrawerBody {...props} lead={props.lead} />
        ) : (
          <EmptyBody onClose={onClose} />
        )}
      </aside>
    </div>,
    document.body,
  );
}

function EmptyBody({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Lead detail
        </p>
        <button
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--text-tertiary)]">
        Select a lead from the table to inspect its details.
      </div>
    </>
  );
}

type DrawerBodyProps = LeadDetailDrawerProps & { lead: Lead };

function DrawerBody({
  lead,
  customerLabel,
  saving,
  assignableMembersCount,
  aiEnabled,
  onClose,
  onEdit,
  onAssignRoundRobin,
  onConvert,
  onSchedule,
  onDelete,
  onStartQualify,
}: Readonly<DrawerBodyProps>) {
  const canStartQualify = aiEnabled && lead.aiStatus === "pending";

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Lead detail
          </p>
          <h2
            className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]"
            id="lead-drawer-title"
          >
            {lead.name || "Unnamed lead"}
          </h2>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeClasses(lead.status)}`}
          >
            {lead.status}
          </span>
        </div>
        <button
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-5 p-5">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {lead.notes || "No notes recorded for this lead yet."}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <CompactMeta label="Source" value={formatSourceLabel(lead.source)} />
            <CompactMeta label="Assignee" value={formatAssignmentLabel(lead)} />
            <CompactMeta label="Linked customer" value={customerLabel || "None"} />
            <CompactMeta label="Value" value={formatCurrency(lead.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {canStartQualify ? (
              <ActionButton
                icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                label={saving ? "Starting…" : "Start qualify"}
                onClick={() => onStartQualify(lead)}
                saving={saving}
                tone="violet"
              />
            ) : null}
            <ActionButton
              icon={<PencilLine className="h-4 w-4" aria-hidden="true" />}
              label="Edit lead"
              onClick={() => onEdit(lead)}
              saving={saving}
              tone="primary"
            />
            <ActionButton
              disabled={assignableMembersCount === 0}
              icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
              label="Round-robin"
              onClick={() => onAssignRoundRobin(lead)}
              saving={saving}
              tone="ghost"
            />
            <ActionButton
              disabled={lead.status === "converted"}
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              label="Convert"
              onClick={() => onConvert(lead)}
              saving={saving}
              tone="green"
            />
            <ActionButton
              icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
              label="Schedule"
              onClick={() => onSchedule(lead)}
              saving={saving}
              tone="cyan"
            />
            <ActionButton
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              label="Delete"
              onClick={() => onDelete(lead)}
              saving={saving}
              tone="red"
            />
          </div>

          <DetailSectionCompact
            rows={[
              { label: "Email", value: lead.email || "—" },
              { label: "Phone", value: lead.phone || "—" },
              { label: "Assignment", value: lead.assignmentMethod },
              { label: "Customer ID", value: lead.customerId || "—" },
              { label: "Converted customer", value: lead.convertedCustomerId || "—" },
              { label: "Converted deal", value: lead.convertedDealId || "—" },
              { label: "Created", value: formatDateTime(lead.createdAt) },
              { label: "Updated", value: formatDateTime(lead.updatedAt) },
              { label: "Converted at", value: formatDateTime(lead.convertedAt) },
            ]}
            title="Lead record"
          />

          {aiEnabled ? <LeadAIInsights lead={lead} /> : null}

          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Extra data
            </p>
            <pre className="mt-2 max-h-[200px] overflow-auto rounded-lg bg-[var(--text-primary)] p-3 text-[11px] leading-5 text-white">
              {JSON.stringify(lead.extraData, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </>
  );
}

type Tone = "primary" | "ghost" | "violet" | "green" | "cyan" | "red";

const TONE_CLASSES: Record<Tone, string> = {
  primary:
    "bg-[var(--text-primary)] text-white hover:opacity-90",
  ghost:
    "border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
  violet: "bg-violet-600 text-white hover:bg-violet-700",
  green:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
  cyan:
    "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100",
  red:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
};

function ActionButton({
  icon,
  label,
  onClick,
  tone,
  saving,
  disabled,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: Tone;
  saving: boolean;
  disabled?: boolean;
}>) {
  return (
    <button
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${TONE_CLASSES[tone]}`}
      disabled={saving || disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
