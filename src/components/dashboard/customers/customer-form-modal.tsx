import { customerStatusOptions, type CustomerFormState } from "./customer-types";
import { Field } from "./customer-ui";

type CustomerFormModalProps = {
  mode: "create" | "edit";
  title: string;
  subtitle: string;
  form: CustomerFormState;
  onFormChange: (form: CustomerFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CustomerFormModal({
  mode,
  title,
  subtitle,
  form,
  onFormChange,
  onClose,
  onSubmit,
}: Readonly<CustomerFormModalProps>) {
  const actionLabel = mode === "edit" ? "Save changes" : "Create customer";
  const eyebrow = mode === "edit" ? "Edit Customer" : "Create Customer";

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="Name"
            onChange={(value) => onFormChange({ ...form, name: value })}
            placeholder="Customer name"
            value={form.name}
          />
          <Field
            label="Email"
            onChange={(value) => onFormChange({ ...form, email: value })}
            placeholder="customer@company.com"
            value={form.email}
          />
          <Field
            label="Phone"
            onChange={(value) => onFormChange({ ...form, phone: value })}
            placeholder="+49 555 123 45"
            value={form.phone}
          />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              onChange={(event) =>
                onFormChange({ ...form, status: event.target.value })
              }
              value={form.status}
            >
              {customerStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
            onClick={onSubmit}
            type="button"
          >
            {actionLabel}
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
