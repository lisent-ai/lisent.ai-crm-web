"use client";

import { useTranslations } from "next-intl";

import type { Deal } from "@/lib/crm/client";

import { DealModalFrame } from "./deal-modal-frame";

type DealDeleteModalProps = {
  deal: Deal;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DealDeleteModal({
  deal,
  saving,
  onClose,
  onConfirm,
}: Readonly<DealDeleteModalProps>) {
  const t = useTranslations();
  return (
    <DealModalFrame onClose={onClose}>
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--signal-red)]">
          {t("deals.deleteDeal")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {t("deals.deleteConfirmTitle", { name: deal.name || t("deals.thisDeal") })}
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          {t("deals.deleteConfirmDescription")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="w-full rounded-full bg-[var(--signal-red)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? t("deals.deleting") : t("deals.deleteDeal")}
          </button>
          <button
            className="w-full rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:w-auto"
            onClick={onClose}
            type="button"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </DealModalFrame>
  );
}
