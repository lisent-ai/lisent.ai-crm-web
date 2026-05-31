"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listModuleAccess,
  setModuleAccess,
  type ModuleAccessGrant,
  type ModuleKey,
} from "@/lib/crm/client";
import type { CompanyMember } from "@/lib/auth/company-membership-client";

type ModuleAccessSectionProps = {
  companyId: string;
  members: CompanyMember[];
};

// Module → i18n label key. Adding a new module means (a) registering
// it on the backend's IsKnownModule switch, (b) the API surfaces it in
// known_modules, and (c) appending a row here so the label shows up
// in the header. The backend allow-list is the source of truth; this
// map only translates the friendly column header.
const MODULE_LABEL_KEYS: Record<ModuleKey, string> = {
  "marketing.agencies": "teamMembers.moduleAccess.module.marketingAgencies",
};

// ModuleAccessSection — owner-only matrix that toggles per-user-per-
// module access. Owner always sees everything (backend bypass); the
// table only renders rows for non-owners because toggling the owner's
// access would be confusing and has no effect on the backend.
//
// Save semantics: changes are local until "Save changes" is pressed.
// PUT replaces the listed (user, module) pairs in one request — the
// backend upserts each row and leaves untouched pairs alone, so saving
// a partial change is always safe.
export function ModuleAccessSection({
  companyId,
  members,
}: Readonly<ModuleAccessSectionProps>) {
  const t = useTranslations();
  const [knownModules, setKnownModules] = useState<ModuleKey[]>([]);
  const [grants, setGrants] = useState<ModuleAccessGrant[]>([]);
  // local edits: key = `${user_id}|${module_key}` → boolean
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    listModuleAccess(companyId)
      .then((res) => {
        if (cancelled) return;
        setGrants(res.grants ?? []);
        setKnownModules(res.known_modules ?? []);
        setEdits({});
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : t("teamMembers.moduleAccess.loadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  useEffect(() => reload(), [reload]);

  // Build a lookup of effective grants — local edits override server
  // state so the toggles reflect what's about to be saved.
  const effective = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const g of grants) map.set(`${g.user_id}|${g.module_key}`, g.granted);
    for (const [k, v] of Object.entries(edits)) map.set(k, v);
    return map;
  }, [grants, edits]);

  const dirty = Object.keys(edits).length > 0;

  // Owners shouldn't appear in the grid — backend bypasses them, and
  // showing a row that has no effect would invite confusion.
  const rows = members.filter((m) => m.role !== "owner");

  function toggle(userId: string, moduleKey: ModuleKey, next: boolean) {
    const key = `${userId}|${moduleKey}`;
    setEdits((prev) => {
      // If the toggle returns to the server state, drop the edit so
      // the dirty flag clears naturally.
      const current = grants.find(
        (g) => g.user_id === userId && g.module_key === moduleKey,
      );
      const serverState = current?.granted ?? false;
      if (next === serverState) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.entries(edits).map(([key, granted]) => {
        const [user_id, module_key] = key.split("|");
        return {
          user_id,
          module_key: module_key as ModuleKey,
          granted,
        };
      });
      await setModuleAccess(companyId, payload);
      reload();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("teamMembers.moduleAccess.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
      <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("teamMembers.moduleAccess.title")}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {t("teamMembers.moduleAccess.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={() => setEdits({})}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              {t("teamMembers.moduleAccess.discard")}
            </button>
          )}
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
          >
            {saving
              ? t("teamMembers.moduleAccess.saving")
              : t("teamMembers.moduleAccess.save")}
          </button>
        </div>
      </header>
      {error && (
        <div className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-xs text-[var(--signal-red)]">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            <tr>
              <th className="px-6 py-2 font-medium">
                {t("teamMembers.moduleAccess.teamMember")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("teamMembers.moduleAccess.role")}
              </th>
              {knownModules.map((m) => (
                <th key={m} className="px-6 py-2 font-medium">
                  {t(MODULE_LABEL_KEYS[m] as never) ?? m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={2 + knownModules.length}
                  className="px-6 py-6 text-center text-[var(--text-tertiary)]"
                >
                  {t("teamMembers.moduleAccess.loading")}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={2 + knownModules.length}
                  className="px-6 py-6 text-center text-[var(--text-tertiary)]"
                >
                  {t("teamMembers.moduleAccess.empty")}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((m) => (
                <tr
                  key={m.userId}
                  className="border-t border-[var(--border-subtle)]"
                >
                  <td className="px-6 py-3">
                    <div className="font-medium text-[var(--text-primary)]">
                      {m.displayName || m.email}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {m.email}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-secondary)]">
                    {m.roleLabel}
                  </td>
                  {knownModules.map((moduleKey) => {
                    const key = `${m.userId}|${moduleKey}`;
                    const granted = effective.get(key) ?? false;
                    const isDirty = key in edits;
                    return (
                      <td key={moduleKey} className="px-6 py-3">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={granted}
                            onChange={(e) =>
                              toggle(m.userId, moduleKey, e.target.checked)
                            }
                          />
                          <span
                            className={`text-xs ${
                              isDirty
                                ? "font-semibold text-[var(--accent)]"
                                : "text-[var(--text-tertiary)]"
                            }`}
                          >
                            {granted
                              ? t("teamMembers.moduleAccess.granted")
                              : t("teamMembers.moduleAccess.noAccess")}
                            {isDirty
                              ? t("teamMembers.moduleAccess.unsaved")
                              : ""}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
