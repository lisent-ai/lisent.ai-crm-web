#!/usr/bin/env node
/**
 * Pulls translations from Tolgee into messages/<lang>.json (nested ICU JSON,
 * matching the format the next-intl loader expects).
 *
 * Why not `tolgee pull`? @tolgee/cli@2.16's path template treats
 * `{languageTag}` as a literal directory under our config and produces
 * messages/{languageTag}.json/<lang>.json. We rebuild the export ourselves
 * against the v2 REST API so the output lands in messages/<lang>.json.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const messagesDir = resolve(repoRoot, "messages");

const TOLGEE_API_URL = process.env.TOLGEE_API_URL || "https://i18n.lisent.ai";
const PROJECT_ID = 2;
const LANGUAGES = [
  "en", "tr", "de", "fr", "es", "it", "pt", "nl",
  "pl", "ru", "ar", "sv", "da", "fi",
];

function loadDotEnv() {
  const envPath = resolve(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

function setNested(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (cur[key] == null || typeof cur[key] !== "object" || Array.isArray(cur[key])) {
      cur[key] = {};
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

async function main() {
  loadDotEnv();
  const apiKey = process.env.TOLGEE_API_KEY;
  if (!apiKey) throw new Error("TOLGEE_API_KEY missing in .env.local");

  console.log(`Fetching from ${TOLGEE_API_URL}/v2/projects/${PROJECT_ID} for ${LANGUAGES.length} languages…`);
  const url = `${TOLGEE_API_URL}/v2/projects/${PROJECT_ID}/translations?size=5000&languages=${LANGUAGES.join(",")}`;
  const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
  if (!res.ok) throw new Error(`Tolgee error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const keys = json._embedded?.keys ?? [];
  const totalKeys = json.page?.totalElements ?? 0;
  if (keys.length < totalKeys) {
    throw new Error(`Got ${keys.length}/${totalKeys} keys; pagination needed (raise size).`);
  }
  console.log(`  fetched ${keys.length} keys`);

  for (const lang of LANGUAGES) {
    const tree = {};
    let translatedCount = 0;
    let untranslatedCount = 0;
    for (const k of keys) {
      const t = k.translations?.[lang];
      const text = t?.text ?? null;
      if (text != null && text !== "") {
        setNested(tree, k.keyName, text);
        translatedCount += 1;
      } else {
        untranslatedCount += 1;
      }
    }
    const outPath = resolve(messagesDir, `${lang}.json`);
    writeFileSync(outPath, `${JSON.stringify(tree, null, 2)}\n`);
    console.log(`  ${lang}: ${translatedCount} translated, ${untranslatedCount} empty → ${outPath}`);
  }

  console.log("\n✅ Done");
}

main().catch((err) => {
  console.error("✗ FATAL:", err.message);
  process.exit(1);
});
