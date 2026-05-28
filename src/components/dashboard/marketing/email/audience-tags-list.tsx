"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpAudienceTags,
  type MailchimpAudienceTag,
} from "@/lib/crm/client";

type AudienceTagsListProps = {
  companyId: string;
  listId: string;
};

// AudienceTagsList shows the audience-level tag inventory with member
// counts. Phase 1 is read-only — the per-member tag mutation lives on
// the Add member / CSV upload paths (those endpoints set tags during
// upsert). Creating a tag for the inventory means tagging at least
// one member with the new name; we link the operator to that flow.
export function AudienceTagsList({
  companyId,
  listId,
}: Readonly<AudienceTagsListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpAudienceTag[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMailchimpAudienceTags(companyId, listId, search ? { name: search } : {})
      .then((res) => {
        if (cancelled) return;
        setItems(res.tags ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.tags.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, listId, search, t]);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("marketing.email.tags.searchPlaceholder")}
          className="flex-1 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      {error && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
          {t("marketing.email.tags.loading")}
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
          {search
            ? t("marketing.email.tags.emptySearch", { query: search })
            : t("marketing.email.tags.empty")}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1 text-sm"
            >
              <span className="font-medium text-[var(--text-primary)]">{tag.name}</span>
              {typeof tag.member_count === "number" ? (
                <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                  {tag.member_count.toLocaleString()}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.tags.hint")}
      </p>
    </>
  );
}
