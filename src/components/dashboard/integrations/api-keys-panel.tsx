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
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
          <p className="mt-1 text-sm text-slate-500">
            Server-to-server authentication for <strong>{companyName}</strong>. Keys
            are shown once — store them in your secrets manager. Raw keys are
            never retrievable after creation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Create API Key
        </button>
      </header>

      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={includeRevoked}
          onChange={(e) => setIncludeRevoked(e.target.checked)}
          className="rounded border-slate-300"
        />
        Show revoked keys
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No API keys yet. Create one to authenticate requests from your
            backend to Lisent.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                    className={`border-t border-slate-200 ${
                      revoked ? "opacity-60" : ""
                    }`}
                  >
                    <td className="p-3 font-medium text-slate-900">
                      {k.name}
                      {revoked ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          revoked
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-700">
                      {k.prefix}…{k.last_4}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {k.scopes.join(", ") || "—"}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {k.last_used_at
                        ? new Date(k.last_used_at).toLocaleString()
                        : "never"}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      {!revoked ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(k.id)}
                          disabled={revokingId === k.id}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50"
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
          <h3 className="text-lg font-semibold text-slate-900">
            Create API Key
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            The raw key will be shown only once.
          </p>
        </header>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HubSpot Integration"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            required
          />
        </label>

        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-slate-700">
            Environment
          </legend>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="live"
                checked={env === "live"}
                onChange={() => setEnv("live")}
              />
              Live (sk_live_…)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="test"
                checked={env === "test"}
                onChange={() => setEnv("test")}
              />
              Test (sk_test_…)
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-700">
            Scopes
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SCOPES.map((s) => (
              <label
                key={s.value}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={scopes.includes(s.value)}
                  onChange={() => toggleScope(s.value)}
                />
                <span className="font-medium text-slate-800">{s.label}</span>
                <code className="ml-auto text-[10px] text-slate-500">
                  {s.value}
                </code>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || scopes.length === 0}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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
          <h3 className="text-lg font-semibold text-slate-900">
            {keyData.name} created ✓
          </h3>
          <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠️ Copy this key now — Lisent will not show it again. If you lose
            it, you must create a new key.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <code className="block break-all text-xs text-slate-900">
            {keyData.raw_key}
          </code>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {copied ? "Copied ✓" : "Copy key"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl rounded-[1.8rem] bg-white p-6 shadow-[0_32px_88px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
