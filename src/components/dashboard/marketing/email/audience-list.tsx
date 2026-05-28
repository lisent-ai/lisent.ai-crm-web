"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpAudiences,
  type MailchimpAudience,
} from "@/lib/crm/client";

import { AudienceCreateModal } from "./audience-create-modal";
import { AudienceDetailModal } from "./audience-detail-modal";

type AudienceListProps = {
  companyId: string;
};

// AudienceList renders the operator's Mailchimp audiences (Mailchimp's
// "lists"). One row per audience with name, member count, and a date
// stamp. Clicking a row opens the AudienceDetailModal which paginates
// members + exposes per-member actions.
//
// Pagination: Mailchimp caps page sizes generously; we request 100 and
// let an operator with 100+ audiences page manually via offset later.
// At Phase 1 nobody has that many audiences.
export function AudienceList({ companyId }: Readonly<AudienceListProps>) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Auto-open the create modal when the URL says ?action=new — let
  // the Overview quick action deep-link straight to a fresh-create
  // experience.
  const initialShowCreate = searchParams.get("action") === "new";

  const [items, setItems] = useState<MailchimpAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MailchimpAudience | null>(null);
  const [showCreate, setShowCreate] = useState(initialShowCreate);
  const [refreshTick, setRefreshTick] = useState(0);

  // Clear ?action=new from the URL after the modal has mounted so a
  // refresh doesn't re-trigger it.
  useEffect(() => {
    if (!initialShowCreate) return;
    const usp = new URLSearchParams(searchParams.toString());
    usp.delete("action");
    router.replace(`?${usp.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShowCreate]);

  useEffect(() => {
    let cancelled = false;
    listMailchimpAudiences(companyId, { count: 100 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.lists ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.audiences.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t, refreshTick]);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  if (loading) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("marketing.email.audiences.loading")}
      </article>
    );
  }

  if (error) {
    return (
      <article className="rounded-3xl border border-[var(--signal-red)] bg-[var(--surface)] p-6 text-sm text-[var(--signal-red)] sm:p-8">
        {error}
      </article>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <article className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-secondary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("marketing.email.audiences.emptyTitle")}
          </h3>
          <p className="mt-2">{t("marketing.email.audiences.emptyBody")}</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            {t("marketing.email.audiences.newAudience")}
          </button>
        </article>
        {showCreate && (
          <AudienceCreateModal
            companyId={companyId}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              refresh();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("marketing.email.audiences.title")} · {items.length}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              {t("marketing.email.audiences.refresh")}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              {t("marketing.email.audiences.newAudience")}
            </button>
          </div>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.audiences.col.name")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.audiences.col.members")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.audiences.col.openRate")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.audiences.col.created")}
              </th>
              <th className="px-6 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <AudienceRow
                key={row.id}
                row={row}
                onOpen={() => setSelected(row)}
              />
            ))}
          </tbody>
        </table>
      </article>
      {selected && (
        <AudienceDetailModal
          companyId={companyId}
          audience={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {showCreate && (
        <AudienceCreateModal
          companyId={companyId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </>
  );
}

function AudienceRow({
  row,
  onOpen,
}: Readonly<{ row: MailchimpAudience; onOpen: () => void }>) {
  const t = useTranslations();
  const memberCount = row.stats?.member_count;
  const openRate = row.stats?.open_rate;
  const created = row.date_created;
  return (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]">
      <td className="px-6 py-3 text-[var(--text-primary)]">
        <div className="font-medium">{row.name}</div>
        <div className="font-mono text-xs text-[var(--text-tertiary)]">{row.id}</div>
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">
        {memberCount?.toLocaleString() ?? "—"}
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">
        {typeof openRate === "number" ? `${(openRate * 100).toFixed(1)}%` : "—"}
      </td>
      <td className="px-6 py-3 text-[var(--text-secondary)]">
        {created ? new Date(created).toLocaleDateString() : "—"}
      </td>
      <td className="px-6 py-3 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
        >
          {t("marketing.email.audiences.viewMembers")}
        </button>
      </td>
    </tr>
  );
}
