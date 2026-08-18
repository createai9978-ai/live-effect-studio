/**
 * Editor layout state — completely independent from media/clip state.
 *
 * Nothing in here may ever be written by media import, clip selection, or
 * playback. It stores only structural facts: how wide/tall each dock region is
 * and whether a panel is docked in its home region or floating.
 *
 * Persisted to localStorage with strict validation: a stale or corrupt payload
 * silently falls back to DEFAULT_LAYOUT instead of breaking the editor.
 */

export type PanelId = "media" | "source" | "monitor" | "inspector" | "timeline" | "mixer";

/** Home dock region for each panel. A panel can never dock anywhere else. */
export const PANEL_HOME: Record<PanelId, "left" | "center" | "right" | "bottom"> = {
  media: "left",
  source: "center",
  monitor: "center",
  inspector: "right",
  timeline: "bottom",
  mixer: "bottom",
};

export const PANEL_TITLE: Record<PanelId, string> = {
  media: "Project Media",
  source: "Source Monitor",
  monitor: "Program Monitor",
  inspector: "Inspector",
  timeline: "Timeline",
  mixer: "Audio Mixer",
};

export type FloatRect = { x: number; y: number; w: number; h: number };

export type PanelDockState = {
  /** "docked" = occupies its home grid region, "floating" = overlay window. */
  mode: "docked" | "floating";
  /** Last floating geometry, remembered across dock/undock cycles. */
  rect: FloatRect;
};

export type EditorLayout = {
  version: 2;
  /** px width of the left Project Media region */
  mediaWidth: number;
  /** px width of the right Inspector region */
  inspectorWidth: number;
  /** px height of the bottom Timeline region */
  timelineHeight: number;
  /** 0..1 share of the center region given to the Source Monitor */
  sourceSplit: number;
  panels: Record<PanelId, PanelDockState>;
};

export const LAYOUT_LIMITS = {
  mediaWidth: [260, 520] as const,
  inspectorWidth: [260, 460] as const,
  timelineHeight: [220, 620] as const,
  sourceSplit: [0.22, 0.6] as const,
};

const defaultRect = (i: number): FloatRect => ({
  x: 160 + i * 34,
  y: 120 + i * 28,
  w: 520,
  h: 380,
});

export const DEFAULT_LAYOUT: EditorLayout = {
  version: 2,
  mediaWidth: 340,
  inspectorWidth: 330,
  timelineHeight: 360,
  sourceSplit: 0.38,
  panels: {
    media: { mode: "docked", rect: defaultRect(0) },
    source: { mode: "docked", rect: defaultRect(1) },
    monitor: { mode: "docked", rect: defaultRect(2) },
    inspector: { mode: "docked", rect: defaultRect(3) },
    timeline: { mode: "docked", rect: defaultRect(4) },
    mixer: { mode: "docked", rect: defaultRect(5) },
  },
};

const STORAGE_KEY = "nova_studio.layout.v2";

export const clampRange = (v: number, [lo, hi]: readonly [number, number]) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

function sanitizeRect(r: unknown, fallback: FloatRect): FloatRect {
  if (!r || typeof r !== "object") return fallback;
  const o = r as Partial<FloatRect>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    x: Math.max(0, num(o.x, fallback.x)),
    y: Math.max(0, num(o.y, fallback.y)),
    w: Math.min(1600, Math.max(320, num(o.w, fallback.w))),
    h: Math.min(1200, Math.max(220, num(o.h, fallback.h))),
  };
}

/** Repair any partial/invalid payload into a fully valid layout. */
export function sanitizeLayout(raw: unknown): EditorLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT;
  const o = raw as Partial<EditorLayout>;
  if (o.version !== 2) return DEFAULT_LAYOUT;

  const panels = {} as Record<PanelId, PanelDockState>;
  (Object.keys(DEFAULT_LAYOUT.panels) as PanelId[]).forEach((id) => {
    const fallback = DEFAULT_LAYOUT.panels[id];
    const p = (o.panels as Record<string, unknown> | undefined)?.[id] as
      | Partial<PanelDockState>
      | undefined;
    // Structural panels can never be persisted as floating-broken: an unknown
    // mode always resolves back to "docked".
    const mode = p?.mode === "floating" ? "floating" : "docked";
    panels[id] = { mode, rect: sanitizeRect(p?.rect, fallback.rect) };
  });

  return {
    version: 2,
    mediaWidth: clampRange(o.mediaWidth ?? DEFAULT_LAYOUT.mediaWidth, LAYOUT_LIMITS.mediaWidth),
    inspectorWidth: clampRange(
      o.inspectorWidth ?? DEFAULT_LAYOUT.inspectorWidth,
      LAYOUT_LIMITS.inspectorWidth
    ),
    timelineHeight: clampRange(
      o.timelineHeight ?? DEFAULT_LAYOUT.timelineHeight,
      LAYOUT_LIMITS.timelineHeight
    ),
    sourceSplit: clampRange(o.sourceSplit ?? DEFAULT_LAYOUT.sourceSplit, LAYOUT_LIMITS.sourceSplit),
    panels,
  };
}

export function loadLayout(): EditorLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_LAYOUT;
    return sanitizeLayout(JSON.parse(saved));
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: EditorLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* quota / private mode — layout simply won't persist */
  }
}
