"use client";

import { useCallback, useEffect, useState } from "react";

import {
  APIKeyCreateResponse,
  APIKeyPublic,
  QualifierV1Error,
  createAPIKey,
  listAPIKeys,
  revokeAPIKey,
} from "@/lib/qualifier/api-keys-client";

type Props = {
  companyId: string;
  companyName: string;
};

const AVAILABLE_SCOPES = [
  { value: "lead:read", label: "Read leads" },
  { value: "lead:write", label: "Create / update leads" },
  { value: "lead:score", label: "Re-score leads" },
  { value: "kb:read", label: "Knowledge base read" },
  { value: "config:read", label: "Read tenant config" },
  { value: "config:write", label: "Update tenant config" },
] as const;

export function APIKeysPanel({ companyId, companyName }: Readonly<Props>) {
  const [keys, setKeys] = useState<APIKeyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeRevoked, setIncludeRevoked] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<APIKeyCreateResponse | null>(null);

  const [revokingId, setRevokingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listAPIKeys(companyId, { includeRevoked });
      setKeys(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [companyId, includeRevoked]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    setRevokingId(id);
    try {
      await revokeAPIKey(companyId, id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">API Keys</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Server-to-server authentication for{" "}
            <strong className="text-[var(--text-secondary)]">{companyName}</strong>. Keys are shown
            once — store them in your secrets manager. Raw keys are never retrievable after
            creation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          + Create API Key
        </button>
      </header>

      <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={includeRevoked}
          onChange={(e) => setIncludeRevoked(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
        />
        Show revoked keys
      </label>

      {error ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
            No API keys yet. Create one to authenticate requests from your
            backend to Lisent.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <tr>
                  <th className="p-3 text-left font-semibold">Name</th>
                  <th className="p-3 text-left font-semibold">Key</th>
                  <th className="p-3 text-left font-semibold">Scopes</th>
                  <th className="p-3 text-left font-semibold">Last used</th>
                  <th className="p-3 text-left font-semibold">Created</th>
                  <th className="p-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const revoked = k.revoked_at !== null;
                  return (
                    <tr
                      key={k.id}
                      className={`border-t border-[var(--border-subtle)] ${
                        revoked ? "opacity-60" : ""
                      }`}
                    >
                      <td className="p-3 font-medium text-[var(--text-primary)]">
                        {k.name}
                        {revoked ? (
                          <span className="ml-2 rounded-full bg-[var(--surface-inset)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                            revoked
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">
                        {k.prefix}…{k.last_4}
                      </td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">
                        {k.scopes.join(", ") || "—"}
                      </td>
                      <td className="p-3 text-xs text-[var(--text-tertiary)]">
                        {k.last_used_at
                          ? new Date(k.last_used_at).toLocaleString()
                          : "never"}
                      </td>
                      <td className="p-3 text-xs text-[var(--text-tertiary)]">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        {!revoked ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(k.id)}
                            disabled={revokingId === k.id}
                            className="text-xs font-semibold text-[var(--signal-red)] transition hover:opacity-80 disabled:opacity-50"
                          >
                            {revokingId === k.id ? "Revoking…" : "Revoke"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModalOpen ? (
        <CreateKeyModal
          companyId={companyId}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(created) => {
            setCreateModalOpen(false);
            setCreatedKey(created);
            void refresh();
          }}
        />
      ) : null}

      {createdKey ? (
        <RawKeyModal keyData={createdKey} onClose={() => setCreatedKey(null)} />
      ) : null}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateKeyModal({
  companyId,
  onClose,
  onCreated,
}: Readonly<{
  companyId: string;
  onClose: () => void;
  onCreated: (key: APIKeyCreateResponse) => void;
}>) {
  const [name, setName] = useState("");
  const [env, setEnv] = useState<"live" | "test">("live");
  const [scopes, setScopes] = useState<string[]>(["lead:read", "lead:write"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const key = await createAPIKey(companyId, {
        name: name.trim(),
        environment: env,
        scopes,
      });
      onCreated(key);
    } catch (err) {
      setError(
        err instanceof QualifierV1Error
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Unknown error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalFrame onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <header>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Create API Key
          </h3>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            The raw key will be shown only once.
          </p>
        </header>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HubSpot Integration"
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            required
          />
        </label>

        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">
            Environment
          </legend>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="live"
                checked={env === "live"}
                onChange={() => setEnv("live")}
                className="accent-[var(--accent)]"
              />
              Live (sk_live_…)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="test"
                checked={env === "test"}
                onChange={() => setEnv("test")}
                className="accent-[var(--accent)]"
              />
              Test (sk_test_…)
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
            Scopes
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AVAILABLE_SCOPES.map((s) => (
              <label
                key={s.value}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={scopes.includes(s.value)}
                  onChange={() => toggleScope(s.value)}
                  className="h-3.5 w-3.5 rounded border-[var(--border-default)] accent-[var(--accent)]"
                />
                <span className="font-medium text-[var(--text-secondary)]">{s.label}</span>
                <code className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                  {s.value}
                </code>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-2 text-xs text-[var(--signal-red)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || scopes.length === 0}
            className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create key"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw key reveal modal (one-time)
// ─────────────────────────────────────────────────────────────────────────────

function RawKeyModal({
  keyData,
  onClose,
}: Readonly<{ keyData: APIKeyCreateResponse; onClose: () => void }>) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(keyData.raw_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // noop — browser will auto-prompt in insecure contexts
    }
  };

  return (
    <ModalFrame onClose={onClose}>
      <div className="space-y-4">
        <header>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {keyData.name} created ✓
          </h3>
          <p className="mt-1 rounded-xl border border-[color-mix(in_srgb,_var(--signal-amber)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] px-3 py-2 text-xs text-[var(--signal-amber)]">
            ⚠️ Copy this key now — Lisent will not show it again. If you lose
            it, you must create a new key.
          </p>
        </header>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
          <code className="block break-all text-xs text-[var(--text-primary)]">
            {keyData.raw_key}
          </code>
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copy}
            className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {copied ? "Copied ✓" : "Copy key"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            I saved it — close
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple modal frame
// ─────────────────────────────────────────────────────────────────────────────

function ModalFrame({
  onClose,
  children,
}: Readonly<{ onClose: () => void; children: React.ReactNode }>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,15,25,0.5)] px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
