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

if (failed) process.exit(1);
console.log('✓ no namespace collisions');
