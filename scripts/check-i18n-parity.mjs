#!/usr/bin/env node
// Verifies that en/ru message files contain identical key paths, and that
// base and dashboard files don't declare the same top-level namespace
// (they are shallow-merged in src/i18n/request.ts — a collision would
// silently drop the base namespace).
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function load(rel) {
  return JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
}

function keyPaths(obj, prefix = '') {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      paths.push(...keyPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

let failed = false;

function comparePair(label, enRel, ruRel) {
  const en = new Set(keyPaths(load(enRel)));
  const ru = new Set(keyPaths(load(ruRel)));
  const missingInRu = [...en].filter((k) => !ru.has(k));
  const missingInEn = [...ru].filter((k) => !en.has(k));
  if (missingInRu.length || missingInEn.length) {
    failed = true;
    console.error(`✗ ${label}: key mismatch`);
    for (const k of missingInRu) console.error(`    missing in ru: ${k}`);
    for (const k of missingInEn) console.error(`    missing in en: ${k}`);
  } else {
    console.log(`✓ ${label}: ${en.size} keys in sync`);
  }
}

comparePair('messages/{en,ru}.json', 'messages/en.json', 'messages/ru.json');
comparePair(
  'messages/dashboard/{en,ru}.json',
  'messages/dashboard/en.json',
  'messages/dashboard/ru.json'
);

for (const locale of ['en', 'ru']) {
  const base = Object.keys(load(`messages/${locale}.json`));
  const dashboard = new Set(Object.keys(load(`messages/dashboard/${locale}.json`)));
  const collisions = base.filter((ns) => dashboard.has(ns));
  if (collisions.length) {
    failed = true;
    console.error(
      `✗ ${locale}: namespace collision between base and dashboard: ${collisions.join(', ')}`
    );
  }
}

// A dashboard namespace re-declaring a Common string is how "Отмена" ended up
// translated fourteen times over: both copies stay in ru/en parity, so the check
// above sees nothing wrong while the two drift apart word by word. Only an exact
// value match counts as a duplicate — a namespace saying "Загрузка навыков…"
// where Common says "Загрузка..." is deliberately more specific and stays.
{
  const commonEn = load('messages/en.json').Common ?? {};
  const commonRu = load('messages/ru.json').Common ?? {};
  const dashEn = load('messages/dashboard/en.json');
  const dashRu = load('messages/dashboard/ru.json');
  const dupes = [];
  for (const [ns, keys] of Object.entries(dashEn)) {
    if (!keys || typeof keys !== 'object') continue;
    for (const [k, v] of Object.entries(keys)) {
      if (typeof v !== 'string') continue;
      if (v === commonEn[k] && dashRu[ns]?.[k] === commonRu[k]) dupes.push(`${ns}.${k}`);
    }
  }
  if (dupes.length) {
    failed = true;
    console.error("✗ dashboard namespaces duplicate Common verbatim — read them with useTranslations('Common'):");
    for (const d of dupes) console.error(`    ${d}`);
  } else {
    console.log('✓ no verbatim duplicates of Common');
  }
}

if (failed) process.exit(1);
console.log('✓ no namespace collisions');
