"use client";

import { useTranslations } from "next-intl";

import type { Lead } from "@/lib/crm/client";

import { formatDateTime } from "./lead-utils";

// Phase 3/7 ensemble scoring shape. The rule-based Fit-Score dimensions
// (budget / timeline / project_type / authority / data_quality) have been
// retired — the score now comes from a 3-persona LLM ensemble with a
// formula-audit shadow. What sales reps actually need on the panel is the
// call-prep context the LLM produced, not weight bars.

type SalesContext = {
  who_they_are?: string;
  company_or_buyer_profile?: string;
  recommended_opening?: string;
  risks_to_watch?: string[];
  key_questions_for_call?: string[];
};

type PreScoreEnsemble = {
  median_direct_score?: number;
  formula_audit_score?: number;
  divergent?: boolean;
  divergence_abs?: number;
  extraction_confidence?: number;
  persona_scores?: Record<string, number>;
};

type PreScoreFallback = {
  reason?: string;
  total?: number;
};

type OSINT = {
  provider?: string;
  cache_hit?: boolean;
  phone_country?: string;
  email_domain_type?: string;
  email_site_count?: number;
};

type ScoreBreakdown = {
  fit_score?: number;
  sales_context?: SalesContext;
  pre_score_ensemble?: PreScoreEnsemble;
  pre_score_fallback?: PreScoreFallback;
  osint?: OSINT;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const v = parent[key];
  return isRecord(v) ? v : undefined;
}

function pickStringArray(parent: Record<string, unknown>, key: string): string[] | undefined {
  const v = parent[key];
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string");
}

function pickString(parent: Record<string, unknown>, key: string): string | undefined {
  const v = parent[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function pickNumber(parent: Record<string, unknown>, key: string): number | undefined {
  const v = parent[key];
  return typeof v === "number" ? v : undefined;
}

function pickBool(parent: Record<string, unknown>, key: string): boolean | undefined {
  const v = parent[key];
  return typeof v === "boolean" ? v : undefined;
}

function parseBreakdown(raw: unknown): ScoreBreakdown {
  if (!isRecord(raw)) return {};
  const out: ScoreBreakdown = {};
  const fit = pickNumber(raw, "fit_score");
  if (fit !== undefined) out.fit_score = fit;

  const sc = pickRecord(raw, "sales_context");
  if (sc) {
    out.sales_context = {
      who_they_are: pickString(sc, "who_they_are"),
      company_or_buyer_profile: pickString(sc, "company_or_buyer_profile"),
      recommended_opening: pickString(sc, "recommended_opening"),
      risks_to_watch: pickStringArray(sc, "risks_to_watch"),
      key_questions_for_call: pickStringArray(sc, "key_questions_for_call"),
    };
  }

  const ens = pickRecord(raw, "pre_score_ensemble");
  if (ens) {
    const personaScoresRaw = pickRecord(ens, "persona_scores");
    const personaScores: Record<string, number> | undefined = personaScoresRaw
      ? Object.fromEntries(
          Object.entries(personaScoresRaw).filter(
            (e): e is [string, number] => typeof e[1] === "number",
          ),
        )
      : undefined;
    out.pre_score_ensemble = {
      median_direct_score: pickNumber(ens, "median_direct_score"),
      formula_audit_score: pickNumber(ens, "formula_audit_score"),
      divergent: pickBool(ens, "divergent"),
      divergence_abs: pickNumber(ens, "divergence_abs"),
      extraction_confidence: pickNumber(ens, "extraction_confidence"),
      persona_scores: personaScores,
    };
  }

  const fb = pickRecord(raw, "pre_score_fallback");
  if (fb) {
    out.pre_score_fallback = {
      reason: pickString(fb, "reason"),
      total: pickNumber(fb, "total"),
    };
  }

  const osint = pickRecord(raw, "osint");
  if (osint) {
    out.osint = {
      provider: pickString(osint, "provider"),
      cache_hit: pickBool(osint, "cache_hit"),
      phone_country: pickString(osint, "phone_country"),
      email_domain_type: pickString(osint, "email_domain_type"),
      email_site_count: pickNumber(osint, "email_site_count"),
    };
  }

  return out;
}

// CHAMP (chat-path, dormant until Phase 8) — kept as-is, rendered only when data exists.
const CHAMP_DIMENSIONS = [
  { key: "challenges", label: "Challenges", letter: "C" },
  { key: "authority", label: "Authority", letter: "H" },
  { key: "money", label: "Money", letter: "A" },
  { key: "prioritization", label: "Prioritization", letter: "M" },
] as const;

export function LeadAIInsights({ lead }: Readonly<{ lead: Lead }>) {
  const t = useTranslations();
  const hasAny =
    typeof lead.aiScore === "number" ||
    lead.aiStatus ||
    lead.aiReasoning ||
    lead.aiChamp ||
    lead.aiScoreBreakdown;
  if (!hasAny) return null;

  const score = typeof lead.aiScore === "number" ? Math.round(lead.aiScore) : null;
  const breakdown = parseBreakdown(lead.aiScoreBreakdown);
  const champ = (lead.aiChamp ?? null) as Record<string, unknown> | null;
  const hasChampData =
    champ !== null &&
    CHAMP_DIMENSIONS.some((d) => typeof champ[`${d.key}_score`] === "number");

  return (
    <section className="rounded-[1.25rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 shadow-[0_10px_30px_rgba(99,102,241,0.08)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-sm">
            AI
          </span>
          <p className="text-sm font-semibold tracking-[0.14em] text-violet-900">
            {t("qualifier.leadAssessment")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.aiStatus ? <StatusPill status={lead.aiStatus} /> : null}
          {lead.aiPath ? <PathPill path={lead.aiPath} /> : null}
          {lead.aiLastScoredAt ? (
            <span className="text-[11px] text-violet-700/80">
              {t("qualifier.scoredAt", { date: formatDateTime(lead.aiLastScoredAt) })}
            </span>
          ) : null}
        </div>
      </header>

      {score !== null ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ScoreDial value={score} />
          <EnsembleSummary
            ensemble={breakdown.pre_score_ensemble}
            fallback={breakdown.pre_score_fallback}
          />
        </div>
      ) : null}

      {breakdown.pre_score_fallback ? (
        <FallbackBanner fallback={breakdown.pre_score_fallback} />
      ) : null}

      {breakdown.sales_context ? (
        <SalesContextBlock context={breakdown.sales_context} />
      ) : null}

      {breakdown.osint ? <OSINTPanel osint={breakdown.osint} /> : null}

      {lead.extraData && Object.keys(lead.extraData).length > 0 ? (
        <ExtraDataPanel extraData={lead.extraData} />
      ) : null}

      {breakdown.pre_score_ensemble ? (
        <EnsembleDetails ensemble={breakdown.pre_score_ensemble} />
      ) : null}

      {hasChampData && champ ? <ChampSection champ={champ} /> : null}

      {lead.aiReasoning && Object.keys(lead.aiReasoning).length > 0 ? (
        <details className="mt-4 rounded-xl border border-violet-100 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            {t("qualifier.rawAnalysis")}
          </summary>
          <pre className="m-0 overflow-auto border-t border-violet-100 p-3 text-xs leading-6 text-slate-800">
            {JSON.stringify(lead.aiReasoning, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function ScoreDial({ value }: Readonly<{ value: number }>) {
  const pct = Math.max(0, Math.min(100, value));
  const ring = `conic-gradient(#7c3aed ${pct * 3.6}deg, #ede9fe ${pct * 3.6}deg)`;
  return (
    <div
      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
      style={{ background: ring }}
    >
      <div className="flex h-[86%] w-[86%] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-bold tracking-tight text-violet-900">
          {value}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          / 100
        </span>
      </div>
    </div>
  );
}

function EnsembleSummary({
  ensemble,
  fallback,
}: Readonly<{ ensemble?: PreScoreEnsemble; fallback?: PreScoreFallback }>) {
  const t = useTranslations();
  if (fallback) {
    return (
      <div className="min-w-[200px] flex-1 text-xs text-slate-600">
        <p className="mb-1 font-semibold uppercase tracking-wider text-amber-700">
          {t("qualifier.fallbackMode")}
        </p>
        <p className="text-slate-700">
          {t("qualifier.fallbackExplanation")}
        </p>
      </div>
    );
  }
  if (!ensemble) return null;
  const confidence =
    typeof ensemble.extraction_confidence === "number"
      ? Math.round(ensemble.extraction_confidence * 100)
      : null;
  return (
    <div className="min-w-[200px] flex-1 grid gap-1.5 text-xs">
      {typeof ensemble.formula_audit_score === "number" &&
      typeof ensemble.median_direct_score === "number" ? (
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-semibold">{t("qualifier.llmMedian")}</span>
          <span className="font-mono text-violet-900">
            {ensemble.median_direct_score}
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-semibold">{t("qualifier.formulaAudit")}</span>
          <span className="font-mono text-slate-600">
            {ensemble.formula_audit_score}
          </span>
          {ensemble.divergent ? (
            <span
              title={`|LLM − formül| = ${ensemble.divergence_abs ?? "?"}`}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700"
            >
              fark var
            </span>
          ) : null}
        </div>
      ) : null}
      {confidence !== null ? (
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-semibold">Güven</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              confidence >= 70
                ? "bg-emerald-100 text-emerald-700"
                : confidence >= 50
                  ? "bg-amber-100 text-amber-700"
                  : "bg-rose-100 text-rose-700"
            }`}
          >
            {confidence}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

function FallbackBanner({ fallback }: Readonly<{ fallback: PreScoreFallback }>) {
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
          !
        </span>
        <div className="text-xs">
          <p className="font-semibold text-amber-900">Yedek puanlama devrede</p>
          <p className="mt-1 leading-relaxed text-amber-800">
            {fallback.reason
              ? `Sebep: ${fallback.reason}.`
              : "Bu lead için LLM değerlendirmesi başarısız oldu."}
            {" "}
            Puan ({typeof fallback.total === "number" ? fallback.total : "?"}) sadece
            form verisinin kalitesinden türetildi. Doğruluk düşük — bu lead&apos;e
            kendi değerlendirmenle bak.
          </p>
        </div>
      </div>
    </div>
  );
}

function SalesContextBlock({ context }: Readonly<{ context: SalesContext }>) {
  const t = useTranslations();
  const { who_they_are, company_or_buyer_profile, recommended_opening, risks_to_watch, key_questions_for_call } = context;
  const hasAny =
    who_they_are ||
    company_or_buyer_profile ||
    recommended_opening ||
    (risks_to_watch && risks_to_watch.length) ||
    (key_questions_for_call && key_questions_for_call.length);
  if (!hasAny) return null;

  return (
    <div className="mt-4 rounded-xl border border-violet-100 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
        {t("qualifier.salesContext")}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {who_they_are ? (
          <InfoCard label={t("qualifier.whoTheyAre")} body={who_they_are} />
        ) : null}
        {company_or_buyer_profile ? (
          <InfoCard label={t("qualifier.companyOrBuyerProfile")} body={company_or_buyer_profile} />
        ) : null}
      </div>
      {recommended_opening ? (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            {t("qualifier.recommendedOpening")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-950">
            {recommended_opening}
          </p>
        </div>
      ) : null}
      {key_questions_for_call && key_questions_for_call.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
            {t("qualifier.keyQuestions")}
          </p>
          <ol className="mt-2 grid gap-1.5 pl-0 text-sm text-slate-800">
            {key_questions_for_call.map((q, i) => (
              <li
                key={`${i}-${q.slice(0, 24)}`}
                className="flex items-start gap-2 rounded-lg bg-slate-50/70 px-3 py-2"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-snug">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {risks_to_watch && risks_to_watch.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
            {t("qualifier.risksToWatch")}
          </p>
          <ul className="mt-2 grid gap-1.5 pl-0 text-sm text-slate-800">
            {risks_to_watch.map((r, i) => (
              <li
                key={`${i}-${r.slice(0, 24)}`}
                className="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span className="leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, body }: Readonly<{ label: string; body: string }>) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{body}</p>
    </div>
  );
}

function OSINTPanel({ osint }: Readonly<{ osint: OSINT }>) {
  const providerLabel =
    osint.provider === "self_hosted"
      ? "Self-hosted OSINT"
      : osint.provider === "stub"
        ? "OSINT devre dışı (stub)"
        : osint.provider === "stub_osint_failure"
          ? "OSINT çekilemedi"
          : (osint.provider ?? "OSINT");

  const parts: Array<[string, string]> = [];
  if (osint.phone_country) {
    parts.push(["Telefon ülkesi", osint.phone_country]);
  }
  if (osint.email_domain_type) {
    parts.push(["E-posta domaini", formatDomainType(osint.email_domain_type)]);
  }
  if (typeof osint.email_site_count === "number") {
    parts.push(["E-posta ayak izi", `${osint.email_site_count} site`]);
  }

  return (
    <details className="mt-4 rounded-xl border border-sky-100 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500 text-[10px] font-bold text-white">
            ◎
          </span>
          Zenginleştirme — {providerLabel}
          {osint.cache_hit ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-700">
              önbellek
            </span>
          ) : null}
        </span>
      </summary>
      <div className="grid gap-2 border-t border-sky-100 p-3">
        {parts.length === 0 ? (
          <p className="text-xs text-slate-500">Zenginleştirme sinyali yok.</p>
        ) : (
          parts.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-slate-500">{k}</span>
              <span className="font-mono text-slate-800">{v}</span>
            </div>
          ))
        )}
      </div>
    </details>
  );
}

// Fields already shown elsewhere on the panel (lead header, OSINT, etc.)
// — hide them from the Inbound Data block to avoid duplication. Anything
// not in this set gets surfaced as-is from extra_data.
const EXTRA_DATA_HIDDEN_KEYS: ReadonlySet<string> = new Set([
  "name",
  "email",
  "phone",
  "notes",
  "osint", // OSINTPanel already renders this
]);

function ExtraDataPanel({
  extraData,
}: Readonly<{ extraData: Record<string, unknown> }>) {
  const entries = dedupeCaseVariants(
    Object.entries(extraData).filter(
      ([k, v]) =>
        !EXTRA_DATA_HIDDEN_KEYS.has(k) &&
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && v.trim() === ""),
    ),
  ).sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) return null;

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white" open>
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-600 text-[10px] font-bold text-white">
            ⊞
          </span>
          Inbound Data
          <span className="ml-auto text-[10px] font-medium normal-case tracking-normal text-slate-400">
            {entries.length} alan
          </span>
        </span>
      </summary>
      <dl className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
            key={key}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {humanizeKey(key)}
            </dt>
            <dd className="mt-1 min-w-0 break-words text-sm leading-snug text-slate-800">
              <ExtraDataValue value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/**
 * Some inbound integrations (notably Meta Lead Ads ETLs) duplicate every
 * field in two casing conventions — `ad_id` AND `AdId`, `full_name` AND
 * `FullName`, etc. Both end up in extra_data and the panel renders them
 * twice. Collapse pairs that normalize to the same canonical key, keeping
 * the snake_case form when present (it humanizes more naturally — `Ad Id`
 * vs `AdId`). When values for the same canonical key disagree, both
 * variants are kept so the operator can spot the inconsistency.
 */
function dedupeCaseVariants(
  entries: Array<[string, unknown]>,
): Array<[string, unknown]> {
  const groups = new Map<string, Array<[string, unknown]>>();
  for (const entry of entries) {
    const canonical = entry[0].replace(/[_\s-]+/g, "").toLowerCase();
    const bucket = groups.get(canonical);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(canonical, [entry]);
    }
  }
  const out: Array<[string, unknown]> = [];
  for (const bucket of groups.values()) {
    if (bucket.length === 1) {
      out.push(bucket[0]);
      continue;
    }
    // All values agree → keep one (prefer the snake_case spelling for
    // nicer humanization).
    const first = bucket[0][1];
    const allEqual = bucket.every(([, v]) => valuesEqual(v, first));
    if (allEqual) {
      const preferred =
        bucket.find(([k]) => k.includes("_")) ?? bucket[0];
      out.push(preferred);
    } else {
      // Disagreement is interesting — surface every variant so the
      // operator notices the partner is sending inconsistent values.
      for (const entry of bucket) {
        out.push(entry);
      }
    }
  }
  return out;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && a !== null && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function ExtraDataValue({ value }: Readonly<{ value: unknown }>) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "True" : "False"}</span>;
  }
  if (typeof value === "number") {
    return <span>{String(value)}</span>;
  }
  if (typeof value === "string") {
    return <span>{humanizeStringValue(value)}</span>;
  }
  // Arrays / nested objects — render as compact JSON for transparency.
  return (
    <pre className="m-0 max-h-48 overflow-auto rounded bg-slate-100/70 p-2 font-mono text-[11px] leading-5 text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/**
 * Inbound data values often arrive snake_case'd by the partner ETL —
 * `studio_apartment`, `i_want_to_start_a_new_life_by_the_sea`,
 * `£135,000_–_£300,000`. Strip underscores, sentence-case the result.
 * Identifiers (URLs, emails, no-underscore strings) pass through
 * untouched so we don't mangle real data.
 */
function humanizeStringValue(raw: string): string {
  const value = raw.trim();
  if (value === "") return "—";

  // Common partner-sent stringified booleans / nulls.
  const upper = value.toUpperCase();
  if (upper === "TRUE") return "True";
  if (upper === "FALSE") return "False";
  if (upper === "NULL" || upper === "NONE") return "—";

  // Don't touch URLs / emails — underscores in usernames or paths are
  // part of the identifier and should stay verbatim.
  if (/^https?:\/\//i.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return value;
  }

  if (!value.includes("_")) {
    return value;
  }

  const spaced = value.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDomainType(t: string): string {
  // Objective categorization — no "suspected", no "freemail" as a
  // judgment. gmail/outlook users are the majority of real leads;
  // labeling them as inferior to a corporate domain would be misleading.
  const map: Record<string, string> = {
    registry_tld: "resmi tescilli (.gov/.edu)",
    country_tld: "ülke domaini (.com.tr, .de, .co.uk, ...)",
    generic_tld: "özel domain (.com, .net, ...)",
    public_provider: "genel e-posta servisi (gmail/outlook/yahoo)",
    disposable: "tek kullanımlık",
    missing: "bilgi yok",
    // Back-compat for records stored under the old labels
    corporate_verified: "resmi tescilli",
    corporate_suspected: "özel domain",
    freemail: "genel e-posta servisi",
  };
  return map[t] ?? t;
}

function EnsembleDetails({ ensemble }: Readonly<{ ensemble: PreScoreEnsemble }>) {
  const personas = ensemble.persona_scores;
  if (!personas || Object.keys(personas).length === 0) return null;
  return (
    <details className="mt-4 rounded-xl border border-violet-100 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">
            Σ
          </span>
          Persona skorları
        </span>
      </summary>
      <div className="grid gap-2 border-t border-violet-100 p-3">
        {Object.entries(personas).map(([name, n]) => (
          <PersonaBar key={name} label={name} value={n} />
        ))}
      </div>
    </details>
  );
}

function PersonaBar({ label, value }: Readonly<{ label: string; value: number }>) {
  const pct = Math.max(0, Math.min(100, value));
  const tone =
    label === "skeptic"
      ? "bg-rose-500"
      : label === "opportunity"
        ? "bg-emerald-500"
        : "bg-violet-500";
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium capitalize text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">
          {value} <span className="text-slate-400">/ 100</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
        <div
          className={`h-full rounded-full ${tone} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChampSection({ champ }: Readonly<{ champ: Record<string, unknown> }>) {
  const total = CHAMP_DIMENSIONS.reduce((sum, d) => {
    const v = champ[`${d.key}_score`];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
  const confidence = typeof champ.confidence === "string" ? (champ.confidence as string) : null;

  return (
    <details className="mt-4 rounded-xl border border-violet-100 bg-white" open>
      <summary className="cursor-pointer list-none px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              CHAMP çıkarımı (sohbet yolu)
            </p>
            {confidence ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  confidence === "high"
                    ? "bg-emerald-100 text-emerald-700"
                    : confidence === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                güven: {confidence}
              </span>
            ) : null}
          </div>
          <span className="font-mono text-xs text-slate-500">
            {total} <span className="text-slate-400">/ 100</span>
          </span>
        </div>
      </summary>
      <div className="grid gap-2 border-t border-violet-100 p-3 md:grid-cols-2">
        {CHAMP_DIMENSIONS.map((d) => {
          const raw = champ[`${d.key}_score`];
          const conf = champ[`${d.key}_confidence`];
          const notes = champ[`${d.key}_notes`];
          const v = typeof raw === "number" ? raw : 0;
          const c = typeof conf === "number" ? conf : null;
          return (
            <div
              className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
              key={d.key}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">
                    {d.letter}
                  </span>
                  {d.label}
                </span>
                <span className="font-mono text-slate-500">
                  {v}
                  <span className="text-slate-400"> / 25</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-violet-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, (v / 25) * 100)}%` }}
                />
              </div>
              {c !== null ? (
                <p className="mt-1 text-[10px] text-slate-400">
                  güven %{Math.round(c * 100)}
                </p>
              ) : null}
              {typeof notes === "string" && notes ? (
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  {notes}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function StatusPill({ status }: Readonly<{ status: string }>) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    chatting: "bg-sky-100 text-sky-700 border-sky-200",
    qualified: "bg-emerald-100 text-emerald-700 border-emerald-200",
    disqualified: "bg-slate-200 text-slate-600 border-slate-300",
    paused: "bg-slate-100 text-slate-600 border-slate-200",
    error: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function PathPill({ path }: Readonly<{ path: string }>) {
  const cls =
    path === "fast"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-violet-50 text-violet-700 border-violet-200";
  const label = path === "fast" ? "hızlı yol" : path === "chat" ? "sohbet yolu" : path;
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

export function AIScoreChip({ score }: Readonly<{ score: number }>) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 75
      ? "bg-[color-mix(in_srgb,_var(--signal-green)_14%,_var(--surface))] text-[#065f46]"
      : clamped >= 50
        ? "bg-[color-mix(in_srgb,_var(--signal-amber)_18%,_var(--surface))] text-[#92400e]"
        : "bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] text-[#b91c1c]";
  return (
    <span
      aria-label={`AI score ${clamped} of 100`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      AI {clamped}
    </span>
  );
}
