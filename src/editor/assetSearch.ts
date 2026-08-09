import type { AssetItem } from "./assetLibrary";

/**
 * Shared relevance matcher for the asset library.
 *
 * Every surface (in-tab grid, global search, "Mine") used to filter with a
 * different rule, so the same query returned different sets. This is the one
 * implementation: token-based, matches name + badge + tags, and ranks results
 * so exact/prefix hits float to the top.
 */

const norm = (s: string) => s.toLowerCase().trim();

export function tokenize(query: string): string[] {
  return norm(query).split(/\s+/).filter(Boolean).slice(0, 8);
}

/** Searchable haystack for an item, cached per item object. */
const haystacks = new WeakMap<AssetItem, string>();
function haystack(item: AssetItem): string {
  let h = haystacks.get(item);
  if (h === undefined) {
    h = norm(`${item.name} ${item.tag ?? ""} ${(item.tags ?? []).join(" ")} ${item.kind ?? ""}`);
    haystacks.set(item, h);
  }
  return h;
}

/** `-1` when the item does not match; higher is more relevant. */
export function score(item: AssetItem, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const name = norm(item.name);
  const hay = haystack(item);
  let total = 0;
  for (const t of tokens) {
    if (!hay.includes(t)) return -1;
    if (name === t) total += 100;
    else if (name.startsWith(t)) total += 60;
    else if (name.includes(t)) total += 30;
    else total += 8; // matched via tag / badge only
  }
  // Shorter names are usually the more canonical preset.
  return total - Math.min(name.length, 40) / 10;
}

export function hasAllTags(item: AssetItem, activeTags: Set<string>): boolean {
  if (activeTags.size === 0) return true;
  const own = new Set<string>(item.tags ?? []);
  for (const t of activeTags) if (!own.has(t)) return false;
  return true;
}

/** Filter + rank + de-duplicate by id in one pass. */
export function searchAssets(
  items: AssetItem[],
  query: string,
  activeTags: Set<string>
): AssetItem[] {
  const tokens = tokenize(query);
  const seen = new Set<string>();
  const scored: { item: AssetItem; s: number }[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    if (!hasAllTags(item, activeTags)) continue;
    const s = score(item, tokens);
    if (s < 0) continue;
    seen.add(item.id);
    scored.push({ item, s });
  }
  if (tokens.length === 0) return scored.map((x) => x.item);
  return scored.sort((a, b) => b.s - a.s).map((x) => x.item);
}
