/*
 * meta.json schema — single source of truth for module metadata.
 *
 * Every module's meta.json declares schema_version. When the schema evolves
 * (v3, v4…) the loader runs a migration step. Authors only ever read/write
 * the *current* MetaV2 shape; the rest is hidden behind loadMeta().
 */

import { readFile } from 'node:fs/promises';

export interface MetaV2 {
  schema_version: 'v2';
  id: string;                                    // "category/entry"
  title:   { en: string; ko: string };
  subtitle:{ en: string; ko: string };
  description: { en: string; ko: string };       // 80-200 chars, used for og:description
  tier: 'headliner' | 'reference' | 'atom';
  bloom_level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  domain: number;
  category: string;
  layout: 'A' | 'B' | 'C';
  prerequisites: string[];
  leads_to: string[];
  see_also: string[];
  nassau_causes?: number[];
  textbook_refs: { source: string; section: string }[];
  standards: string[];
  interaction_count: number;
  learning_paths: string[];
  seo_keywords: string[];
  estimated_hours: number;
  status: 'draft' | 'shipped' | 'deprecated';
}

export const SITE = {
  origin: 'https://encyclopedia.color',
  name_en: 'Interactive Encyclopedia of Color',
  name_ko: '색채과학 인터랙티브 백과사전',
  twitter_handle: '@encyclopediacolor',
} as const;

/**
 * Load + validate meta.json, migrating older schemas if needed.
 */
export async function loadMeta(path: string): Promise<MetaV2> {
  const raw = JSON.parse(await readFile(path, 'utf-8'));
  // Future migration handlers: if (raw.schema_version === 'v1') return migrateV1ToV2(raw)
  if (!raw.schema_version) {
    return migrateUnversionedToV2(raw);
  }
  if (raw.schema_version !== 'v2') {
    throw new Error(`Unsupported schema_version "${raw.schema_version}" in ${path}`);
  }
  validateV2(raw);
  return raw as MetaV2;
}

function migrateUnversionedToV2(raw: Record<string, unknown>): MetaV2 {
  const meta: MetaV2 = {
    schema_version: 'v2',
    id:        String(raw.id ?? ''),
    title:     (raw.title as MetaV2['title']) ?? { en: '', ko: '' },
    subtitle:  (raw.subtitle as MetaV2['subtitle']) ?? { en: '', ko: '' },
    description: (raw.description as MetaV2['description']) ??
                 ((raw.subtitle as MetaV2['subtitle']) ?? { en: '', ko: '' }),
    tier:      (raw.tier as MetaV2['tier']) ?? 'atom',
    bloom_level: (raw.bloom_level as MetaV2['bloom_level']) ?? 'L2',
    domain:    Number(raw.domain ?? 1),
    category:  String(raw.category ?? ''),
    layout:    (raw.layout as MetaV2['layout']) ?? 'A',
    prerequisites: (raw.prerequisites as string[]) ?? [],
    leads_to:  (raw.leads_to as string[]) ?? [],
    see_also:  (raw.see_also as string[]) ?? [],
    nassau_causes: raw.nassau_causes as number[] | undefined,
    textbook_refs: (raw.textbook_refs as MetaV2['textbook_refs']) ?? [],
    standards: (raw.standards as string[]) ?? [],
    interaction_count: Number(raw.interaction_count ?? 1),
    learning_paths: (raw.learning_paths as string[]) ?? [],
    seo_keywords: (raw.seo_keywords as string[]) ?? [],
    estimated_hours: Number(raw.estimated_hours ?? 0),
    status:    (raw.status as MetaV2['status']) ?? 'draft',
  };
  validateV2(meta);
  return meta;
}

function validateV2(m: MetaV2): void {
  const errors: string[] = [];
  if (!m.id?.includes('/')) errors.push('id must be "category/entry"');
  if (!m.title?.en) errors.push('title.en required');
  if (!m.subtitle?.en) errors.push('subtitle.en required');
  if (!m.description?.en) errors.push('description.en required');
  if (m.description?.en && (m.description.en.length < 60 || m.description.en.length > 200)) {
    errors.push(`description.en must be 60-200 chars (got ${m.description.en.length})`);
  }
  if (!['headliner', 'reference', 'atom'].includes(m.tier)) errors.push('invalid tier');
  if (!['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(m.bloom_level)) errors.push('invalid bloom_level');
  if (!['A', 'B', 'C'].includes(m.layout)) errors.push('invalid layout');
  if (m.textbook_refs?.length === 0) errors.push('at least one textbook_ref required');
  if (errors.length > 0) {
    throw new Error(`meta.json validation failed for "${m.id}":\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * Compose the canonical filename for OG card images.
 *
 *   "refraction-snell/snells-law" → "refraction-snell--snells-law"
 */
export function ogSlug(id: string): string {
  return id.replace(/\//g, '--');
}

/**
 * Compose the canonical URL for a module.
 */
export function moduleUrl(id: string): string {
  return `${SITE.origin}/modules/${id}/`;
}
