"use client";

import { useTranslations } from "next-intl";

import { CompactMeta } from "./customer-ui";

type CustomerCompanyHeaderProps = {
  companyName: string;
  companyId: string;
  country: string;
  industry: string;
  recordCount: number;
  showAddModal: boolean;
  onToggleAddModal: () => void;
};

export function CustomerCompanyHeader({
  companyName,
  companyId,
  country,
  industry,
  recordCount,
  showAddModal,
  onToggleAddModal,
}: Readonly<CustomerCompanyHeaderProps>) {
  const t = useTranslations();
  return (
    <section className="w-full min-w-0 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          {companyName}
        </h2>

        <div className="flex items-center lg:justify-end">
          <button
            className="rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-90"
            onClick={onToggleAddModal}
            type="button"
          >
            {showAddModal ? t("customers.closeAddPopup") : t("customers.addCustomer")}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMeta label={t("customers.fields.id")} value={companyId} />
        <CompactMeta label={t("customers.fields.country")} value={country} />
        <CompactMeta label={t("customers.fields.industry")} value={industry} />
        <CompactMeta label={t("customers.fields.records")} value={String(recordCount)} />
      </div>
    </section>
  );
}
