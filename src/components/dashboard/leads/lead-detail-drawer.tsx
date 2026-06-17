"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Link2,
  Mail,
  Megaphone,
  PencilLine,
  Phone,
  PhoneCall,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

import type { Lead, LeadComment } from "@/lib/crm/client";
import type { AccountProfile } from "@/lib/auth/account-profile";

import { LeadAIInsights } from "./lead-ai-insights";
import { LeadNotesPanel } from "./lead-notes-panel";
import {
  formatAssignmentLabel,
  formatCampaignLabel,
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
  companyName: string;
  customerLabel: string | undefined;
  saving: boolean;
  commentsLoading: boolean;
  commentDraft: string;
  comments: LeadComment[];
  account: AccountProfile | null;
  editingCommentBody: string;
  editingCommentId: string | null;
  assignableMembersCount: number;
  aiEnabled: boolean;
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onAddComment: () => void;
  onDeleteComment: (comment: LeadComment) => void;
  onEditComment: (comment: LeadComment) => void;
  onEditingCommentBodyChange: (value: string) => void;
  onSaveEditedComment: () => void;
  onStopEditingComment: () => void;
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

  return createPortal(<DrawerRoot {...props} />, document.body);
}

function DrawerRoot(props: Readonly<LeadDetailDrawerProps>) {
  const t = useTranslations();
  const { open, onClose } = props;
  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[95] ${open ? "" : "pointer-events-none"}`}
    >
      <button
        aria-label={t("leads.drawer.closeDetails")}
        className={`absolute inset-0 bg-[rgba(11,15,25,0.45)] transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        type="button"
      />
      <div className="absolute inset-0 overflow-y-auto p-3 sm:p-5 md:p-8">
        <aside
        aria-labelledby="lead-drawer-title"
        aria-modal="true"
        className={`relative mx-auto flex min-h-full w-full items-start justify-center transition duration-200 ${
          open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
      >
          <div className="flex w-full max-w-[860px] flex-col overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,_var(--surface)_92%,_white)_0%,_var(--surface-subtle)_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
            {props.lead ? (
              <DrawerBody {...props} lead={props.lead} />
            ) : (
              <EmptyBody onClose={onClose} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EmptyBody({ onClose }: Readonly<{ onClose: () => void }>) {
  const t = useTranslations();
  return (
    <>
      <header className="flex items-center justify-end gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
        <button
          aria-label={t("common.close")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--text-tertiary)]">
        {t("leads.drawer.emptyDetails")}
      </div>
    </>
  );
}

type DrawerBodyProps = LeadDetailDrawerProps & { lead: Lead };

function DrawerBody(props: Readonly<DrawerBodyProps>) {
  const t = useTranslations();
  const { view, lead, onClose, onChangeView, aiEnabled } = props;

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
        {view === "ai" ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            onClick={() => onChangeView("profile")}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {t("leads.drawer.backToProfile")}
          </button>
        ) : (
          <span />
        )}
        <button
          aria-label={t("common.close")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      <div className="max-h-[calc(100vh-6rem)] flex-1 overflow-y-auto">
        {view === "ai" ? (
          <AIView lead={lead} onStartQualify={props.onStartQualify} saving={props.saving} aiEnabled={aiEnabled} />
        ) : (
          <ProfileView key={lead.id} {...props} lead={lead} onChangeView={onChangeView} />
        )}
      </div>
    </>
  );
}

function ProfileView({
  lead,
  companyName,
  customerLabel,
  saving,
  commentsLoading,
  commentDraft,
  comments,
  account,
  editingCommentBody,
  editingCommentId,
  assignableMembersCount,
  aiEnabled,
  onCommentDraftChange,
  onAddComment,
  onDeleteComment,
  onEditComment,
  onEditingCommentBodyChange,
  onSaveEditedComment,
  onStopEditingComment,
  onChangeView,
  onEdit,
  onAssignRoundRobin,
  onConvert,
  onSchedule,
  onDelete,
  onStartQualify,
}: Readonly<DrawerBodyProps>) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "activity" | "deals">(
    "overview",
  );
  const campaign = formatCampaignLabel(lead);
  const canStartQualify = aiEnabled && lead.aiStatus === "pending";
  const aiScore =
    typeof lead.aiScore === "number" ? Math.max(0, Math.min(100, Math.round(lead.aiScore))) : null;
  const hasLinkedDeal = !!lead.convertedDealId;
  const tabOptions = [
    { value: "overview", label: t("leads.drawer.tabs.overview") },
    { value: "notes", label: t("leads.drawer.tabs.notes") },
    { value: "activity", label: t("leads.drawer.tabs.activity") },
    { value: "deals", label: t("leads.drawer.tabs.deals") },
  ] as const;

  return (
    <div className="flex flex-col gap-5 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
      <section className="overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(180deg,#fff8f3_0%,#ffffff_100%)] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar name={lead.name || lead.email} size={64} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="truncate text-xl font-semibold tracking-tight text-[var(--text-primary)]"
                    id="lead-drawer-title"
                  >
                    {lead.name || t("leads.fallback.unnamedLead")}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeClasses(lead.status)}`}
                  >
                    {t(`leads.status.${lead.status}`)}
                  </span>
                  {aiEnabled && aiScore !== null ? (
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                      onClick={() => onChangeView("ai")}
                      title={t("leads.drawer.viewAIQualification")}
                      type="button"
                    >
                      <Sparkles aria-hidden="true" className="h-3 w-3" />
                      AI {aiScore}
                    </button>
                  ) : null}
                </div>

                <div className="mt-2 grid gap-1.5 text-sm text-[var(--text-secondary)]">
                  {companyName ? (
                    <ProfileMetaLine
                      icon={<Building2 aria-hidden="true" className="h-4 w-4" />}
                      value={companyName}
                    />
                  ) : null}
                  {lead.email ? (
                    <ProfileMetaLine
                      icon={<Mail aria-hidden="true" className="h-4 w-4" />}
                      value={lead.email}
                      href={`mailto:${lead.email}`}
                    />
                  ) : null}
                  {lead.phone ? (
                    <ProfileMetaLine
                      icon={<Phone aria-hidden="true" className="h-4 w-4" />}
                      value={lead.phone}
                      href={`tel:${lead.phone}`}
                    />
                  ) : null}
                  {campaign ? (
                    <ProfileMetaLine
                      icon={<Megaphone aria-hidden="true" className="h-4 w-4" />}
                      value={campaign}
                    />
                  ) : null}
                  <ProfileMetaLine
                    icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
                    value={formatAssignmentLabel(lead)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f97316] px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)] transition hover:bg-[#ea580c] disabled:opacity-50"
                disabled={saving}
                onClick={() => onSchedule(lead)}
                type="button"
              >
                <PhoneCall aria-hidden="true" className="h-4 w-4" />
                {t("leads.drawer.scheduleCall")}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-default)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
                disabled={saving}
                onClick={() => onEdit(lead)}
                type="button"
              >
                <PencilLine aria-hidden="true" className="h-4 w-4" />
                {t("leads.drawer.editLead")}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canStartQualify ? (
              <SecondaryAction
                icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                label={saving ? t("leads.drawer.starting") : t("leads.drawer.qualify")}
                onClick={() => onStartQualify(lead)}
                saving={saving}
                tone="violet"
              />
            ) : null}
            <SecondaryAction
              disabled={lead.status === "converted"}
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              label={t("leads.drawer.convert")}
              onClick={() => onConvert(lead)}
              saving={saving}
              tone="ghost"
            />
            <SecondaryAction
              disabled={assignableMembersCount === 0}
              icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
              label={t("leads.drawer.roundRobin")}
              onClick={() => onAssignRoundRobin(lead)}
              saving={saving}
              tone="ghost"
            />
            <SecondaryAction
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              label={t("leads.drawer.delete")}
              onClick={() => onDelete(lead)}
              saving={saving}
              tone="danger"
            />
          </div>

          <LeadAIQualifierSummary
            aiEnabled={aiEnabled}
            aiScore={aiScore}
            lead={lead}
            onOpen={() => onChangeView("ai")}
            onStartQualify={onStartQualify}
            saving={saving}
          />
        </div>

        <div className="border-t border-[var(--border-subtle)] px-3 sm:px-4">
          <div
            aria-label={t("leads.drawer.detailSections")}
            className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto"
            role="tablist"
          >
            {tabOptions.map((tab) => {
              const active = tab.value === activeTab;
              return (
                <button
                  aria-selected={active}
                  className={`relative whitespace-nowrap px-3 py-3 text-sm transition ${
                    active
                      ? "font-semibold text-[var(--text-primary)]"
                      : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#f97316]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <CardSection title={t("leads.drawer.leadProfile")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <LeadInfoTile
                icon={<Building2 aria-hidden="true" className="h-4 w-4" />}
                label={t("leads.drawer.source")}
                value={formatSourceLabel(lead.source)}
              />
              {campaign ? (
                <LeadInfoTile
                  icon={<Megaphone aria-hidden="true" className="h-4 w-4" />}
                  label={t("leads.drawer.campaign")}
                  value={campaign}
                />
              ) : null}
              <LeadInfoTile
                icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
                label={t("leads.drawer.assignee")}
                value={formatAssignmentLabel(lead)}
              />
              <LeadInfoTile
                icon={<CircleDollarSign aria-hidden="true" className="h-4 w-4" />}
                label={t("leads.drawer.value")}
                value={formatCurrency(lead.value)}
              />
              <LeadInfoTile
                icon={<Link2 aria-hidden="true" className="h-4 w-4" />}
                label={t("leads.drawer.linkedCustomer")}
                value={customerLabel || t("leads.drawer.noneYet")}
              />
            </div>
            {lead.notes ? (
              <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {t("leads.drawer.context")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                  {lead.notes}
                </p>
              </div>
            ) : null}
          </CardSection>

          <CardSection title={t("leads.drawer.quickFacts")}>
            <dl className="grid gap-3 text-sm">
              <DetailRow
                label={t("leads.drawer.nextFollowUp")}
                value={lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : "—"}
              />
              <DetailRow label={t("leads.drawer.customerId")} value={lead.customerId || "—"} monospace />
              <DetailRow label={t("leads.drawer.convertedCustomer")} value={lead.convertedCustomerId || "—"} monospace />
              <DetailRow label={t("leads.drawer.convertedDeal")} value={lead.convertedDealId || "—"} monospace />
              <DetailRow label={t("leads.drawer.created")} value={formatDateTime(lead.createdAt)} />
              <DetailRow label={t("leads.drawer.updated")} value={formatDateTime(lead.updatedAt)} />
            </dl>
          </CardSection>
        </div>
      ) : null}

      {activeTab === "notes" ? (
        <LeadNotesPanel
          commentDraft={commentDraft}
          comments={comments}
          currentUserId={account?.userId ?? ""}
          editingCommentBody={editingCommentBody}
          editingCommentId={editingCommentId}
          lead={lead}
          loading={commentsLoading}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onEditComment={onEditComment}
          onEditingCommentBodyChange={onEditingCommentBodyChange}
          onSaveEditedComment={onSaveEditedComment}
          onStopEditing={onStopEditingComment}
          onCommentDraftChange={onCommentDraftChange}
          saving={saving}
        />
      ) : null}

      {activeTab === "activity" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.85fr)]">
          <CardSection title={t("leads.drawer.timeline")}>
            <ol className="grid gap-4 text-sm">
              <ActivityItem label={t("leads.drawer.activity.created")} value={formatDateTime(lead.createdAt)} />
              <ActivityItem label={t("leads.drawer.activity.lastUpdated")} value={formatDateTime(lead.updatedAt)} />
              {lead.convertedAt ? (
                <ActivityItem label={t("leads.drawer.activity.convertedToCustomer")} value={formatDateTime(lead.convertedAt)} />
              ) : null}
              {aiEnabled && lead.aiLastScoredAt ? (
                <ActivityItem label={t("leads.drawer.activity.aiScored")} value={formatDateTime(lead.aiLastScoredAt)} />
              ) : null}
            </ol>
          </CardSection>

          <CardSection title={t("leads.drawer.status")}>
            <div className="grid gap-3">
              <LeadInfoTile
                icon={<FileText aria-hidden="true" className="h-4 w-4" />}
                label={t("leads.drawer.currentStatus")}
                value={t(`leads.status.${lead.status}`)}
              />
              <LeadInfoTile
                icon={<Clock3 aria-hidden="true" className="h-4 w-4" />}
                label={t("leads.drawer.assignmentMode")}
                value={
                  lead.assignmentMethod === "round_robin"
                    ? t("leads.assignment.roundRobin")
                    : t("leads.assignment.manual")
                }
              />
            </div>
          </CardSection>
        </div>
      ) : null}

      {activeTab === "deals" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
          <CardSection title={t("leads.drawer.dealRelationship")}>
            {hasLinkedDeal ? (
              <div className="grid gap-3">
                <LeadInfoTile
                  icon={<Link2 aria-hidden="true" className="h-4 w-4" />}
                  label={t("leads.drawer.linkedDealId")}
                  value={lead.convertedDealId || "—"}
                  monospace
                />
                <LeadInfoTile
                  icon={<UserCheck aria-hidden="true" className="h-4 w-4" />}
                  label={t("leads.drawer.convertedCustomerId")}
                  value={lead.convertedCustomerId || "—"}
                  monospace
                />
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--text-tertiary)]">
                {t("leads.drawer.noDealYet")}
              </p>
            )}
          </CardSection>

          <CardSection title={t("leads.drawer.nextStep")}>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {hasLinkedDeal
                ? t("leads.drawer.dealLinkedHint")
                : t("leads.drawer.dealUnlinkedHint")}
            </p>
          </CardSection>
        </div>
      ) : null}
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
  const t = useTranslations();
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
          {t("leads.ai.leadQualification")}
        </p>
        <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
          {lead.name || t("leads.fallback.unnamedLead")}
        </h2>
        {!aiEnabled ? (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {t("leads.ai.notConnected")}
          </p>
        ) : hasInsights ? null : (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {t("leads.ai.notScoredYet")}
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
            {saving ? t("leads.drawer.starting") : t("leads.ai.startQualify")}
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
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LeadAIQualifierSummary({
  lead,
  aiEnabled,
  aiScore,
  saving,
  onOpen,
  onStartQualify,
}: Readonly<{
  lead: Lead;
  aiEnabled: boolean;
  aiScore: number | null;
  saving: boolean;
  onOpen: () => void;
  onStartQualify: (lead: Lead) => void;
}>) {
  const t = useTranslations();
  const hasInsights =
    typeof lead.aiScore === "number" ||
    !!lead.aiStatus ||
    !!lead.aiReasoning ||
    !!lead.aiChamp ||
    !!lead.aiScoreBreakdown;
  const canStartQualify = aiEnabled && lead.aiStatus === "pending";
  const reasoningSummary = summarizeAIReasoning(lead.aiReasoning);

  if (!aiEnabled && !hasInsights) {
    return null;
  }

  return (
    <section className="mt-4 rounded-[22px] border border-violet-200 bg-gradient-to-br from-violet-50 via-[#faf7ff] to-indigo-50 px-4 py-4 shadow-[0_14px_30px_rgba(99,102,241,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-900">
                {t("leads.ai.aiQualifier")}
              </p>
              <p className="text-sm font-medium text-slate-900">
                {aiScore !== null
                  ? t("leads.ai.scoreOf", { score: aiScore })
                  : t("leads.ai.leadNotScoredYet")}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
              {t("leads.ai.statusLabel", { status: lead.aiStatus || "not_started" })}
            </span>
            {lead.aiPath ? (
              <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                {t("leads.ai.pathLabel", { path: lead.aiPath })}
              </span>
            ) : null}
            {hasStructuredData(lead.aiChamp) ? (
              <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                {t("leads.ai.champReady")}
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {!aiEnabled
              ? t("leads.ai.notConnectedShort")
              : reasoningSummary
                ? reasoningSummary
                : t("leads.ai.openHint")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {canStartQualify ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              disabled={saving}
              onClick={() => onStartQualify(lead)}
              type="button"
            >
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              {saving ? t("leads.drawer.starting") : t("leads.ai.startQualify")}
            </button>
          ) : null}
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-white"
            onClick={onOpen}
            type="button"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {t("leads.ai.openQualifier")}
          </button>
        </div>
      </div>
    </section>
  );
}

function hasStructuredData(value: unknown) {
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
}

function summarizeAIReasoning(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = [
    "summary",
    "reason",
    "decision",
    "headline",
    "verdict",
    "next_step",
  ];

  for (const key of preferredKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const candidate of Object.values(record)) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function LeadInfoTile({
  icon,
  label,
  value,
  monospace,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
  monospace?: boolean;
}>) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p
        className={`mt-2 break-words text-[var(--text-primary)] ${
          monospace ? "font-mono text-xs" : "text-sm font-medium"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProfileMetaLine({
  icon,
  value,
  href,
}: Readonly<{
  icon: React.ReactNode;
  value: string;
  href?: string;
}>) {
  const content = (
    <>
      <span className="mt-0.5 text-[var(--text-tertiary)]">{icon}</span>
      <span className="truncate">{value}</span>
    </>
  );

  if (href) {
    return (
      <a
        className="flex min-w-0 items-start gap-2 transition hover:text-[var(--text-primary)]"
        href={href}
      >
        {content}
      </a>
    );
  }

  return <div className="flex min-w-0 items-start gap-2">{content}</div>;
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
