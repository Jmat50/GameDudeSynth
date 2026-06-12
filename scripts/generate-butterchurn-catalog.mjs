/**
 * Build runtime preset catalog from butterchurn-presets converted JSON + pack metadata.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getBasePresetKeys,
  getExtraPresetKeys,
  getImagePresetKeys,
  getMinimalPresetKeys,
  getNonMinimalPresetKeys,
  getMD1PresetKeys,
} from 'butterchurn-presets/presetPackMeta.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PACK_ORDER = ['base', 'extra', 'image', 'minimal', 'nonMinimal', 'md1', 'other'];

export const PACK_LABELS = {
  base: 'Base',
  extra: 'Extra',
  image: 'Image',
  minimal: 'Minimal',
  nonMinimal: 'Non-Minimal',
  md1: 'MD1',
  other: 'Other',
};

export function slugify(key) {
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 8);
  const safe = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${safe || 'preset'}-${hash}`;
}

export function collectImageRefs(presetJson) {
  const refs = new Set();
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'tex' && typeof child === 'string' && child.trim()) {
        refs.add(child.trim());
      }
      walk(child);
    }
  };
  walk(presetJson);
  return [...refs];
}

function buildKeyToPacks() {
  const packFns = {
    base: getBasePresetKeys,
    extra: getExtraPresetKeys,
    image: getImagePresetKeys,
    minimal: getMinimalPresetKeys,
    nonMinimal: getNonMinimalPresetKeys,
    md1: getMD1PresetKeys,
  };

  const keyToPacks = new Map();
  for (const [packId, fn] of Object.entries(packFns)) {
    for (const key of fn().presets) {
      if (!keyToPacks.has(key)) {
        keyToPacks.set(key, []);
      }
      keyToPacks.get(key).push(packId);
    }
  }
  return keyToPacks;
}

function readOverrides() {
  const overridePath = join(root, 'scripts', 'butterchurn-preset-catalog.json');
  if (!existsSync(overridePath)) {
    return new Map();
  }
  const rows = JSON.parse(readFileSync(overridePath, 'utf8'));
  if (!Array.isArray(rows)) {
    throw new Error(`Expected array in ${overridePath}`);
  }
  return new Map(rows.map((row) => [row.key, row]));
}

function readExclusions() {
  const exclusionPath = join(root, 'scripts', 'butterchurn-preset-exclusions.json');
  if (!existsSync(exclusionPath)) {
    return new Set();
  }
  const rows = JSON.parse(readFileSync(exclusionPath, 'utf8'));
  if (!Array.isArray(rows)) {
    throw new Error(`Expected array in ${exclusionPath}`);
  }
  return new Set(rows.map((row) => row.key));
}

function readPackageVersion(pkgName) {
  const pkgPath = join(root, 'node_modules', pkgName, 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

/**
 * @returns {{ entries: object[], meta: object, warnings: string[] }}
 */
export function generateCatalog() {
  const presetsSrcDir = join(root, 'node_modules', 'butterchurn-presets', 'presets', 'converted');
  if (!existsSync(presetsSrcDir)) {
    throw new Error(`Missing ${presetsSrcDir} — run npm install first`);
  }

  const onDiskKeys = readdirSync(presetsSrcDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort((a, b) => a.localeCompare(b));

  const keyToPacks = buildKeyToPacks();
  const overrides = readOverrides();
  const exclusions = readExclusions();
  const warnings = [];

  for (const key of exclusions) {
    if (!onDiskKeys.includes(key)) {
      warnings.push(`Excluded key not found on disk: ${key}`);
    }
  }

  for (const key of keyToPacks.keys()) {
    if (!onDiskKeys.includes(key)) {
      warnings.push(`Pack metadata key missing from converted/: ${key}`);
    }
  }

  const shippableKeys = onDiskKeys.filter((key) => !exclusions.has(key));
  const packCounts = Object.fromEntries(PACK_ORDER.map((id) => [id, 0]));

  const entries = shippableKeys.map((key, index) => {
    let packs = keyToPacks.get(key);
    if (!packs?.length) {
      packs = ['other'];
      warnings.push(`On-disk preset not in pack metadata: ${key}`);
    }

    for (const packId of packs) {
      packCounts[packId] = (packCounts[packId] ?? 0) + 1;
    }

    const override = overrides.get(key);
    const srcPath = join(presetsSrcDir, `${key}.json`);
    const presetJson = JSON.parse(readFileSync(srcPath, 'utf8'));
    const slug = slugify(key);
    const images = collectImageRefs(presetJson);

    return {
      index,
      key,
      slug,
      url: `./presets/${slug}.json`,
      packs: [...packs].sort((a, b) => PACK_ORDER.indexOf(a) - PACK_ORDER.indexOf(b)),
      vibe: override?.vibe ?? '',
      description: override?.description ?? '',
      images,
    };
  });

  const meta = {
    presetsVersion: readPackageVersion('butterchurn-presets'),
    presetCount: entries.length,
    excludedCount: exclusions.size,
    packs: PACK_ORDER.filter((id) => packCounts[id] > 0 || id === 'other').map((id) => ({
      id,
      label: PACK_LABELS[id],
      count: packCounts[id] ?? 0,
    })),
  };

  return { entries, meta, warnings };
}
