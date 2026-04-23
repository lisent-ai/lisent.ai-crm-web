"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  PencilLine,
  Phone,
  PhoneCall,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

import type { Lead, LeadComment } from "@/lib/crm/client";

import { LeadAIInsights } from "./lead-ai-insights";
import { LeadNotesPanel } from "./lead-notes-panel";
import {
  formatAssignmentLabel,
  formatCurrency,
  formatDateTime,
  formatSourceLabel,
  statusBadgeClasses,
} from "./lead-utils";

export type LeadDetailView = "profile" | "ai";

type LeadDetailDrawerProps = {
  lead: Lead | null;
  open: boolean;
  view: LeadDetailView;
  customerLabel: string | undefined;
  saving: boolean;
  commentsLoading: boolean;
  commentDraft: string;
  comments: LeadComment[];
  assignableMembersCount: number;
  aiEnabled: boolean;
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onAddComment: () => void;
  onChangeView: (next: LeadDetailView) => void;
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
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-[var(--surface)] shadow-[var(--shadow-float)] transition-transform duration-200 sm:w-[440px] md:w-[480px] lg:w-[520px] ${
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
      <header className="flex items-center justify-end gap-2 px-5 py-4">
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

function DrawerBody(props: Readonly<DrawerBodyProps>) {
  const { view, lead, onClose, onChangeView, aiEnabled } = props;

  return (
    <>
      <header className="flex items-center justify-between gap-2 px-5 py-3">
        {view === "ai" ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            onClick={() => onChangeView("profile")}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to profile
          </button>
        ) : (
          <span />
        )}
        <button
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === "ai" ? (
          <AIView lead={lead} onStartQualify={props.onStartQualify} saving={props.saving} aiEnabled={aiEnabled} />
        ) : (
          <ProfileView {...props} lead={lead} onChangeView={onChangeView} />
        )}
      </div>
    </>
  );
}

function ProfileView({
  lead,
  customerLabel,
  saving,
  commentsLoading,
  commentDraft,
  comments,
  assignableMembersCount,
  aiEnabled,
  onCommentDraftChange,
  onAddComment,
  onChangeView,
  onEdit,
  onAssignRoundRobin,
  onConvert,
  onSchedule,
  onDelete,
  onStartQualify,
}: Readonly<DrawerBodyProps>) {
  const canStartQualify = aiEnabled && lead.aiStatus === "pending";
  const aiScore =
    typeof lead.aiScore === "number" ? Math.max(0, Math.min(100, Math.round(lead.aiScore))) : null;

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <Avatar name={lead.name || lead.email} size={72} />
        <div className="min-w-0">
          <h2
            className="truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]"
            id="lead-drawer-title"
          >
            {lead.name || "Unnamed lead"}
          </h2>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {formatSourceLabel(lead.source)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeClasses(lead.status)}`}
          >
            {lead.status}
          </span>
          {aiEnabled && aiScore !== null ? (
            <button
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              onClick={() => onChangeView("ai")}
              title="View AI qualification"
              type="button"
            >
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              AI {aiScore}
            </button>
          ) : null}
        </div>

        {/* Contact chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {lead.email ? (
            <a
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              href={`mailto:${lead.email}`}
            >
              <Mail aria-hidden="true" className="h-3 w-3" />
              {lead.email}
            </a>
          ) : null}
          {lead.phone ? (
            <a
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              href={`tel:${lead.phone}`}
            >
              <Phone aria-hidden="true" className="h-3 w-3" />
              {lead.phone}
            </a>
          ) : null}
        </div>
      </div>

      {/* Primary CTA — Schedule a call */}
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f97316] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)] transition hover:bg-[#ea580c] disabled:opacity-50"
        disabled={saving}
        onClick={() => onSchedule(lead)}
        type="button"
      >
        <PhoneCall aria-hidden="true" className="h-4 w-4" />
        Schedule a call
      </button>

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-2">
        {canStartQualify ? (
          <SecondaryAction
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            label={saving ? "Starting…" : "Qualify"}
            onClick={() => onStartQualify(lead)}
            saving={saving}
            tone="violet"
          />
        ) : null}
        <SecondaryAction
          icon={<PencilLine className="h-4 w-4" aria-hidden="true" />}
          label="Edit"
          onClick={() => onEdit(lead)}
          saving={saving}
          tone="ghost"
        />
        <SecondaryAction
          disabled={lead.status === "converted"}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          label="Convert"
          onClick={() => onConvert(lead)}
          saving={saving}
          tone="ghost"
        />
        <SecondaryAction
          disabled={assignableMembersCount === 0}
          icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
          label="Round-robin"
          onClick={() => onAssignRoundRobin(lead)}
          saving={saving}
          tone="ghost"
        />
        <SecondaryAction
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          label="Delete"
          onClick={() => onDelete(lead)}
          saving={saving}
          tone="danger"
        />
      </div>

      <LeadNotesPanel
        commentDraft={commentDraft}
        comments={comments}
        lead={lead}
        loading={commentsLoading}
        onAddComment={onAddComment}
        onCommentDraftChange={onCommentDraftChange}
        saving={saving}
      />

      {/* Details */}
      <CardSection title="Details">
        <dl className="grid gap-3 text-sm">
          <DetailRow label="Source" value={formatSourceLabel(lead.source)} />
          <DetailRow label="Assignee" value={formatAssignmentLabel(lead)} />
          <DetailRow label="Value" value={formatCurrency(lead.value)} />
          <DetailRow label="Linked customer" value={customerLabel || "None"} />
          <DetailRow label="Customer ID" value={lead.customerId || "—"} monospace />
        </dl>
      </CardSection>

      {/* Activity */}
      <CardSection title="Activity">
        <ol className="grid gap-3 text-sm">
          <ActivityItem label="Created" value={formatDateTime(lead.createdAt)} />
          <ActivityItem label="Last updated" value={formatDateTime(lead.updatedAt)} />
          {lead.convertedAt ? (
            <ActivityItem label="Converted" value={formatDateTime(lead.convertedAt)} />
          ) : null}
          {aiEnabled && lead.aiLastScoredAt ? (
            <ActivityItem
              label="AI scored"
              value={formatDateTime(lead.aiLastScoredAt)}
            />
          ) : null}
        </ol>
      </CardSection>

      {/* Deals */}
      <CardSection title="Deals">
        {lead.convertedDealId ? (
          <p className="truncate text-sm text-[var(--text-secondary)]">
            Linked deal{" "}
            <span className="font-mono text-xs text-[var(--text-tertiary)]">
              {lead.convertedDealId}
            </span>
          </p>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">
            No deal linked yet. Convert the lead to create one.
          </p>
        )}
      </CardSection>
    </div>
  );
}

function AIView({
  lead,
  saving,
  aiEnabled,
  onStartQualify,
}: Readonly<{
  lead: Lead;
  saving: boolean;
  aiEnabled: boolean;
  onStartQualify: (lead: Lead) => void;
}>) {
  const canStartQualify = aiEnabled && lead.aiStatus === "pending";
  const hasInsights =
    typeof lead.aiScore === "number" ||
    lead.aiStatus ||
    lead.aiReasoning ||
    lead.aiChamp ||
    lead.aiScoreBreakdown;

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card-lg)] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 text-center shadow-[0_10px_30px_rgba(99,102,241,0.08)]">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-sm">
          AI
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-900">
          Lead qualification
        </p>
        <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
          {lead.name || "Unnamed lead"}
        </h2>
        {!aiEnabled ? (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            AI Lead Qualifier is not connected for this workspace. Connect it
            from Integrations to start scoring leads.
          </p>
        ) : hasInsights ? null : (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            This lead has not been scored yet.
          </p>
        )}
        {canStartQualify ? (
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            disabled={saving}
            onClick={() => onStartQualify(lead)}
            type="button"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {saving ? "Starting…" : "Start qualify"}
          </button>
        ) : null}
      </div>

      {aiEnabled && hasInsights ? <LeadAIInsights lead={lead} /> : null}
    </div>
  );
}

function CardSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  monospace,
}: Readonly<{ label: string; value: string; monospace?: boolean }>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[var(--text-tertiary)]">{label}</dt>
      <dd
        className={`min-w-0 text-right ${
          monospace ? "font-mono text-xs" : "text-sm"
        } text-[var(--text-primary)]`}
      >
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

function ActivityItem({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <p className="truncate text-sm text-[var(--text-primary)]">{value}</p>
      </div>
    </li>
  );
}

type SecondaryTone = "ghost" | "violet" | "danger";

function SecondaryAction({
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
  tone: SecondaryTone;
  saving: boolean;
  disabled?: boolean;
}>) {
  const toneClass =
    tone === "violet"
      ? "bg-violet-600 text-white hover:bg-violet-700"
      : tone === "danger"
        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]";
  return (
    <button
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${toneClass}`}
      disabled={saving || disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function Avatar({
  name,
  size = 36,
}: Readonly<{ name: string; size?: number }>) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? parts[0]!.slice(0, 2).toUpperCase()
        : (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (hash * 31 + (name || "").charCodeAt(i)) & 0xffffffff;
  }
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
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-[var(--shadow-sm)]"
      style={{
        backgroundImage: gradient,
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(12, size * 0.32)}px`,
      }}
    >
      {initials}
    </span>
  );
}
