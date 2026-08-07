/**
 * Read-only view over the NOVA Studio asset catalog for MCP tools.
 * Pure data helpers — no env reads, no I/O.
 */
import {
  AUDIO_LIB,
  EFFECTS_TREE,
  FILTERS,
  STICKERS,
  STOCK,
  TEMPLATES,
  TITLES,
  TRANSITIONS,
  type AssetItem,
  type EffectCategory,
} from "@/editor/assetLibrary";
import { compileRenderProgram } from "@/editor/effectRuntime";

export type CatalogEntry = {
  id: string;
  name: string;
  library: string;
  category: string;
  tag?: string;
  kind: string;
  tags: string[];
  duration?: string;
};

function flatten(cat: EffectCategory, path: string[]): CatalogEntry[] {
  const label = [...path, cat.label];
  const own = (cat.items ?? []).map((i) => entry(i, "effects", label.join(" › ")));
  const kids = (cat.children ?? []).flatMap((c) => flatten(c, label));
  // Parent "items" are the union of children; keep only leaf-level entries when children exist.
  return cat.children?.length ? kids : own;
}

function entry(item: AssetItem, library: string, category: string): CatalogEntry {
  return {
    id: item.id,
    name: item.name,
    library,
    category,
    tag: item.tag,
    kind: item.kind ?? "effect",
    tags: item.tags ?? [],
    duration: item.duration,
  };
}

const POOLS: Array<[string, AssetItem[]]> = [
  ["filters", FILTERS],
  ["transitions", TRANSITIONS],
  ["titles", TITLES],
  ["stickers", STICKERS],
  ["templates", TEMPLATES],
  ["stock", STOCK],
  ["audio", AUDIO_LIB],
];

let cached: CatalogEntry[] | null = null;

export function allEntries(): CatalogEntry[] {
  if (cached) return cached;
  const seen = new Set<string>();
  const out: CatalogEntry[] = [];
  const push = (e: CatalogEntry) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    out.push(e);
  };
  EFFECTS_TREE.forEach((c) => flatten(c, []).forEach(push));
  POOLS.forEach(([lib, pool]) =>
    pool.forEach((i) => push(entry(i, lib, lib.charAt(0).toUpperCase() + lib.slice(1))))
  );
  cached = out;
  return out;
}

export function findItem(id: string): { item: AssetItem; entry: CatalogEntry } | null {
  const found = allEntries().find((e) => e.id === id);
  if (!found) return null;
  const pools: AssetItem[] = [
    ...EFFECTS_TREE.flatMap((c) => [
      ...(c.items ?? []),
      ...(c.children?.flatMap((cc) => cc.items ?? []) ?? []),
    ]),
    ...POOLS.flatMap(([, p]) => p),
  ];
  const item = pools.find((i) => i.id === id);
  return item ? { item, entry: found } : null;
}

export function describeItem(item: AssetItem) {
  const program = item.renderProgram ?? compileRenderProgram(item);
  return {
    id: item.id,
    name: item.name,
    tag: item.tag,
    kind: item.kind ?? "effect",
    tags: item.tags ?? [],
    duration: item.duration,
    engine: program.engine,
    effectType: program.type,
    logicId: program.logicId,
    defaults: {
      intensity: Number(program.intensity.toFixed(3)),
      motion: Number(program.motion.toFixed(3)),
      warp: Number(program.warp.toFixed(3)),
      trail: Number(program.trail.toFixed(3)),
    },
    motion: {
      trajectory: program.motionSig.trajectory,
      easing: program.motionSig.curve,
      periodSeconds: Number(program.motionSig.period.toFixed(2)),
      shutterDegrees: Math.round(program.motionSig.shutter),
    },
  };
}

export function categoryTree() {
  const walk = (c: EffectCategory): unknown => ({
    id: c.id,
    label: c.label,
    count: c.count,
    badge: c.badge,
    children: c.children?.map(walk),
  });
  return {
    effects: EFFECTS_TREE.map(walk),
    libraries: POOLS.map(([lib, pool]) => ({ id: lib, label: lib, count: pool.length })),
    total: allEntries().length,
  };
}
