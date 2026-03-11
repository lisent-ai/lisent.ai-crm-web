import { CompanyField } from "./company-ui";

type CompanyCreateModalProps = {
  companyName: string;
  country: string;
  industry: string;
  onCompanyNameChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

export function CompanyCreateModal({
  companyName,
  country,
  industry,
  onCompanyNameChange,
  onCountryChange,
  onIndustryChange,
  onCreate,
  onClose,
}: Readonly<CompanyCreateModalProps>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              New company
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Create company
            </h2>
          </div>
          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <CompanyField
            label="Company name"
            onChange={onCompanyNameChange}
            placeholder="Example: Nova Health"
            value={companyName}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <CompanyField
              label="Country"
              onChange={onCountryChange}
              placeholder="Example: Germany"
              value={country}
            />
            <CompanyField
              label="Industry"
              onChange={onIndustryChange}
              placeholder="Example: CRM"
              value={industry}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
            onClick={onCreate}
            type="button"
          >
            Create company
          </button>
          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
