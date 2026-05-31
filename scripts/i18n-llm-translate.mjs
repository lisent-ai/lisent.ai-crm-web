#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * LLM-driven i18n refresh for Tolgee.
 *
 * Pulls source (en) + target translations from Tolgee, sends
 * UNTRANSLATED + DeepL-machine TRANSLATED keys to Groq, and writes
 * back the high-quality output. REVIEWED and human-edited keys are
 * left alone unless --include-reviewed / --include-manual is passed.
 *
 * Validator rejects any candidate that drops or alters ICU placeholders
 * or HTML tags relative to the source — failed keys are skipped (not
 * written) and reported at the end.
 *
 * Usage:
 *   node scripts/i18n-llm-translate.mjs --dry-run --sample=20
 *   node scripts/i18n-llm-translate.mjs --target=tr,de --dry-run
 *   node scripts/i18n-llm-translate.mjs --target=tr
 *   node scripts/i18n-llm-translate.mjs --target=all
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────────────────────
// Config

const CONFIG = {
  tolgee: {
    apiUrl: "https://i18n.lisent.ai",
    projectId: 2,
    sourceLang: "en",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-120b",
    maxCompletionTokens: 16000,
    temperature: 0.2,
  },
  // 13 target languages, en is base, no falls back to en in app config.
  defaultTargets: ["tr", "de", "fr", "es", "it", "pt", "nl", "pl", "ru", "ar", "sv", "da", "fi"],
  batchSize: 20,
  concurrency: 2,
  retryAttempts: 2,
  retryBackoffMs: 1500,
};

// ─────────────────────────────────────────────────────────────────────────────
// .env.local loader (no external deps)

function loadDotEnv() {
  const envPath = resolve(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI parsing

function parseArgs(argv) {
  const args = {
    target: null,
    keys: null,
    model: CONFIG.groq.defaultModel,
    batchSize: CONFIG.batchSize,
    concurrency: CONFIG.concurrency,
    dryRun: false,
    sample: null,
    includeReviewed: false,
    includeManual: false,
    output: null,
    verbose: false,
    help: false,
  };
  for (const raw of argv.slice(2)) {
    if (raw === "--help" || raw === "-h") args.help = true;
    else if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--include-reviewed") args.includeReviewed = true;
    else if (raw === "--include-manual") args.includeManual = true;
    else if (raw === "--verbose") args.verbose = true;
    else if (raw.startsWith("--target=")) args.target = raw.slice(9);
    else if (raw.startsWith("--keys=")) args.keys = raw.slice(7);
    else if (raw.startsWith("--model=")) args.model = raw.slice(8);
    else if (raw.startsWith("--batch-size=")) args.batchSize = Number(raw.slice(13));
    else if (raw.startsWith("--concurrency=")) args.concurrency = Number(raw.slice(14));
    else if (raw.startsWith("--sample=")) args.sample = Number(raw.slice(9));
    else if (raw.startsWith("--output=")) args.output = raw.slice(9);
    else throw new Error(`Unknown arg: ${raw}`);
  }
  return args;
}

function printHelp() {
  console.log(`
i18n-llm-translate.mjs — Tolgee + Groq translation refresher

  --target=tr,de,...   Target languages (default: 13 langs)
  --target=all         Same as default
  --keys=foo.*,bar.*   Filter to key patterns (supports * wildcard)
  --model=ID           Groq model (default: ${CONFIG.groq.defaultModel})
  --batch-size=N       Keys per LLM call (default: ${CONFIG.batchSize})
  --concurrency=N      Parallel batches (default: ${CONFIG.concurrency})
  --dry-run            Don't write to Tolgee; print diff
  --sample=N           Process only first N keys (after filters)
  --include-reviewed   Refresh REVIEWED translations too (DANGER)
  --include-manual     Refresh manually-edited TRANSLATED (DANGER)
  --output=FILE        Write dry-run report to file
  --verbose            More logs
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tolgee API

class TolgeeClient {
  constructor({ apiUrl, projectId, apiKey }) {
    this.apiUrl = apiUrl.replace(/\/+$/, "");
    this.projectId = projectId;
    this.apiKey = apiKey;
  }

  async fetchAllTranslations(languages) {
    const langCsv = languages.join(",");
    const pageSize = 2000;
    const out = [];
    let page = 0;
    // Crossed the single-page limit once the catalog passed 2k keys —
    // walk page=0,1,2,… until totalPages is reached.
    while (true) {
      const url = `${this.apiUrl}/v2/projects/${this.projectId}/translations?size=${pageSize}&page=${page}&languages=${encodeURIComponent(langCsv)}`;
      const res = await fetch(url, { headers: { "X-API-Key": this.apiKey } });
      if (!res.ok) {
        throw new Error(
          `Tolgee fetch failed (${res.status}): ${await res.text()}`,
        );
      }
      const json = await res.json();
      const keys = json._embedded?.keys ?? [];
      out.push(...keys);
      const totalPages = json.page?.totalPages ?? 1;
      if (page + 1 >= totalPages || keys.length === 0) break;
      page += 1;
    }
    return out;
  }

  /**
   * Tolgee POST /v2/projects/{id}/translations updates a single
   * (key, language) pair. Body shape: { key, namespace?, translations: { lang: text } }.
   */
  async writeTranslation({ keyName, keyNamespace, language, text }) {
    const url = `${this.apiUrl}/v2/projects/${this.projectId}/translations`;
    const body = {
      key: keyName,
      translations: { [language]: text },
    };
    if (keyNamespace) body.namespace = keyNamespace;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(
        `Tolgee write failed for ${keyName}@${language} (${res.status}): ${await res.text()}`,
      );
    }
    return res.json();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq client (OpenAI-compatible chat completions)

class GroqClient {
  constructor({ baseUrl, apiKey, model }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.model = model;
  }

  async chatJSON({ system, user, temperature = CONFIG.groq.temperature }) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature,
        max_completion_tokens: CONFIG.groq.maxCompletionTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Groq error ${res.status}: ${txt}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq returned empty content");
    return JSON.parse(content);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter + batching

function shouldTranslate({ tr, includeReviewed, includeManual }) {
  if (!tr) return true; // no translation row at all
  if (tr.state === "UNTRANSLATED") return true;
  if (tr.state === "REVIEWED") return includeReviewed;
  if (tr.state === "TRANSLATED") {
    // auto=true means it came from a machine provider (DeepL etc.); we always
    // want to overwrite those with LLM output. auto=false means a human typed
    // it — keep unless explicitly forced.
    if (tr.auto) return true;
    return includeManual;
  }
  if (tr.state === "DISABLED") return false;
  return true;
}

function matchesKeyPattern(keyName, patterns) {
  if (!patterns) return true;
  return patterns.some((pat) => {
    const re = new RegExp(`^${pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    return re.test(keyName);
  });
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation: placeholders + tags must round-trip

const ICU_PLACEHOLDER_RE = /\{[^{}]*\}/g;
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

function tokenSetMatches(source, candidate, regex) {
  const a = (source.match(regex) || []).slice().sort();
  const b = (candidate.match(regex) || []).slice().sort();
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function validateTranslation(source, candidate) {
  if (typeof candidate !== "string") return { ok: false, reason: "not a string" };
  if (!candidate.trim()) return { ok: false, reason: "empty" };
  if (!tokenSetMatches(source, candidate, ICU_PLACEHOLDER_RE)) {
    return { ok: false, reason: "placeholder mismatch" };
  }
  if (!tokenSetMatches(source, candidate, HTML_TAG_RE)) {
    return { ok: false, reason: "html tag mismatch" };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder

const LANG_NAMES = {
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ar: "Arabic",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
};

function buildSystemPrompt({ language, glossary }) {
  const langName = LANG_NAMES[language] || language;
  const brand = glossary.brand_keep_verbatim.join(", ");
  const keepEn = glossary.default_keep_in_english.join(", ");
  const overrides = glossary.term_overrides?.[language];
  const overrideBlock = overrides
    ? `\nGlossary (use these exact translations consistently — including capitalization shown):\n${Object.entries(overrides)
        .map(([en, local]) => `  "${en}" → "${local}"`)
        .join("\n")}`
    : `\nFor business jargon, prefer common ${langName} CRM/SaaS terminology.`;

  // Stack default rules first, then language-specific overrides afterwards
  // so the model sees a consistent baseline plus any language-specific
  // tightening (e.g. Turkish formal 'siz' that the default already covers
  // generically). Empty array = no styleBlock.
  const defaultRules = glossary.style_rules?.default ?? [];
  const langRules = glossary.style_rules?.[language] ?? [];
  const allRules = [...defaultRules, ...langRules];
  const styleBlock = allRules.length
    ? `\n\nStyle rules (FOLLOW EXACTLY):\n${allRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : "";

  return `You are a senior CRM UI localization specialist working on Lisent CRM, a B2B sales workflow product (leads, deals, pipelines, customers, integrations).

Translate UI strings from English to ${langName}. Rules:
- Style: business, professional, concise. Match how a polished SaaS dashboard sounds in ${langName}.
- Preserve ICU placeholders byte-for-byte: {var}, {count, plural, one {…} other {…}}, {gender, select, male {…} other {…}}.
- Preserve HTML tags exactly: <b>…</b>, <a href="…">…</a>, etc. Do not add or remove tags.
- Brand names — never translate, never inflect: ${brand}.
- Acronyms / generic SaaS terms to keep in English by default: ${keepEn} (unless the glossary below overrides them).${overrideBlock}
- Quoted UI labels in source ("Save", "Cancel", etc.) should map to natural ${langName} verbs/nouns, not transliteration.${styleBlock}

Output: a JSON object mapping each input key to its translation. No prose, no markdown, no commentary, no extra keys.`;
}

function buildUserPrompt({ items }) {
  return `Translate the following UI strings. Return ONLY a JSON object with the same keys.

${JSON.stringify(items, null, 2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main

async function withRetry(fn, attempts = CONFIG.retryAttempts, label = "op") {
  let lastErr;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const delay = CONFIG.retryBackoffMs * (i + 1);
        console.warn(`  ⚠ ${label} failed (attempt ${i + 1}): ${err.message}. retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function processBatch({ batch, language, groq, glossary, verbose }) {
  const items = Object.fromEntries(batch.map((b) => [b.keyName, b.source]));
  const system = buildSystemPrompt({ language, glossary });
  const user = buildUserPrompt({ items });
  const result = await withRetry(
    () => groq.chatJSON({ system, user }),
    CONFIG.retryAttempts,
    `groq batch (${language}, ${batch.length} keys)`,
  );

  const decisions = batch.map((b) => {
    const candidate = result[b.keyName];
    const validation = validateTranslation(b.source, candidate);
    return {
      ...b,
      candidate: typeof candidate === "string" ? candidate : null,
      valid: validation.ok,
      reason: validation.reason,
    };
  });

  if (verbose) {
    for (const d of decisions) {
      const mark = d.valid ? "✓" : "✗";
      console.log(`    ${mark} ${d.keyName.padEnd(40)} ${d.valid ? "" : `[${d.reason}]`}`);
    }
  }

  return decisions;
}

async function processLanguage({ language, candidates, groq, tolgee, glossary, args }) {
  console.log(`\n🌐 ${language.toUpperCase()} — ${candidates.length} keys to refresh`);
  if (candidates.length === 0) return { written: 0, skipped: 0, failed: 0, samples: [] };

  const batches = chunkArray(candidates, args.batchSize);
  console.log(`   ${batches.length} batches × ~${args.batchSize} keys, concurrency=${args.concurrency}`);

  const allDecisions = [];
  let cursor = 0;
  async function worker() {
    while (cursor < batches.length) {
      const idx = cursor++;
      const batch = batches[idx];
      try {
        const decisions = await processBatch({
          batch,
          language,
          groq,
          glossary,
          verbose: args.verbose,
        });
        allDecisions.push(...decisions);
        process.stdout.write(`   batch ${idx + 1}/${batches.length} done (${decisions.filter((d) => d.valid).length}/${decisions.length} valid)\n`);
      } catch (err) {
        console.error(`   batch ${idx + 1} FAILED: ${err.message}`);
        for (const b of batch) {
          allDecisions.push({ ...b, candidate: null, valid: false, reason: `batch error: ${err.message}` });
        }
      }
    }
  }
  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  // Write back valid ones
  let written = 0;
  let skipped = 0;
  let failed = 0;
  const samples = [];
  for (const d of allDecisions) {
    if (!d.valid) {
      failed += 1;
      continue;
    }
    if (samples.length < 5) {
      samples.push({
        key: d.keyName,
        source: d.source,
        previous: d.previous,
        next: d.candidate,
      });
    }
    if (args.dryRun) {
      skipped += 1;
      continue;
    }
    try {
      await withRetry(
        () =>
          tolgee.writeTranslation({
            keyName: d.keyName,
            keyNamespace: d.keyNamespace,
            language,
            text: d.candidate,
          }),
        CONFIG.retryAttempts,
        `tolgee write ${d.keyName}@${language}`,
      );
      written += 1;
    } catch (err) {
      failed += 1;
      console.error(`   ✗ write failed ${d.keyName}: ${err.message}`);
    }
  }

  return { written, skipped, failed, samples, decisions: allDecisions };
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const tolgeeKey = process.env.TOLGEE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!tolgeeKey) throw new Error("TOLGEE_API_KEY missing in .env.local");
  if (!groqKey) throw new Error("GROQ_API_KEY missing in .env.local");

  const targets = (() => {
    if (!args.target || args.target === "all") return CONFIG.defaultTargets;
    return args.target.split(",").map((s) => s.trim()).filter(Boolean);
  })();
  const keyPatterns = args.keys ? args.keys.split(",").map((s) => s.trim()).filter(Boolean) : null;

  console.log(`Model:        ${args.model}`);
  console.log(`Targets:      ${targets.join(", ")}`);
  console.log(`Mode:         ${args.dryRun ? "DRY-RUN (no writes)" : "WRITE"}`);
  console.log(`Sample limit: ${args.sample ?? "—"}`);
  console.log(`Include:      reviewed=${args.includeReviewed} manual=${args.includeManual}`);
  if (keyPatterns) console.log(`Key patterns: ${keyPatterns.join(", ")}`);

  const tolgee = new TolgeeClient({
    apiUrl: CONFIG.tolgee.apiUrl,
    projectId: CONFIG.tolgee.projectId,
    apiKey: tolgeeKey,
  });
  const groq = new GroqClient({
    baseUrl: CONFIG.groq.baseUrl,
    apiKey: groqKey,
    model: args.model,
  });

  const glossaryPath = resolve(__dirname, "i18n-glossary.json");
  const glossary = JSON.parse(readFileSync(glossaryPath, "utf8"));

  console.log("\nFetching Tolgee translations…");
  const langs = [CONFIG.tolgee.sourceLang, ...targets];
  const keys = await tolgee.fetchAllTranslations(langs);
  console.log(`  ${keys.length} keys total`);

  const summary = {};
  const allReports = {};

  for (const language of targets) {
    const candidates = [];
    for (const k of keys) {
      if (!matchesKeyPattern(k.keyName, keyPatterns)) continue;
      const en = k.translations[CONFIG.tolgee.sourceLang]?.text;
      if (!en || !en.trim()) continue;
      const tr = k.translations[language];
      if (
        !shouldTranslate({
          tr,
          includeReviewed: args.includeReviewed,
          includeManual: args.includeManual,
        })
      ) {
        continue;
      }
      candidates.push({
        keyName: k.keyName,
        keyNamespace: k.keyNamespace,
        source: en,
        previous: tr?.text ?? null,
        previousState: tr?.state ?? "UNTRANSLATED",
        previousAuto: !!tr?.auto,
      });
    }
    const limited = args.sample ? candidates.slice(0, args.sample) : candidates;
    const report = await processLanguage({
      language,
      candidates: limited,
      groq,
      tolgee,
      glossary,
      args,
    });
    summary[language] = {
      considered: limited.length,
      written: report.written,
      dryRunSkipped: report.skipped,
      failed: report.failed,
    };
    allReports[language] = report;

    if (report.samples.length > 0) {
      console.log(`\n   sample diffs (${language}):`);
      for (const s of report.samples) {
        console.log(`   • ${s.key}`);
        console.log(`     EN  : ${s.source}`);
        console.log(`     was : ${s.previous ?? "(empty)"}`);
        console.log(`     new : ${s.next}`);
      }
    }
  }

  console.log("\n──────── SUMMARY ────────");
  for (const [lang, s] of Object.entries(summary)) {
    console.log(
      `  ${lang.padEnd(4)} considered=${s.considered}  written=${s.written}  dry-run=${s.dryRunSkipped}  failed=${s.failed}`,
    );
  }

  if (args.output) {
    writeFileSync(
      args.output,
      JSON.stringify(
        {
          model: args.model,
          dryRun: args.dryRun,
          summary,
          decisions: Object.fromEntries(
            Object.entries(allReports).map(([lang, r]) => [
              lang,
              r.decisions.map((d) => ({
                key: d.keyName,
                source: d.source,
                previous: d.previous,
                candidate: d.candidate,
                valid: d.valid,
                reason: d.reason,
              })),
            ]),
          ),
        },
        null,
        2,
      ),
    );
    console.log(`\nReport written to ${args.output}`);
  }
}

main().catch((err) => {
  console.error("\n✗ FATAL:", err.message);
  process.exit(1);
});
