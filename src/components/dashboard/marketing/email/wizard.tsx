"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export type WizardStep = {
  key: string;
  // Big visible title in the indicator strip + step header.
  title: string;
  // Optional one-liner under the step title to set expectations.
  description?: string;
  // The form / picker body for this step.
  body: ReactNode;
  // Controls whether the Next button is enabled. Pure function reading
  // the current parent state — runs on every render so async validation
  // belongs in the parent's submit, not here.
  isValid?: () => boolean;
  // If true, this step's "complete" indicator shows even before it's
  // visited (useful for optional steps that pre-fill).
  alwaysComplete?: boolean;
};

type WizardProps = {
  steps: WizardStep[];
  // Final-step submit handler. Wizard owns the Next/Back navigation
  // until the last step; on Submit it calls this. The wizard does NOT
  // close itself — the parent handles that in onComplete or via the
  // promise it resolves.
  onSubmit: () => Promise<void> | void;
  onCancel: () => void;
  // Customizable footer labels (defaults to "Cancel" / "Back" / "Next"
  // / "Create" via i18n).
  submitLabel?: string;
  submittingLabel?: string;
  // True while the parent's submit is in flight; disables nav buttons.
  submitting?: boolean;
  // Surfaces below the body, above the footer. Sticky so it stays
  // visible while the operator scrolls a tall step.
  error?: string | null;
  // Modal-style title + close button at the very top of the wizard.
  modalTitle: string;
  modalSubtitle?: string;
};

// Wizard is the shared multi-step shell every "create" flow in the
// email module uses. Three reasons it earns its keep:
//
//   1. Operators don't see 12 fields at once — they see 3-4 per step,
//      with a progress indicator so they know how much is left.
//   2. Next is disabled when the current step's required inputs are
//      empty, with a hint text right above the button so the operator
//      knows what's missing without scrolling.
//   3. Sticky header + step indicator + footer mean the navigation
//      controls are always reachable even on a tall step (e.g. the
//      design step with editor + preview).
//
// State the wizard owns: current step index + transient errors.
// State the parent owns: form values (passed into each step's body).
export function Wizard({
  steps,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel,
  submitting = false,
  error,
  modalTitle,
  modalSubtitle,
}: Readonly<WizardProps>) {
  const t = useTranslations();
  const [active, setActive] = useState(0);

  const step = steps[active];
  const isLast = active === steps.length - 1;
  const isFirst = active === 0;
  const canAdvance = useMemo(
    () => (step?.isValid ? step.isValid() : true),
    // step.isValid is a closure capturing parent state — re-check on
    // every parent render (StepBody re-renders pass new closures in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, step?.isValid],
  );

  async function handleNext() {
    if (!canAdvance) return;
    if (isLast) {
      await onSubmit();
      return;
    }
    setActive((n) => Math.min(steps.length - 1, n + 1));
  }

  function handleBack() {
    if (isFirst) return;
    setActive((n) => Math.max(0, n - 1));
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header: modal title + close + step indicator. */}
        <header className="sticky top-0 z-10 flex flex-col gap-3 rounded-t-3xl border-b border-[var(--border-subtle)] bg-[var(--surface)] px-6 pb-3 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {modalTitle}
              </h3>
              {modalSubtitle ? (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {modalSubtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              aria-label={t("integrations.mailchimp.cancel")}
            >
              ✕
            </button>
          </div>

          {/* Step indicator strip: round number + title for each step. */}
          <ol className="scrollbar-thin -mb-3 flex items-center gap-2 overflow-x-auto pb-2">
            {steps.map((s, i) => {
              const done = i < active || s.alwaysComplete === true;
              const isActive = i === active;
              return (
                <li key={s.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Allow jumping back to completed steps, never
                      // forward — forward jumps could bypass required
                      // fields. The active step button is a no-op.
                      if (i < active) setActive(i);
                    }}
                    disabled={i > active}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : done
                          ? "bg-[var(--signal-green-soft)] text-[var(--signal-green)] hover:bg-[var(--signal-green-soft)]"
                          : "bg-[var(--surface-subtle)] text-[var(--text-tertiary)]"
                    } ${i > active ? "cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        isActive
                          ? "bg-white/30"
                          : done
                            ? "bg-[var(--signal-green)] text-white"
                            : "bg-[var(--surface)]"
                      }`}
                    >
                      {done && !isActive ? "✓" : i + 1}
                    </span>
                    {s.title}
                  </button>
                  {i < steps.length - 1 ? (
                    <span aria-hidden="true" className="text-[var(--text-tertiary)]">
                      →
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </header>

        {/* Scrollable body: the active step's content. */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {error ? (
            <p className="sticky top-0 z-10 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-3 py-2 text-sm font-medium text-[var(--signal-red)] shadow-sm">
              ⚠ {error}
            </p>
          ) : null}

          <section>
            <h4 className="text-base font-semibold text-[var(--text-primary)]">
              {step.title}
            </h4>
            {step.description ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {step.description}
              </p>
            ) : null}
          </section>

          {step.body}
        </div>

        {/* Sticky footer: Back + Next/Submit, with the error tucked
            against the Submit so the operator never wonders why the
            button is disabled. */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-3xl border-t border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-3">
          <button
            type="button"
            onClick={isFirst ? onCancel : handleBack}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          >
            {isFirst ? t("integrations.mailchimp.cancel") : `← ${t("marketing.email.wizard.back")}`}
          </button>
          <div className="flex items-center gap-2">
            {!canAdvance ? (
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.wizard.fillRequired")}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting || !canAdvance}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {submitting
                ? submittingLabel ?? t("marketing.email.wizard.submitting")
                : isLast
                  ? submitLabel ?? t("marketing.email.wizard.submit")
                  : `${t("marketing.email.wizard.next")} →`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
