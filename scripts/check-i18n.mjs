#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(__dirname, "..", "messages");

const SOURCE_LOCALE = "en";

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return flatten(value, path);
    }
    return [path];
  });
}

function loadLocaleKeys(locale) {
  const filePath = resolve(messagesDir, `${locale}.json`);
  const raw = readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return new Set(flatten(data));
}

function diff(setA, setB) {
  return [...setA].filter((key) => !setB.has(key));
}

const localeFiles = readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

if (!localeFiles.includes(SOURCE_LOCALE)) {
  console.error(`Source locale "${SOURCE_LOCALE}" not found in ${messagesDir}`);
  process.exit(1);
}

const sourceKeys = loadLocaleKeys(SOURCE_LOCALE);
const others = localeFiles.filter((l) => l !== SOURCE_LOCALE);

let hasMismatch = false;
const report = [];

for (const locale of others) {
  const keys = loadLocaleKeys(locale);
  const missing = diff(sourceKeys, keys);
  const extra = diff(keys, sourceKeys);

  if (missing.length || extra.length) {
    hasMismatch = true;
    report.push({ locale, missing, extra });
  }
}

if (!hasMismatch) {
  console.log(
    `i18n key parity OK — ${sourceKeys.size} keys × ${localeFiles.length} locales.`,
  );
  process.exit(0);
}

for (const { locale, missing, extra } of report) {
  console.error(`\n[${locale}] mismatch:`);
  if (missing.length) {
    console.error(`  missing (${missing.length}):`);
    missing.slice(0, 25).forEach((k) => console.error(`    - ${k}`));
    if (missing.length > 25) {
      console.error(`    ... and ${missing.length - 25} more`);
    }
  }
  if (extra.length) {
    console.error(`  extra (${extra.length}):`);
    extra.slice(0, 25).forEach((k) => console.error(`    + ${k}`));
    if (extra.length > 25) {
      console.error(`    ... and ${extra.length - 25} more`);
    }
  }
}

console.error(`\ni18n key parity FAILED for ${report.length} locale(s).`);
process.exit(1);
