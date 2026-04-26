"use client";

import { useTranslations } from "next-intl";

import { getCompanyRoleLabel, type CompanyRole } from "@/lib/auth/roles";

type MemberRoleChangeModalProps = {
  memberName: string;
  memberEmail: string;
  currentRole: CompanyRole;
  nextRole: CompanyRole;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function MemberRoleChangeModal({
  memberName,
  memberEmail,
  currentRole,
  nextRole,
  saving,
  onConfirm,
  onClose,
}: Readonly<MemberRoleChangeModalProps>) {
  const t = useTranslations();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-[1.6rem] border border-sky-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              {t("teamMembers.roleModal.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t("teamMembers.roleModal.title", { name: memberName })}
            </h2>
          </div>
          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t("common.close")}
          </button>
        </div>

        <p className="mt-5 text-sm leading-7 text-slate-700">
          {t("teamMembers.roleModal.description")}
        </p>

        <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t("teamMembers.member")}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{memberName}</p>
          <p className="mt-1 break-all text-sm text-slate-600">
            {memberEmail || t("teamMembers.noEmail")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
              {getCompanyRoleLabel(currentRole)}
            </span>
            <span className="text-slate-400">{t("teamMembers.roleModal.to")}</span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-800">
              {getCompanyRoleLabel(nextRole)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(3,105,161,0.28)] transition hover:bg-sky-600 disabled:opacity-50"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? t("teamMembers.roleModal.updating") : t("teamMembers.roleModal.confirm")}
          </button>
          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
