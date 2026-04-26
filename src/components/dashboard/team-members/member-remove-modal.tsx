"use client";

import { useTranslations } from "next-intl";

type MemberRemoveModalProps = {
  companyName: string;
  memberName: string;
  memberEmail: string;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function MemberRemoveModal({
  companyName,
  memberName,
  memberEmail,
  saving,
  onConfirm,
  onClose,
}: Readonly<MemberRemoveModalProps>) {
  const t = useTranslations();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-[1.6rem] border border-rose-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">
              {t("teamMembers.removeModal.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t("teamMembers.removeModal.title", { name: memberName })}
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
          {t("teamMembers.removeModal.description", { company: companyName })}
        </p>

        <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t("teamMembers.member")}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{memberName}</p>
          <p className="mt-1 break-all text-sm text-slate-600">
            {memberEmail || t("teamMembers.noEmail")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(225,29,72,0.3)] transition hover:bg-rose-500 disabled:opacity-50"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? t("teamMembers.removeModal.removing") : t("teamMembers.removeModal.confirm")}
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
