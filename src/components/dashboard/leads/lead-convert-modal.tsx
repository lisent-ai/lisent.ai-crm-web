import { useTranslations } from "next-intl";

import { Field } from "@/components/dashboard/customers/customer-ui";
import type { Lead } from "@/lib/crm/client";

import { SelectField } from "./lead-form-fields";
import { LeadModalFrame } from "./lead-modal-frame";
import { dealStages, type LeadConvertState } from "./lead-types";

type LeadConvertModalProps = {
  lead: Lead;
  convertState: LeadConvertState;
  saving: boolean;
  onClose: () => void;
  onConvert: () => void;
  onConvertStateChange: (
    updater: (current: LeadConvertState) => LeadConvertState,
  ) => void;
};

export function LeadConvertModal({
  lead,
  convertState,
  saving,
  onClose,
  onConvert,
  onConvertStateChange,
}: Readonly<LeadConvertModalProps>) {
  const t = useTranslations();
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
            {t("leads.convertModal.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {t("leads.convertModal.title", {
              name: lead.name || t("leads.fallback.lead"),
            })}
          </h2>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label={t("leads.convertModal.customerName")}
          onChange={(value) =>
            onConvertStateChange((current) => ({ ...current, name: value }))
          }
          placeholder={t("leads.convertModal.customerNamePlaceholder")}
          value={convertState.name}
        />
        <Field
          label={t("leads.convertModal.email")}
          onChange={(value) =>
            onConvertStateChange((current) => ({ ...current, email: value }))
          }
          placeholder={t("leads.convertModal.emailPlaceholder")}
          value={convertState.email}
        />
        <Field
          label={t("leads.convertModal.phone")}
          onChange={(value) =>
            onConvertStateChange((current) => ({ ...current, phone: value }))
          }
          placeholder={t("leads.convertModal.phonePlaceholder")}
          value={convertState.phone}
        />
        <Field
          label={t("leads.convertModal.preferredLanguage")}
          onChange={(value) =>
            onConvertStateChange((current) => ({
              ...current,
              preferredLanguage: value,
            }))
          }
          placeholder={t("leads.convertModal.preferredLanguagePlaceholder")}
          value={convertState.preferredLanguage}
        />
        <Field
          label={t("leads.convertModal.countryCode")}
          onChange={(value) =>
            onConvertStateChange((current) => ({ ...current, countryCode: value }))
          }
          placeholder={t("leads.convertModal.countryCodePlaceholder")}
          value={convertState.countryCode}
        />
      </div>

      <label className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          checked={convertState.createDeal}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          onChange={(event) =>
            onConvertStateChange((current) => ({
              ...current,
              createDeal: event.target.checked,
            }))
          }
          type="checkbox"
        />
        {t("leads.convertModal.alsoCreateDeal")}
      </label>

      {convertState.createDeal ? (
        <div className="mt-5 grid gap-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <SelectField
            label={t("leads.convertModal.dealStage")}
            onChange={(value) =>
              onConvertStateChange((current) => ({ ...current, dealStage: value }))
            }
            options={dealStages.map((stage) => ({
              label: t(`leads.dealStage.${stage}` as never),
              value: stage,
            }))}
            value={convertState.dealStage}
          />
          <Field
            label={t("leads.convertModal.amount")}
            onChange={(value) =>
              onConvertStateChange((current) => ({ ...current, dealAmount: value }))
            }
            placeholder={t("leads.convertModal.amountPlaceholder")}
            value={convertState.dealAmount}
          />
          <Field
            label={t("leads.convertModal.closeDate")}
            onChange={(value) =>
              onConvertStateChange((current) => ({
                ...current,
                dealCloseDate: value,
              }))
            }
            placeholder={t("leads.convertModal.closeDatePlaceholder")}
            value={convertState.dealCloseDate}
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          disabled={saving}
          onClick={onConvert}
          type="button"
        >
          {saving
            ? t("leads.convertModal.converting")
            : t("leads.convertModal.confirmConvert")}
        </button>
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          disabled={saving}
          onClick={onClose}
          type="button"
        >
          {t("common.cancel")}
        </button>
      </div>
    </LeadModalFrame>
  );
}
