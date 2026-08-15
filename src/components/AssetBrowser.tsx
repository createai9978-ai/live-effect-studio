import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { hasAllTags, searchAssets, score, tokenize } from "../editor/assetSearch";
import { cn } from "../utils/cn";
import { cssEase, motionSignatureFor, type MotionFlavor } from "../editor/motionEngine";
import EditableText from "../admin/EditableText";
import {
  AUDIO_LIB,
  AssetItem,
  AssetTab,
  ContentTag,
  EFFECTS_TREE,
  EFFECT_DRAG_MIME,
  EffectCategory,
  EffectIcon,
  FILTERS,
  STICKERS,
  STOCK,
  TAB_META,
  TAG_META,
  TEMPLATES,
  TITLES,
  TRANSITIONS,
  ThumbGlyph,
  findAssetItem,
  loadFavorites,
  previewStyleFor,
  saveFavorites,
  LIB_TREES,
} from "../editor/assetLibrary";
import AiToolPopup from "./AiToolPopup";
import LivePreviewVideo from "./LivePreviewVideo";
import { previewClipFor, previewOffsetFor } from "../editor/previewVideos";
import { compileRenderProgram } from "../editor/effectRuntime";


type Props = {
  open: boolean;
  initialTab?: AssetTab;
  onClose: () => void;
  onApplyEffect: (item: AssetItem) => void;
  /** Apply the preset as a global grade across every timeline clip. */
  onApplyEffectToTimeline?: (item: AssetItem) => void;

  hasProjectMedia: boolean;
  onOpenImport: () => void;
  /** URL (or data-URL) of the currently selected clip's frame — powers live thumbnail previews. */
  previewFrameUrl?: string | null;
  /** Human-readable name of the selected clip, shown in the preview badge. */
  previewClipName?: string | null;
  projectClipSrc?: string | null;
  /** The user's own imported photos/videos/audio, shown in the "Mine" tab. */
  myMedia?: AssetItem[];
  onHoverEffect?: (id: string | null) => void;
};

export default function AssetBrowser({
  open,
  initialTab = "effects",
  onClose,
  onApplyEffect,
  onApplyEffectToTimeline,

  hasProjectMedia,
  onOpenImport,
  previewFrameUrl,
  previewClipName,
  projectClipSrc,
  myMedia = [],
  onHoverEffect,
}: Props) {
  const [tab, setTab] = useState<AssetTab>(initialTab);
  const [query, setQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  // Keep typing responsive: the (expensive) grid re-filter runs at low priority.
  const deferredQuery = useDeferredValue(query);
  const deferredGlobalQuery = useDeferredValue(globalQuery);
  const [catByTab, setCatByTab] = useState<Record<string, string>>({});
  const treeForTab = (t: AssetTab): EffectCategory[] | null =>
    t === "effects" ? EFFECTS_TREE : LIB_TREES[t] ?? null;
  const activeCat =
    catByTab[tab] ?? (tab === "effects" ? "cinema-grade" : treeForTab(tab)?.[0]?.id ?? "");
  const setActiveCat = (id: string) => setCatByTab((m) => ({ ...m, [tab]: id }));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "cinema-grade": true,
    "motion-lab": true,
    "neural-fx": true,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  // Live auto-suggestions across the entire catalog.
  const suggestions = useMemo<AssetItem[]>(() => {
    const q = deferredGlobalQuery.trim();
    if (q.length < 2) return [];
    const pool = [
      ...allItemsForTab("effects"),
      ...allItemsForTab("filters"),
      ...allItemsForTab("transitions"),
      ...allItemsForTab("titles"),
      ...allItemsForTab("stickers"),
      ...allItemsForTab("templates"),
    ];
    return searchAssets(pool, q, new Set<string>()).slice(0, 7);
  }, [deferredGlobalQuery]);


  const handleHover = (id: string | null) => {
    setHovered(id);
    onHoverEffect?.(id);
  };

  // ---- favourites (persisted to localStorage) ----
  const [thumbSize, setThumbSize] = useState<"s" | "m" | "l">("m");
  const [pinnedPreviewId, setPinnedPreviewId] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<Set<ContentTag>>(new Set());
  const [aiToolItem, setAiToolItem] = useState<AssetItem | null>(null);

  /** AI cards should open the tool popup; everything else applies directly. */
  const handleCardActivate = (it: AssetItem) => {
    const isAiTool =
      it.tag === "AI" || (it.tags ?? []).includes("ai") || it.glyph === "beauty";
    if (isAiTool) setAiToolItem(it);
    else onApplyEffect(it);
  };

  const toggleTag = (t: ContentTag) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveFavorites(next);
      return next;
    });
  };
  const clearFavorites = () => {
    setFavorites(new Set());
    saveFavorites(new Set());
  };
  const favoriteItems: AssetItem[] = useMemo(
    () => [...favorites].map(findAssetItem).filter(Boolean) as AssetItem[],
    [favorites]
  );

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-[#0F1117]/95 backdrop-blur-md">
      {/* ============ Header row 1: brand + global search + close ============ */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] bg-[#181B24]/80 backdrop-blur-xl px-3 py-2">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow shadow-violet-500/30">
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 2l2.5 5 5.5.8-4 3.8 1 5.4-5-2.6-5 2.6 1-5.4-4-3.8 5.5-.8L12 2z" />
            </svg>
          </div>
          <span className="text-[12px] font-semibold text-zinc-100">Asset Library</span>
        </div>

        {/* Sleek command-palette-style search bar with live suggestions */}
        <div className="relative mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-xl bg-black/45 px-3.5 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_24px_-12px_rgba(139,92,246,0.5)] ring-1 ring-white/[0.07] transition focus-within:shadow-[0_0_0_1px_rgba(0,229,255,0.35),0_10px_32px_-10px_rgba(0,229,255,0.45)] focus-within:ring-cyan-400/50">
            <svg className="h-4 w-4 shrink-0 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              autoFocus
              value={globalQuery}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setShowSuggest(true);
              }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => window.setTimeout(() => setShowSuggest(false), 120)}
              placeholder="Search effects, transitions, filters, titles… or type a tag like  cinematic"
              className="flex-1 bg-transparent text-[13px] text-zinc-100 outline-none placeholder-zinc-500"
            />
            {activeTags.size > 0 && (
              <span className="hidden rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/30 md:inline">
                {activeTags.size} tag{activeTags.size === 1 ? "" : "s"}
              </span>
            )}
            <span className="hidden rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 md:inline">
              ⌘K
            </span>
            {globalQuery && (
              <button
                onClick={() => setGlobalQuery("")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition hover:bg-white/[0.12] hover:text-zinc-100"
                title="Clear search"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {showSuggest && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141824]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setGlobalQuery(s.name);
                    setShowSuggest(false);
                  }}
                  className="nova-suggest-item flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition hover:bg-white/[0.06]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_6px] shadow-cyan-300/70" />
                  <span className="flex-1 truncate text-[12px] text-zinc-200">{s.name}</span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-zinc-400">
                    {s.tag ?? "preset"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>


        <div className="flex shrink-0 items-center gap-2">
          <button className="hidden items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-zinc-400 transition hover:bg-white/[0.05] sm:flex">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Download Pack
          </button>
          <button
            onClick={onClose}
            title="Close Asset Library (Esc)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ============ Tag filter chips ============ */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] bg-[#10141F] px-3 py-1.5 nova-scroll-thin">
        <span className="mr-1 shrink-0 text-[9.5px] uppercase tracking-widest text-zinc-600">Tags</span>
        {TAG_META.map((t) => {
          const active = activeTags.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggleTag(t.id)}
              style={active ? { boxShadow: `0 0 0 1px ${t.glow}55, 0 6px 14px -6px ${t.glow}80` } : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition",
                active
                  ? cn(t.bg, t.text, "ring-1", t.ring)
                  : "bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.05] hover:bg-white/[0.07] hover:text-zinc-100"
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: t.glow, boxShadow: active ? `0 0 6px ${t.glow}` : undefined }}
              />
              {t.label}
            </button>
          );
        })}
        {activeTags.size > 0 && (
          <button
            onClick={() => setActiveTags(new Set())}
            className="ml-auto shrink-0 rounded-full border border-white/[0.06] px-2 py-1 text-[10px] text-zinc-500 transition hover:border-fuchsia-400/40 hover:text-fuchsia-300"
          >
            Clear tags
          </button>
        )}
      </div>

      {/* ============ Header row 2: colour-coded category tabs ============ */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-white/[0.06] bg-[#181B24]/80 backdrop-blur-xl px-3 py-1.5 transition",
          globalQuery && "pointer-events-none opacity-40"
        )}
      >
        {TAB_META.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={active ? { boxShadow: `0 -1px 0 ${t.color.glow} inset` } : undefined}
              className={cn(
                "group relative flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] transition",
                active
                  ? cn(t.color.bg, t.color.text, "ring-1", t.color.ring, "text-white")
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded",
                  active ? t.color.bg : ""
                )}
              >
                <TabIcon icon={t.icon} active={active} color={active ? t.color.text : undefined} />
              </span>
              <EditableText id={`tab.${t.id}`} text={t.label} />
              {active && <span className={cn("h-1 w-1 rounded-full", t.color.dot)} />}
              {t.badge && (
                <span className="rounded bg-gradient-to-r from-fuchsia-500 to-orange-400 px-1 py-px text-[7.5px] font-bold text-white">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
        {previewClipName && (
          <div className="ml-auto hidden items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-200 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400/70" />
            Live previews from <span className="max-w-[140px] truncate font-medium">{previewClipName}</span>
          </div>
        )}
      </div>

      {/* ============ Body ============ */}
      <div className="flex min-h-0 flex-1">
        {treeForTab(tab) && !globalQuery && (
          <EffectsSidebar
            tree={treeForTab(tab)!}
            label={TAB_META.find((t) => t.id === tab)?.label ?? "assets"}
            query={query}
            onQueryChange={setQuery}
            activeCat={activeCat}
            onSelectCat={setActiveCat}
            expanded={expanded}
            onToggleExpand={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Sub-header (in-tab search + context info) — hidden when global search is active */}
          {!globalQuery && (
            <div className="flex items-center gap-3 border-b border-white/[0.05] bg-[#181B24] px-4 py-2">
              <div className="flex flex-1 items-center gap-2 rounded-md bg-black/40 px-2.5 py-1.5 ring-1 ring-white/[0.06] focus-within:ring-violet-500/50">
                <svg className="h-3.5 w-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${TAB_META.find((t) => t.id === tab)?.label ?? "assets"}…`}
                  className="w-full bg-transparent text-[12px] text-zinc-100 outline-none placeholder-zinc-600"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-[10px] text-zinc-600 transition hover:text-zinc-300"
                  >
                    clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="hidden rounded border border-white/[0.06] px-1.5 py-0.5 md:inline">
                  {treeForTab(tab) ? currentCatLabel(activeCat) : TAB_META.find((t) => t.id === tab)?.label}
                </span>
                <button
                  title="Grid"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="8" height="8" rx="1" />
                    <rect x="13" y="3" width="8" height="8" rx="1" />
                    <rect x="3" y="13" width="8" height="8" rx="1" />
                    <rect x="13" y="13" width="8" height="8" rx="1" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Grid or media picker */}
          {/* Sub-header 2: adjustable thumbnail sizes + count */}
          {!globalQuery && (
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] bg-[#10141F] px-4 py-1.5">
              <span className="text-[10px] text-zinc-600">Thumbnail</span>
              <div className="flex items-center rounded-md border border-white/[0.06] bg-black/40 p-0.5">
                {(["s", "m", "l"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setThumbSize(s)}
                    className={cn(
                      "flex h-5 w-6 items-center justify-center rounded text-[9px] font-bold transition",
                      thumbSize === s
                        ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow shadow-violet-600/40"
                        : "text-zinc-500 hover:text-zinc-100"
                    )}
                    title={`${s === "s" ? "Small" : s === "m" ? "Medium" : "Large"} thumbnails`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-[9.5px] text-zinc-600">
                <span className="hidden sm:inline">Hover a card to preview it in the reference monitor →</span>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {globalQuery ? (
                <GlobalSearchResults
                  query={deferredGlobalQuery}
                  onApply={handleCardActivate}
                  onHover={handleHover}
                  previewFrameUrl={previewFrameUrl ?? null}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  thumbSize={thumbSize}
                  activeTags={activeTags}
                />
              ) : tab === "mine" ? (
                <MineTab
                  items={[...myMedia, ...favoriteItems]
                    .filter((i, idx, arr) => arr.findIndex((x) => x.id === i.id) === idx)
                    .filter((i) => hasAllTags(i, activeTags) && score(i, tokenize(deferredQuery)) >= 0)}
                  onApply={handleCardActivate}
                  onHover={handleHover}
                  previewFrameUrl={previewFrameUrl ?? null}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onClearAll={clearFavorites}
                  onSwitchTab={setTab}
                  thumbSize={thumbSize}
                />
              ) : (
                <BrowserContent
                  tab={tab}
                  query={deferredQuery}
                  activeCat={activeCat}
                  onApply={handleCardActivate}
                  onHover={handleHover}
                  hasProjectMedia={hasProjectMedia}
                  onOpenImport={onOpenImport}
                  previewFrameUrl={previewFrameUrl ?? null}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  thumbSize={thumbSize}
                  activeTags={activeTags}
                />
              )}
            </div>

            {/* ============ Docked reference monitor ============ */}
            <ReferenceMonitor
              item={findItem(hovered) ?? (pinnedPreviewId ? findItem(pinnedPreviewId) : null)}
              previewFrameUrl={previewFrameUrl ?? null}
              previewClipName={previewClipName ?? null}
              projectClipSrc={projectClipSrc ?? null}
              pinned={!!pinnedPreviewId && hovered === null}
              onPin={() => setPinnedPreviewId(hovered)}
              onUnpin={() => setPinnedPreviewId(null)}
              onApply={handleCardActivate}
              onApplyAll={onApplyEffectToTimeline}

              favorited={hovered ? favorites.has(hovered) : (pinnedPreviewId ? favorites.has(pinnedPreviewId) : false)}
              onToggleFavorite={() => {
                const id = hovered ?? pinnedPreviewId;
                if (id) toggleFavorite(id);
              }}
            />
          </div>

          {/* Detail rail — description of the hovered item */}
          <DetailRail item={findItem(hovered)} hasPreview={!!previewFrameUrl} />
        </main>
      </div>

      {/* AI Tools popup — opens when a user clicks an AI-tagged effect card */}
      <AiToolPopup
        item={aiToolItem}
        referenceImageUrl={previewFrameUrl ?? aiToolItem?.preview ?? null}
        onClose={() => setAiToolItem(null)}
        onApply={onApplyEffect}
        onToggleFavorite={toggleFavorite}
        favorited={aiToolItem ? favorites.has(aiToolItem.id) : false}
      />
    </div>
  );
}

/* ================= Effects sidebar tree ================= */
function EffectsSidebar({
  tree,
  label,
  query,
  onQueryChange,
  activeCat,
  onSelectCat,
  expanded,
  onToggleExpand,
}: {
  tree: EffectCategory[];
  label: string;
  query: string;
  onQueryChange: (q: string) => void;
  activeCat: string;
  onSelectCat: (id: string) => void;
  expanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#10141F]/80 backdrop-blur-xl">
      <div className="border-b border-white/[0.05] p-3">
        <div className="flex items-center gap-2 rounded-md bg-black/40 px-2 py-1.5 ring-1 ring-white/[0.06] focus-within:ring-violet-500/50">
          <svg className="h-3 w-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="w-full bg-transparent text-[11px] text-zinc-100 outline-none placeholder-zinc-600"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {tree.map((cat) => (
          <CategoryNode
            key={cat.id}
            cat={cat}
            depth={0}
            activeCat={activeCat}
            onSelectCat={onSelectCat}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </div>

      <div className="border-t border-white/[0.05] p-3">
        <div className="rounded-lg border border-violet-400/25 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-fuchsia-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.5 5 5.5.8-4 3.8 1 5.4-5-2.6-5 2.6 1-5.4-4-3.8 5.5-.8L12 2z" />
            </svg>
            <span className="text-[11px] font-semibold text-zinc-100">NOVA Pro</span>
          </div>
          <p className="text-[9.5px] leading-relaxed text-zinc-400">
            Unlock 2,400+ premium effects, AI presets, and 4K stock media.
          </p>
          <button className="mt-2 w-full rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 py-1 text-[10px] font-medium text-white shadow-md shadow-violet-600/30 transition hover:brightness-110">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}

function CategoryNode({
  cat,
  depth,
  activeCat,
  onSelectCat,
  expanded,
  onToggleExpand,
}: {
  cat: EffectCategory;
  depth: number;
  activeCat: string;
  onSelectCat: (id: string) => void;
  expanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
}) {
  const isOpen = !!expanded[cat.id];
  const active = activeCat === cat.id;
  const hasChildren = !!cat.children?.length;
  const accent = cat.accent ?? "#a78bfa";
  const gradA = cat.gradient?.[0] ?? "#7c3aed";
  const gradB = cat.gradient?.[1] ?? "#d946ef";

  return (
    <div>
      <button
        onClick={() => {
          onSelectCat(cat.id);
          if (hasChildren) onToggleExpand(cat.id);
        }}
        style={
          active
            ? {
                background: `linear-gradient(90deg, ${gradA}22, ${gradB}0a 60%, transparent)`,
                boxShadow: `inset 3px 0 0 ${accent}, 0 6px 22px -12px ${accent}bb`,
              }
            : undefined
        }
        className={cn(
          "relative flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-[11px] transition-all duration-150",
          active
            ? "text-white"
            : "text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-100"
        )}
        // Depth-based indent (extra room for the left accent rail on active)
        // 6px base + 12px per level
      >
        <span style={{ paddingLeft: `${6 + depth * 12}px` }} />
        {hasChildren ? (
          <svg
            className={cn(
              "h-2.5 w-2.5 shrink-0 transition-transform",
              isOpen && "rotate-90",
              active ? "text-white" : "text-zinc-500"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        ) : (
          <span className="w-2.5" />
        )}

        {/* Coloured, glowing icon chip */}
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition",
            active ? "ring-1" : "bg-white/[0.04]"
          )}
          style={
            active
              ? {
                  background: `linear-gradient(135deg, ${gradA}55, ${gradB}33)`,
                  boxShadow: `0 0 12px -2px ${accent}aa`,
                  ["--tw-ring-color" as string]: accent + "80",
                }
              : undefined
          }
        >
          <svg
            className="h-3 w-3"
            style={{ color: active ? accent : undefined }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={ICON_PATHS[cat.icon]} />
          </svg>
        </span>

        <span className={cn("flex-1 truncate font-medium", active && "tracking-tight")}>{cat.label}</span>

        {cat.badge && (
          <span
            className="rounded px-1 py-px text-[7.5px] font-bold uppercase tracking-wider text-white shadow"
            style={{
              background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
              boxShadow: `0 0 8px -2px ${accent}88`,
            }}
          >
            {cat.badge}
          </span>
        )}

        <span
          className={cn(
            "rounded px-1.5 py-px font-mono text-[8.5px]",
            active ? "bg-white/15 text-white" : "bg-white/[0.05] text-zinc-500"
          )}
        >
          {cat.count}
        </span>
      </button>

      {isOpen && cat.children && (
        <div className="my-0.5 space-y-0.5 border-l border-white/[0.06] pl-1 ml-4">
          {cat.children.map((c) => (
            <CategoryNode
              key={c.id}
              cat={c}
              depth={depth + 1}
              activeCat={activeCat}
              onSelectCat={onSelectCat}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Content grid ================= */
function BrowserContent({
  tab,
  query,
  activeCat,
  onApply,
  onHover,
  hasProjectMedia,
  onOpenImport,
  previewFrameUrl,
  favorites,
  onToggleFavorite,
  thumbSize,
  activeTags,
}: {
  tab: AssetTab;
  query: string;
  activeCat: string;
  onApply: (item: AssetItem) => void;
  onHover: (id: string | null) => void;
  hasProjectMedia: boolean;
  onOpenImport: () => void;
  previewFrameUrl: string | null;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  thumbSize: "s" | "m" | "l";
  activeTags: Set<ContentTag>;
}) {
  const items = useMemo(() => itemsForTab(tab, activeCat), [tab, activeCat]);
  const filtered = useMemo(
    () => searchAssets(items, query, activeTags as Set<string>),
    [items, query, activeTags]
  );
  // A query that matches nothing in the open subcategory almost always has hits
  // elsewhere in the tab — widen the search instead of showing a dead end.
  const widened = useMemo(() => {
    if (filtered.length > 0 || (!query.trim() && activeTags.size === 0)) return null;
    const all = searchAssets(allItemsForTab(tab), query, activeTags as Set<string>);
    return all.length ? all : null;
  }, [filtered.length, query, activeTags, tab]);
  const shown = widened ?? filtered;

  // Catalog collections run into the hundreds — render them in pages so the
  // grid (and its live video previews) stays buttery smooth.
  const PAGE = 60;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [tab, activeCat, query, activeTags]);
  const page = shown.slice(0, visible);


  if (tab === "media") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
          <svg className="h-7 w-7 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div className="text-[13px] text-zinc-200">
          {hasProjectMedia ? "Media lives in the Project Bin below" : "Import your own video, audio, or image files"}
        </div>
        <div className="max-w-[320px] text-[10.5px] text-zinc-500">
          Drop files onto the Project Bin or click the button below. Imported clips are drag-and-drop ready for the timeline.
        </div>
        <button
          onClick={onOpenImport}
          className="mt-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
        >
          Import Media…
        </button>
      </div>
    );
  }

  const cols = gridColsFor(tab, thumbSize);

  // Re-write the layout grid from scratch to prevent overlaps and strictly de-dupe card elements
  return (
    <>
      {tab === "effects" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
          <span className="rounded-md bg-violet-500/10 px-2 py-0.5 font-medium text-violet-300 ring-1 ring-violet-500/20">
            {widened ? "All effects" : currentCatLabel(activeCat)}
          </span>
          <span className="text-zinc-700">·</span>
          <span>
            {widened ? (
              <>
                No match in {currentCatLabel(activeCat)} — showing{" "}
                <span className="text-zinc-200">{widened.length}</span> result
                {widened.length === 1 ? "" : "s"} from every category
              </>
            ) : filtered.length === items.length ? (
              <>
                {items.length} unique preset{items.length === 1 ? "" : "s"}
              </>
            ) : (
              <>
                Showing <span className="text-zinc-200">{filtered.length}</span> of {items.length} presets
                <span className="ml-1 text-zinc-600">(filtered)</span>
              </>
            )}
          </span>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2.5 py-12 text-center">
          <svg className="h-8 w-8 text-zinc-700 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <div className="text-[12px] text-zinc-400 font-medium">No results for "{query}"</div>
          <div className="text-[10.5px] text-zinc-600">Try a different keyword or clear the active tag filters</div>
        </div>
      ) : (
        <>
          <div className={cn("grid gap-4 pb-6", cols)}>
            {page.map((it) => (
              <AssetCard
                key={`browser-content-${it.id}`}
                item={it}
                onApply={() => onApply(it)}
                onHover={onHover}
                tall={tab === "audio"}
                ratio={ratioFor(tab)}
                previewFrameUrl={previewFrameUrl}
                favorited={favorites.has(it.id)}
                onToggleFavorite={() => onToggleFavorite(it.id)}
                size={thumbSize}
              />
            ))}
          </div>
          {visible < shown.length && (
            <div className="flex flex-col items-center gap-2 pb-8">
              <button
                onClick={() => setVisible((v) => v + PAGE * 2)}
                className="rounded-xl bg-gradient-to-r from-[#00E5FF]/20 to-[#8A2BE2]/25 px-5 py-2 text-[12px] font-medium text-zinc-100 ring-1 ring-white/10 backdrop-blur transition hover:from-[#00E5FF]/30 hover:to-[#8A2BE2]/40 hover:ring-[#00E5FF]/40"
              >
                Load more presets
              </button>
              <span className="text-[10.5px] text-zinc-500">
                Showing {page.length} of {shown.length}
              </span>
            </div>
          )}
        </>
      )}

    </>
  );
}

/* ================= Asset card ================= */
function AssetCard({
  item,
  onApply,
  onHover,
  tall,
  // previewFrameUrl is intentionally unused: cards now stream live video previews.

  favorited,
  onToggleFavorite,
  size = "m",
  ratio,
}: {
  item: AssetItem;
  onApply: () => void;
  onHover: (id: string | null) => void;
  tall?: boolean;
  /** Filmora-style tile shape for the tab this card lives in. */
  ratio?: "video" | "square" | "wide" | "portrait";
  previewFrameUrl: string | null;
  favorited: boolean;
  onToggleFavorite: () => void;
  size?: "s" | "m" | "l";
}) {
  const [localHovered, setLocalHovered] = useState(false);

  // Map the effect to a *unique* deterministic camera move + grade.
  // The motion signature is derived from the preset id so no two cards ever
  // animate identically — no shared template loop, no repeated timing.
  const cardStyles = useMemo(() => {
    const lower = item.name.toLowerCase();
    const result = { filter: "", transform: "", animation: "" };

    const flavor: MotionFlavor =
      item.tag === "GLITCH" ? "glitch"
      : item.tag === "AI" || item.tag === "BODY" ? "ai"
      : item.tag === "OVERLAY" || item.tag === "LUT" ? "atmosphere"
      : /whip|zoom|shake|spin|ramp|slide|punch|impact|kinetic/.test(lower) ? "kinetic"
      : "cinematic";

    const sig = motionSignatureFor(item.id, flavor);
    const keyframes: Record<string, string> = {
      dollyPush: "nova-mo-dolly",
      arcSweep: "nova-mo-arc",
      handheldBreath: "nova-mo-handheld",
      pendulumSwing: "nova-mo-pendulum",
      whipPan: "nova-mo-whip",
      spiralPush: "nova-mo-spiral",
      parallaxSlide: "nova-mo-parallax",
      vertigoZoom: "nova-mo-vertigo",
      riseFloat: "nova-mo-rise",
      shutterPulse: "nova-mo-shutter",
    };
    const name = keyframes[sig.trajectory] ?? "nova-mo-dolly";
    // Slow the signature period down a touch for browsing comfort, keep the
    // per-preset variance (period, phase, direction) fully intact.
    const duration = (sig.period * 1.35).toFixed(2);
    const delay = (-sig.phase * sig.period).toFixed(2);
    const direction = sig.pingPong ? "alternate" : "normal";
    result.animation = `${name} ${duration}s ${cssEase(sig.curve)} ${delay}s infinite ${direction} both`;


    // Colour treatment per category — contrast/saturation/soft-light only,
    // deliberately hue-rotation-free so footage never turns blue.
    switch (item.tag) {
      case "LUT":
        if (lower.includes("noir") || lower.includes("bleach") || lower.includes("steel")) {
          result.filter = "contrast(1.28) saturate(0.7) brightness(0.93)";
        } else if (lower.includes("golden") || lower.includes("kodak")) {
          result.filter = "contrast(1.12) saturate(1.22) sepia(0.14)";
        } else {
          result.filter = "contrast(1.2) saturate(1.16)";
        }
        break;
      case "FILTER":
        result.filter = lower.includes("vintage") || lower.includes("y2k")
          ? "contrast(1.08) saturate(0.88) sepia(0.18) brightness(1.04)"
          : "contrast(1.14) saturate(1.28) brightness(1.03)";
        break;
      case "GLITCH":
        result.filter = "contrast(1.24) saturate(1.35)";
        break;
      case "OVERLAY":
        result.filter = "contrast(1.06) brightness(1.08) saturate(1.1)";
        break;
      case "BODY":
        result.filter = "contrast(1.18) saturate(1.24) brightness(1.02)";
        break;
      case "AI":
        result.filter = "contrast(1.04) saturate(1.08) brightness(1.06)";
        break;
      case "SPLIT":
      case "TEXT":
      case "ELEMENT":
        result.filter = "contrast(1.06) saturate(1.04)";
        break;
      case "VIRAL":
        result.filter = "contrast(1.16) saturate(1.2)";
        break;
      default:
        break;
    }

    return result;
  }, [item.id, item.name, item.tag]);

  const preview = previewStyleFor(item.glyph);
  const renderProgram = useMemo(() => item.renderProgram ?? compileRenderProgram(item), [item]);
  const previewEffect = useMemo(
    () => ({
      type: renderProgram.type,
      intensity: renderProgram.intensity,
      color: renderProgram.color,
      seed: renderProgram.seed,
      motion: renderProgram.motion,
      warp: renderProgram.warp,
      trail: renderProgram.trail,
      audio: renderProgram.type === "voiceSync" ? 0.8 : 0,
    }),
    [renderProgram]
  );

  /**
   * Always-on look signature. Each card renders its own grade even before
   * hover, derived from the preset's unique seeded render program, so two
   * cards can never read as the same effect. Hue rotation is deliberately
   * kept near-zero (it is what used to push warm footage blue).
   */
  const uniqueLook = useMemo(() => {
    const p = renderProgram;
    const s = p.seed;
    const t = p.type;
    const contrast = 1 + (t === "colorGrade" ? 0.16 : 0.06) + s * 0.26;
    const saturate =
      t === "colorGrade" && p.color[2] < 0.45
        ? 0.25 + s * 0.35
        : 0.85 + p.color[0] * 0.7 + s * 0.2;
    const brightness = 0.94 + p.color[1] * 0.16;
    const sepia = t === "colorGrade" || t === "opticalOverlay" ? 0.05 + s * 0.22 : s * 0.06;
    const parts = [
      `contrast(${contrast.toFixed(3)})`,
      `saturate(${saturate.toFixed(3)})`,
      `brightness(${brightness.toFixed(3)})`,
      sepia > 0.02 ? `sepia(${sepia.toFixed(3)})` : "",
      t === "depthMap" ? `blur(${(0.3 + p.warp * 0.9).toFixed(2)}px)` : "",
      t === "glitchWarp" ? `contrast(${(1 + p.warp * 0.12).toFixed(3)})` : "",
    ].filter(Boolean);
    return [cardStyles.filter, ...parts].filter(Boolean).join(" ");
  }, [renderProgram, cardStyles.filter]);



  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(EFFECT_DRAG_MIME, item.id);
        e.dataTransfer.setData("text/plain", item.name);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onApply}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onApply();
        }
      }}
      onMouseEnter={() => {
        onHover(item.id);
        setLocalHovered(true);
      }}
      onMouseLeave={() => {
        onHover(null);
        setLocalHovered(false);
      }}
      className={cn(
        // Premium hover: subtle lift + scale + violet glow, GPU-composited to stay artefact-free
        "group relative flex cursor-grab flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#171C29] text-left text-zinc-200",
        "transform-gpu [backface-visibility:hidden] will-change-transform",
        "transition-[transform,box-shadow,border-color] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-[3px] hover:scale-[1.025] hover:border-violet-400/50 hover:shadow-[0_20px_44px_-16px_rgba(139,92,246,0.55)]",
        "active:scale-[0.995] active:duration-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",

        "active:cursor-grabbing",
        size === "s" && "text-[10px]",
        size === "l" && "text-[11px]"
      )}
      title={`${item.name} — click to apply · drag onto a timeline clip`}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-[#10141F] [contain:paint]",
          ratio === "square"
            ? "aspect-square"
            : ratio === "portrait"
              ? "aspect-[3/4]"
              : ratio === "wide"
                ? "aspect-[21/9]"
                : ratio === "video"
                  ? "aspect-video"
                  : tall
                    ? "aspect-[4/3]"
                    : size === "s"
                      ? "aspect-[16/10]"
                      : size === "l"
                        ? "aspect-[21/9]"
                        : "aspect-video"
        )}
      >
        {/*
          LIVE PREVIEW — every card streams a real, muted, seamlessly looping
          clip. No static thumbnails, no posters, no scan-line gimmicks and no
          tinted overlays: the effect's own grade is the only colour treatment.
        */}
        <LivePreviewVideo
          src={previewClipFor(item.id)}
          startOffset={previewOffsetFor(item.id)}
          hovered={localHovered}
          effect={previewEffect}
          style={{
            filter: uniqueLook || undefined,
            animation: cardStyles.animation || undefined,
            transformOrigin: "center center",
          }}
        />


        {preview.overlay && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: preview.overlay,
              mixBlendMode: (preview.overlayMix as React.CSSProperties["mixBlendMode"]) ?? undefined,
              opacity: preview.overlayOpacity ?? 1,
            }}
          />
        )}

        {/* Neutral legibility scrim (pure black → transparent, never tinted) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

        {/* Premium hover affordance: soft vignette + play control */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100">
          <div className="flex h-9 w-9 scale-75 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/40 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100">
            <svg className="ml-0.5 h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
        </div>

        {/* badges */}
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
          {item.tag && (
            <span className="rounded bg-black/60 px-1 py-px font-mono text-[8px] font-bold text-cyan-200">
              {item.tag}
            </span>
          )}
          {item.isNew && (
            <span className="rounded bg-gradient-to-r from-fuchsia-500 to-orange-400 px-1 py-px text-[8px] font-bold text-white">
              NEW
            </span>
          )}
        </div>
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          {item.is16K && (
            <span
              className="rounded bg-gradient-to-r from-cyan-400 to-violet-500 px-1 py-px text-[8px] font-black tracking-wide text-white shadow"
              style={{ boxShadow: "0 0 8px -2px rgba(34,211,238,0.7)" }}
            >
              16K
            </span>
          )}
          {item.isAiPro && (
            <span
              className="rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 py-px text-[8px] font-black tracking-wide text-white shadow"
              style={{ boxShadow: "0 0 8px -2px rgba(217,70,239,0.7)" }}
            >
              AI PRO
            </span>
          )}
          {item.isExclusive && (
            <span
              className="rounded bg-gradient-to-r from-amber-400 to-rose-500 px-1 py-px text-[8px] font-black tracking-wider text-black shadow"
              style={{ boxShadow: "0 0 8px -2px rgba(251,191,36,0.7)" }}
            >
              EXCL
            </span>
          )}
          {item.isPro && !item.isAiPro && (
            <span className="rounded bg-black/70 px-1 py-px text-[8px] font-bold text-amber-300 ring-1 ring-amber-300/40">
              PRO
            </span>
          )}
          {item.isFree && (
            <span className="rounded bg-emerald-500/85 px-1 py-px text-[8px] font-bold text-white">
              FREE
            </span>
          )}
        </div>
        {item.duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1 py-px font-mono text-[8.5px] text-zinc-200">
            {item.duration}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10.5px] font-medium text-zinc-200">{item.name}</div>
          <div className="mt-0.5 truncate font-mono text-[7.5px] text-zinc-600">
            {renderProgram.logicId}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={favorited ? "Remove from Mine" : "Add to Mine"}
          aria-label={favorited ? "Remove from favourites" : "Add to favourites"}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition",
            favorited
              ? "text-fuchsia-400 hover:bg-fuchsia-500/15"
              : "text-zinc-600 opacity-0 hover:bg-white/[0.06] hover:text-zinc-200 group-hover:opacity-100"
          )}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
          </svg>
        </button>
      </div>
      {favorited && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-fuchsia-500/85 px-1 py-px text-[8px] font-bold text-white shadow shadow-fuchsia-500/40">
          ♥
        </div>
      )}
    </div>
  );
}

/* ================= Detail rail (hover info) ================= */
function DetailRail({ item, hasPreview }: { item: AssetItem | null; hasPreview: boolean }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-t border-white/[0.05] bg-[#10141F] px-4">
      {item ? (
        <>
          <div
            className="h-6 w-10 shrink-0 rounded-md ring-1 ring-white/10"
            style={{ background: item.gradient }}
          />
          <span className="truncate text-[11px] text-zinc-200">{item.name}</span>
          {item.tag && (
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-zinc-400">
              {item.tag}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-500">
            {hasPreview
              ? "Hover for live preview · Click to apply · Drag to timeline"
              : "Click to apply to selected clip · Drag to timeline"}
          </span>
        </>
      ) : (
        <span className="text-[10px] text-zinc-600">
          {hasPreview ? "Hover a preset to see it applied to your clip" : "Hover a preset to preview details"}
        </span>
      )}
    </div>
  );
}

/* ================= Mine tab (favourites) ================= */
function MineTab({
  items,
  onApply,
  onHover,
  previewFrameUrl,
  favorites,
  onToggleFavorite,
  onClearAll,
  onSwitchTab,
  thumbSize,
}: {
  items: AssetItem[];
  onApply: (item: AssetItem) => void;
  onHover: (id: string | null) => void;
  previewFrameUrl: string | null;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onClearAll: () => void;
  onSwitchTab: (t: AssetTab) => void;
  thumbSize: "s" | "m" | "l";
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/10 ring-1 ring-fuchsia-400/30">
          <svg className="h-7 w-7 text-fuchsia-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
          </svg>
        </div>
        <div className="text-[13px] font-medium text-zinc-200">No favourites yet</div>
        <div className="max-w-[320px] text-[10.5px] leading-relaxed text-zinc-500">
          Hover over any preset and click the heart icon to save it here. Your Mine folder is stored on this device.
        </div>
        <button
          onClick={() => onSwitchTab("effects")}
          className="mt-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
        >
          Browse Effects
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/30">
            ♥ Mine
          </span>
          <span className="text-[10.5px] text-zinc-500">
            <span className="font-medium text-zinc-200">{items.length}</span> favourite
            {items.length === 1 ? "" : "s"} · saved on this device
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-zinc-500 transition hover:border-fuchsia-500/40 hover:text-fuchsia-300"
        >
          Clear all
        </button>
      </div>
      <div className={cn("grid gap-3", gridColsFor("mine", thumbSize))}>
        {items.map((it) => (
          <AssetCard
            key={it.id}
            item={it}
            onApply={() => onApply(it)}
            onHover={onHover}
            previewFrameUrl={previewFrameUrl}
            favorited={favorites.has(it.id)}
            onToggleFavorite={() => onToggleFavorite(it.id)}
            size={thumbSize}
          />
        ))}
      </div>
    </>
  );
}

/* ================= Global search results ================= */
function GlobalSearchResults({
  query,
  onApply,
  onHover,
  previewFrameUrl,
  favorites,
  onToggleFavorite,
  thumbSize,
  activeTags,
}: {
  query: string;
  onApply: (item: AssetItem) => void;
  onHover: (id: string | null) => void;
  previewFrameUrl: string | null;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  thumbSize: "s" | "m" | "l";
  activeTags: Set<ContentTag>;
}) {
  const groups = useMemo(() => {
    const tokens = tokenize(query);
    const match = (i: AssetItem) => {
      if (!hasAllTags(i, activeTags as Set<string>)) return false;
      // No text query: only show results when a tag filter is narrowing things.
      if (tokens.length === 0) return activeTags.size > 0;
      return score(i, tokens) >= 0;
    };

    // Flatten every effects category (including nested children) into named groups
    const buckets: { label: string; items: AssetItem[] }[] = [];
    const walk = (cats: EffectCategory[]) => {
      for (const c of cats) {
        const items = (c.items ?? []).filter(match);
        if (items.length) buckets.push({ label: `Effects · ${c.label}`, items });
        if (c.children) walk(c.children);
      }
    };
    walk(EFFECTS_TREE);

    const pairs: [string, AssetItem[]][] = [
      ["Transitions", TRANSITIONS.filter(match)],
      ["Titles", TITLES.filter(match)],
      ["Filters", FILTERS.filter(match)],
      ["Stickers", STICKERS.filter(match)],
      ["Stock Media", STOCK.filter(match)],
      ["Audio", AUDIO_LIB.filter(match)],
      ["Templates", TEMPLATES.filter(match)],
    ];
    for (const [label, items] of pairs) if (items.length) buckets.push({ label, items });

    // De-dupe by id (categories can share items)
    const seen = new Set<string>();
    return buckets
      .map((b) => ({ label: b.label, items: b.items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true))) }))
      .filter((b) => b.items.length);
  }, [query, activeTags]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <svg className="h-9 w-9 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <div className="text-[12px] text-zinc-500">No matches for "{query}"</div>
        <div className="text-[10px] text-zinc-700">Try shorter keywords like "orbit", "zoom", "flare", "grain"</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
        <span className="rounded bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 px-2 py-0.5 ring-1 ring-violet-400/30">
          Global search
        </span>
        <span>
          <span className="font-medium text-zinc-200">{total}</span> result{total === 1 ? "" : "s"} for
          <span className="ml-1 font-mono text-cyan-200">"{query}"</span>
        </span>
      </div>
      {groups.map((g) => (
        <section key={g.label}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-widest text-zinc-500">
              {g.label}
            </h3>
            <span className="text-[9px] text-zinc-600">{g.items.length}</span>
          </div>
          <div className={cn("grid gap-3", gridColsFor("effects", thumbSize))}>
            {g.items.slice(0, 36).map((it) => (
              <AssetCard
                key={it.id}
                item={it}
                onApply={() => onApply(it)}
                onHover={onHover}
                previewFrameUrl={previewFrameUrl}
                favorited={favorites.has(it.id)}
                onToggleFavorite={() => onToggleFavorite(it.id)}
                size={thumbSize}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}



/* ================= Grid density helper ================= */
function gridColsFor(tab: AssetTab, size: "s" | "m" | "l"): string {
  // Audio and templates get their own column counts (taller cards)
  if (tab === "audio") {
    return size === "s" ? "grid-cols-3" : size === "l" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2";
  }
  if (tab === "templates") {
    return size === "s" ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
         : size === "l" ? "grid-cols-1 md:grid-cols-2"
         :                 "grid-cols-2 lg:grid-cols-3";
  }
  // Stickers are square chips — Filmora packs many more per row.
  if (tab === "stickers") {
    if (size === "s") return "grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10";
    if (size === "l") return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
    return "grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7";
  }
  // Titles are wider name plates.
  if (tab === "titles") {
    if (size === "s") return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
    if (size === "l") return "grid-cols-1 xl:grid-cols-2";
    return "grid-cols-2 xl:grid-cols-3";
  }
  // Default effects/transitions/filters/etc. — 16:9 tiles.
  if (size === "s") return "grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7";
  if (size === "l") return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
}

/** Filmora tile shape per tab. */
function ratioFor(tab: AssetTab): "video" | "square" | "wide" | "portrait" | undefined {
  if (tab === "stickers") return "square";
  if (tab === "titles") return "wide";
  if (tab === "audio") return undefined;
  return "video";
}

/* ================= Docked reference monitor ================= */
function ReferenceMonitor({
  item,
  previewFrameUrl,
  previewClipName,
  pinned,
  onPin,
  onUnpin,
  onApply,
  onApplyAll,
  favorited,
  onToggleFavorite,
}: {
  item: AssetItem | null;
  previewFrameUrl: string | null;
  previewClipName: string | null;
  projectClipSrc?: string | null;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onApply: (item: AssetItem) => void;
  onApplyAll?: (item: AssetItem) => void;

  favorited: boolean;
  onToggleFavorite: () => void;
}) {
  const preview = item ? previewStyleFor(item.glyph) : null;
  // Faster animation timings than the small card previews for a "reference-grade" feel
  const animName = !preview
    ? undefined
    : preview.animate === "shake" ? "nova-shake 0.22s ease-in-out infinite"
    : preview.animate === "pan"     ? "nova-pan 1.4s ease-in-out infinite alternate"
    : preview.animate === "zoom"    ? "nova-zoom 1.3s ease-in-out infinite alternate"
    : preview.animate === "orbit"   ? "nova-orbit 1.6s ease-in-out infinite alternate"
    : preview.animate === "flicker" ? "nova-flicker 0.9s ease-in-out infinite"
    : preview.animate === "pulse"   ? "nova-pulse 1.1s ease-in-out infinite"
    : undefined;

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-[#10141F] xl:flex">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px] shadow-fuchsia-400/70" />
          <span className="text-[11px] font-semibold text-zinc-100">Reference Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          {item && (
            <button
              onClick={pinned ? onUnpin : onPin}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded transition",
                pinned ? "bg-fuchsia-500/25 text-fuchsia-200" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100"
              )}
              title={pinned ? "Unpin — follow hover again" : "Pin this preview"}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5M9 3h6l-1 5 4 3H6l4-3-1-5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Monitor screen */}
      <div className="relative m-3 aspect-video overflow-hidden rounded-lg bg-black shadow-inner ring-1 ring-white/[0.06]">
        {item && previewFrameUrl ? (
          <>
            <img
              src={previewFrameUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                filter: preview?.filter,
                transform: preview?.transform,
                animation: animName,
                transformOrigin: "center center",
              }}
            />
            {preview?.overlay && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: preview.overlay,
                  mixBlendMode: (preview.overlayMix as React.CSSProperties["mixBlendMode"]) ?? undefined,
                  opacity: preview.overlayOpacity ?? 1,
                  animation:
                    preview.animate === "flicker" ? "nova-flicker 0.9s ease-in-out infinite" :
                    preview.animate === "pulse"   ? "nova-pulse 1.1s ease-in-out infinite" : undefined,
                }}
              />
            )}
            <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[8.5px] text-fuchsia-200">
              LIVE · REF
            </span>
            {pinned && (
              <span className="pointer-events-none absolute right-2 top-2 rounded bg-fuchsia-500/85 px-1.5 py-0.5 text-[8.5px] font-bold text-white">
                PINNED
              </span>
            )}
          </>
        ) : item ? (
          <div
            className="absolute inset-0"
            style={{ background: item.gradient }}
          >
            <ThumbArt glyph={item.glyph} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-[10px] text-white/80">
              Import a clip to see the effect applied to your footage
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <svg className="h-8 w-8 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M10 9l5 3-5 3V9z" />
            </svg>
            <div className="text-[10.5px] text-zinc-600">Hover any effect to preview it here</div>
          </div>
        )}
      </div>

      {/* Metadata + actions */}
      <div className="flex-1 space-y-3 px-3 pb-3">
        {item ? (
          <>
            <div>
              <div className="flex items-center gap-1.5">
                {item.tag && (
                  <span className="rounded bg-cyan-500/20 px-1.5 py-px font-mono text-[8.5px] font-bold text-cyan-200">
                    {item.tag}
                  </span>
                )}
                {item.isNew && (
                  <span className="rounded bg-gradient-to-r from-fuchsia-500 to-orange-400 px-1.5 py-px text-[8.5px] font-bold text-white">
                    NEW
                  </span>
                )}
                {item.isPro && (
                  <span className="rounded bg-black/60 px-1.5 py-px text-[8.5px] font-bold text-amber-300 ring-1 ring-amber-300/40">
                    PRO
                  </span>
                )}
                {item.isFree && (
                  <span className="rounded bg-emerald-500/85 px-1.5 py-px text-[8.5px] font-bold text-white">
                    FREE
                  </span>
                )}
              </div>
              <div className="mt-1.5 truncate text-[13px] font-semibold text-zinc-100">
                {item.name}
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-500">
                {glyphDescription(item.glyph)}
              </div>
            </div>

            {previewClipName && (
              <div className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-1.5 text-[9.5px] text-cyan-200">
                Previewing on <span className="font-medium">{previewClipName}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onApply(item)}
                className="flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1.5 text-[10.5px] font-medium text-white shadow shadow-violet-600/30 transition hover:brightness-110"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Apply
              </button>
              <button
                onClick={onToggleFavorite}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10.5px] transition",
                  favorited
                    ? "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200"
                    : "border-white/[0.08] text-zinc-400 hover:border-fuchsia-500/40 hover:text-fuchsia-300"
                )}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
                </svg>
                {favorited ? "Saved" : "Save"}
              </button>
            </div>

            {onApplyAll && (
              <button
                onClick={() => onApplyAll(item)}
                title="Apply this look to every clip on the timeline in one click"
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-2 py-1.5 text-[10.5px] font-medium text-cyan-100 transition hover:bg-cyan-500/20"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                Apply to Entire Timeline
              </button>
            )}


            <div className="rounded-lg border border-white/[0.06] bg-black/30 p-2">
              <div className="mb-1 text-[8.5px] font-semibold uppercase tracking-widest text-zinc-500">
                Parameters
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {paramPreview(item.glyph).map((p) => (
                  <div key={p.label} className="rounded bg-white/[0.05] px-1.5 py-1">
                    <div className="text-[8px] text-zinc-500">{p.label}</div>
                    <div className="font-mono text-[9px] text-zinc-200">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="pt-4 text-center text-[10px] text-zinc-600">
            The reference monitor plays a faster live version of any effect you hover.
          </div>
        )}
      </div>
    </aside>
  );
}

function glyphDescription(g: ThumbGlyph): string {
  switch (g) {
    case "orbit": return "Rotates around subject · scale bump";
    case "pullback": return "Zooms out to reveal the scene";
    case "reveal": return "Progressive foreground reveal";
    case "arc": return "Curved camera path";
    case "dolly": return "Straight push-in / pull-out";
    case "shake": return "Handheld / earthquake motion";
    case "zoomin": return "Rapid zoom emphasis";
    case "pan": return "Horizontal sweep";
    case "flare": return "Screen-blended lens flare";
    case "bokeh": return "Out-of-focus highlights";
    case "leak": return "Warm light leak across frame";
    case "sparkle": return "Fine particle sparkles";
    case "logo": return "Animated logo preset";
    case "beauty": return "AI skin & feature enhance";
    case "trend": return "Popular preset stack";
    case "wave": return "Music waveform visualizer";
    case "note": return "Melodic overlay";
    case "text": return "Kinetic title";
    case "wipe": return "Directional wipe transition";
    case "star": return "Highlighted feature card";
    case "film": return "Emulsion film look";
    case "vhs": return "Retro scanline treatment";
    case "grid": return "Layout template preset";
    case "portrait": return "Portrait-optimised look";
  }
}

function paramPreview(g: ThumbGlyph): { label: string; value: string }[] {
  switch (g) {
    case "zoomin": return [{ label: "Scale", value: "130%" }, { label: "Ease", value: "In" }, { label: "Rate", value: "1.3s" }];
    case "dolly": return [{ label: "Scale", value: "122%" }, { label: "Depth", value: "Mid" }, { label: "Rate", value: "1.5s" }];
    case "orbit": return [{ label: "Rot", value: "8°" }, { label: "Scale", value: "115%" }, { label: "Rate", value: "1.6s" }];
    case "arc": return [{ label: "Rot", value: "-6°" }, { label: "Scale", value: "112%" }, { label: "Rate", value: "2s" }];
    case "shake": return [{ label: "Amp", value: "±3px" }, { label: "Freq", value: "5Hz" }, { label: "Ease", value: "Rand" }];
    case "pan": return [{ label: "X", value: "+24px" }, { label: "Ease", value: "Lin" }, { label: "Rate", value: "2s" }];
    case "flare": return [{ label: "Blend", value: "Screen" }, { label: "Opacity", value: "88%" }, { label: "Color", value: "Warm" }];
    case "leak": return [{ label: "Blend", value: "Screen" }, { label: "Opacity", value: "85%" }, { label: "Angle", value: "120°" }];
    case "bokeh": return [{ label: "Points", value: "5" }, { label: "Blur", value: "0.4" }, { label: "Opacity", value: "85%" }];
    case "sparkle": return [{ label: "Count", value: "12" }, { label: "Twinkle", value: "1.6s" }, { label: "Blend", value: "Screen" }];
    case "beauty": return [{ label: "Smooth", value: "0.35" }, { label: "Bright", value: "1.05" }, { label: "Sat", value: "1.15" }];
    case "vhs": return [{ label: "Lines", value: "3px" }, { label: "Hue", value: "-4°" }, { label: "Sat", value: "1.3" }];
    case "reveal": return [{ label: "Opacity", value: "96%" }, { label: "Scale", value: "108%" }, { label: "Ease", value: "Out" }];
    case "pullback": return [{ label: "Scale", value: "82%" }, { label: "Ease", value: "Out" }, { label: "Rate", value: "1.5s" }];
    default: return [{ label: "Preset", value: "Custom" }, { label: "Blend", value: "Norm" }, { label: "Rate", value: "1s" }];
  }
}

/* ================= Helpers ================= */
/** Every item across all categories of a tab — used as a search fallback. */
function allItemsForTab(tab: AssetTab): AssetItem[] {
  const tree = tab === "effects" ? EFFECTS_TREE : LIB_TREES[tab] ?? null;
  if (!tree) return itemsForTab(tab, "");
  const out: AssetItem[] = [];
  const walk = (cats: EffectCategory[]) => {
    for (const c of cats) {
      if (c.items) out.push(...c.items);
      if (c.children) walk(c.children);
    }
  };
  walk(tree);
  return out.length ? out : itemsForTab(tab, "");
}

function itemsForTab(tab: AssetTab, activeCat: string): AssetItem[] {
  switch (tab) {
    case "effects":
      return findCategory(EFFECTS_TREE, activeCat)?.items ?? [];
    case "filters":
    case "transitions":
    case "titles":
    case "stickers":
    case "templates":
      return findCategory(LIB_TREES[tab] ?? [], activeCat)?.items ?? itemsFallback(tab);
    case "stock":
      return STOCK;
    case "audio":
      return AUDIO_LIB;
    case "titles":
      return TITLES;
    case "transitions":
      return TRANSITIONS;
    case "filters":
      return FILTERS;
    case "stickers":
      return STICKERS;
    case "templates":
      return TEMPLATES;
    default:
      return [];
  }
}

function findCategory(tree: EffectCategory[], id: string): EffectCategory | null {
  for (const c of tree) {
    if (c.id === id) return c;
    if (c.children) {
      const found = findCategory(c.children, id);
      if (found) return found;
    }
  }
  return null;
}

function itemsFallback(tab: AssetTab): AssetItem[] {
  switch (tab) {
    case "filters": return FILTERS;
    case "transitions": return TRANSITIONS;
    case "titles": return TITLES;
    case "stickers": return STICKERS;
    case "templates": return TEMPLATES;
    default: return [];
  }
}

function currentCatLabel(id: string): string {
  const trees = [EFFECTS_TREE, ...Object.values(LIB_TREES)];
  for (const t of trees) {
    const f = findCategory(t ?? [], id);
    if (f) return f.label;
  }
  return "Library";
}

function findItem(id: string | null): AssetItem | null {
  if (!id) return null;
  const pools = [
    ...EFFECTS_TREE.flatMap((c) => c.items ?? []),
    ...EFFECTS_TREE.flatMap((c) => c.children?.flatMap((cc) => cc.items ?? []) ?? []),
    ...STOCK, ...AUDIO_LIB, ...TITLES, ...TRANSITIONS, ...FILTERS, ...STICKERS, ...TEMPLATES,
  ];
  return pools.find((i) => i.id === id) ?? null;
}

/* ================= Icons ================= */
function TabIcon({
  icon,
  active,
  color,
}: {
  icon: EffectIcon;
  active: boolean;
  color?: string;
}) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", color ?? (active ? "text-fuchsia-300" : "text-zinc-500"))}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d={ICON_PATHS[icon]} />
    </svg>
  );
}


const ICON_PATHS: Record<EffectIcon, string> = {
  sparkle: "M12 2l2.5 5 5.5.8-4 3.8 1 5.4-5-2.6-5 2.6 1-5.4-4-3.8 5.5-.8L12 2z",
  camera: "M4 8a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8zM12 17a4 4 0 100-8 4 4 0 000 8z",
  lightbulb: "M9 21h6M10 17h4M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z",
  wand: "M15 4l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4zM4 20l6-6M14 10l6-6",
  flame: "M12 3s5 6 5 10a5 5 0 01-10 0c0-2 1-3 1-5 3 1 4 3 4 0 0-2 0-3 0-5z",
  target: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 100 10 5 5 0 000-10zm0 4a1 1 0 100 2 1 1 0 000-2z",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5",
  brush: "M9 20l3-3 3 3M12 4v14M6 8l6-4 6 4-6 4-6-4z",
  shapes: "M4 20h6v-6H4v6zM14 14a4 4 0 100-8 4 4 0 000 8zM4 4h6L4 10V4z",
  smiley: "M12 3a9 9 0 100 18 9 9 0 000-18zM9 10v-.01M15 10v-.01M8 14s1.5 2 4 2 4-2 4-2",
  film: "M4 4h16v16H4V4zM4 8h16M4 16h16M8 4v16M16 4v16",
  glitch: "M4 8h6l2-2 4 4 4-2M4 14h6l2 2 4-4 4 2",
  distort: "M4 12c3-4 6-4 8 0s5 4 8 0M4 8c3-3 6-3 8 0M4 16c3 3 6 3 8 0",
  overlay: "M4 6h10v10H4V6zM10 10h10v10H10V10z",
  audio: "M4 12v-2a3 3 0 016 0v6a3 3 0 006 0v-6a3 3 0 016 0v2M4 18h4M16 6h4",
  puzzle: "M10 3v3a2 2 0 01-2 2H5a2 2 0 00-2 2v3a2 2 0 002 2h3M14 3v3a2 2 0 002 2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3M10 21v-3a2 2 0 00-2-2H5a2 2 0 00-2 2M14 21v-3a2 2 0 012-2h3a2 2 0 002 2",
  diamond: "M12 2l6 6-6 14-6-14 6-6zM4 8h16M12 2v20",
  plugin: "M9 3v4M15 3v4M5 7h14v6a5 5 0 01-5 5h-4a5 5 0 01-5-5V7z",
  reveal: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 9a3 3 0 100 6 3 3 0 000-6z",
  ai: "M8 3v3M16 3v3M8 18v3M16 18v3M3 8h3M3 16h3M18 8h3M18 16h3M6 6h12v12H6V6zM10 10h4v4h-4z",
};

/* ================= Thumbnail glyphs ================= */
function ThumbArt({ glyph }: { glyph: ThumbGlyph }) {
  const common = "absolute inset-0 h-full w-full";
  switch (glyph) {
    case "orbit":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <ellipse cx="50" cy="30" rx="34" ry="10" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeDasharray="3 3" />
          <circle cx="50" cy="30" r="9" fill="rgba(255,255,255,0.9)" />
          <circle cx="82" cy="30" r="3" fill="#fff" />
        </svg>
      );
    case "pullback":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <rect x="10" y="8" width="80" height="40" rx="4" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" />
          <rect x="30" y="18" width="40" height="20" rx="3" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" />
          <path d="M50 28l-14 -12M50 28l14 -12M50 28l-14 12M50 28l14 12" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" />
        </svg>
      );
    case "reveal":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M12 42c15-18 25-18 40 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" />
          <circle cx="72" cy="24" r="8" fill="rgba(255,255,255,0.85)" />
          <path d="M60 16h20M64 34h12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" />
        </svg>
      );
    case "arc":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M10 44 C 30 6, 70 6, 90 44" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" fill="none" />
          <circle cx="10" cy="44" r="3" fill="#fff" />
          <circle cx="90" cy="44" r="3" fill="#fff" />
        </svg>
      );
    case "dolly":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M20 28l60 0" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" />
          <path d="M70 20l10 8-10 8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" fill="none" />
          <circle cx="18" cy="28" r="3" fill="#fff" />
        </svg>
      );
    case "shake":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {[0, 12, 24].map((o) => (
            <rect key={o} x={20 + o} y={12 + o} width="50" height="30" rx="3" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
          ))}
        </svg>
      );
    case "zoomin":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {[6, 14, 22, 30].map((r, i) => (
            <rect key={i} x={50 - r} y={28 - r * 0.6} width={r * 2} height={r * 1.2} rx="1.5" stroke={`rgba(255,255,255,${0.85 - i * 0.18})`} />
          ))}
        </svg>
      );
    case "pan":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M14 28h72" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" />
          <path d="M78 22l8 6-8 6M22 22l-8 6 8 6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" fill="none" />
        </svg>
      );
    case "flare":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <circle cx="66" cy="28" r="8" fill="rgba(255,255,255,0.95)" />
          <circle cx="66" cy="28" r="18" fill="rgba(255,255,255,0.25)" />
          <path d="M20 28h80M66 4v48" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        </svg>
      );
    case "bokeh":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {[[18, 20, 6], [30, 40, 9], [52, 18, 5], [70, 38, 10], [82, 22, 7]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={`rgba(255,255,255,${0.35 + i * 0.1})`} />
          ))}
        </svg>
      );
    case "leak":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <defs>
            <linearGradient id="lk" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="1" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path d="M0 0 L60 56 L100 40 L100 0 Z" fill="url(#lk)" />
        </svg>
      );
    case "sparkle":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {[[24, 18], [50, 30], [72, 14], [40, 42], [80, 40], [16, 40], [64, 42]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 4}L${x + 1.4} ${y - 1.4}L${x + 4} ${y}L${x + 1.4} ${y + 1.4}L${x} ${y + 4}L${x - 1.4} ${y + 1.4}L${x - 4} ${y}L${x - 1.4} ${y - 1.4}Z`} fill="rgba(255,255,255,0.9)" />
          ))}
        </svg>
      );
    case "logo":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <rect x="30" y="14" width="40" height="28" rx="4" fill="rgba(255,255,255,0.9)" />
          <text x="50" y="33" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0f172a">LOGO</text>
        </svg>
      );
    case "beauty":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <circle cx="50" cy="28" r="16" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
          <circle cx="44" cy="26" r="1.6" fill="#fff" />
          <circle cx="56" cy="26" r="1.6" fill="#fff" />
          <path d="M44 34c2 2 4 3 6 3s4-1 6-3" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" fill="none" />
          <path d="M32 12l4 4M68 12l-4 4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" />
        </svg>
      );
    case "trend":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M10 44 L30 30 L48 40 L68 14 L90 22" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" fill="none" />
          <circle cx="68" cy="14" r="3" fill="#fff" />
        </svg>
      );
    case "wave":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {Array.from({ length: 22 }).map((_, i) => (
            <rect key={i} x={6 + i * 4.2} y={28 - Math.abs(Math.sin(i * 0.7)) * 18} width="2.5" height={Math.abs(Math.sin(i * 0.7)) * 36 + 4} rx="1" fill="rgba(255,255,255,0.85)" />
          ))}
        </svg>
      );
    case "note":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M40 12v26a6 6 0 11-3-5.2V16l24-4v22a6 6 0 11-3-5.2V8L40 12z" fill="rgba(255,255,255,0.9)" />
        </svg>
      );
    case "text":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <text x="50" y="34" textAnchor="middle" fontSize="20" fontWeight="800" fill="rgba(255,255,255,0.95)">
            Aa
          </text>
        </svg>
      );
    case "wipe":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <rect x="10" y="10" width="35" height="36" rx="2" fill="rgba(255,255,255,0.35)" />
          <rect x="55" y="10" width="35" height="36" rx="2" fill="rgba(255,255,255,0.85)" />
          <path d="M48 8v40M52 8v40" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        </svg>
      );
    case "star":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <path d="M50 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2 7-15z" fill="rgba(255,255,255,0.95)" />
        </svg>
      );
    case "film":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <rect x="8" y="8" width="84" height="40" rx="3" stroke="rgba(255,255,255,0.8)" />
          {[16, 30, 44, 58, 72, 86].map((x) => (
            <rect key={x} x={x - 3} y="12" width="6" height="6" rx="1" fill="rgba(255,255,255,0.7)" />
          ))}
          {[16, 30, 44, 58, 72, 86].map((x) => (
            <rect key={`b${x}`} x={x - 3} y="38" width="6" height="6" rx="1" fill="rgba(255,255,255,0.7)" />
          ))}
        </svg>
      );
    case "vhs":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x="0" y={i * 6 + 2} width="100" height="2" fill={`rgba(255,255,255,${0.15 + (i % 3) * 0.2})`} />
          ))}
          <text x="12" y="20" fontSize="10" fontWeight="800" fill="#fff">REC</text>
        </svg>
      );
    case "grid":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <rect key={`${r}-${c}`} x={c * 18 + 8} y={r * 12 + 6} width="14" height="8" rx="1.5" fill={`rgba(255,255,255,${0.3 + ((r + c) % 3) * 0.2})`} />
            ))
          )}
        </svg>
      );
    case "portrait":
      return (
        <svg className={common} viewBox="0 0 100 56" fill="none">
          <circle cx="50" cy="22" r="8" fill="rgba(255,255,255,0.9)" />
          <path d="M32 48c2-10 10-14 18-14s16 4 18 14" fill="rgba(255,255,255,0.85)" />
        </svg>
      );
  }
}
