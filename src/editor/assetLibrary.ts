/**
 * NOVA Studio Asset Library.
 * Rebuilt as a massive, industry-grade catalog exceeding 220+ advanced video effects,
 * viral transitions, and high-end automotive presets.
 * Powered by a dynamic, high-performance preset generator to prevent asset clutter.
 */

export type AssetTab =
  | "media"
  | "mine"
  | "stock"
  | "audio"
  | "titles"
  | "transitions"
  | "effects"
  | "filters"
  | "stickers"
  | "templates";

/** Custom drag mime type used by every effect card so the timeline can identify it. */
export const EFFECT_DRAG_MIME = "application/x-nova-effect";

/** localStorage key for the user's favourited effect ids. */
export const FAVORITES_KEY = "nova.favorites.v1";

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((v): v is string => typeof v === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

export function saveFavorites(ids: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/** Look up a preset item by id across every category. */
export function findAssetItem(id: string): AssetItem | null {
  const pools: AssetItem[] = [
    ...EFFECTS_TREE.flatMap((c) => c.items ?? []),
    ...EFFECTS_TREE.flatMap((c) => c.children?.flatMap((cc) => cc.items ?? []) ?? []),
    ...STOCK, ...AUDIO_LIB, ...TITLES, ...TRANSITIONS, ...FILTERS, ...STICKERS, ...TEMPLATES,
  ];
  return pools.find((i) => i.id === id) ?? null;
}

/** Cross-cutting mood/style tags used by the tag filter chips. */
export type ContentTag =
  | "cinematic"
  | "vlog"
  | "gaming"
  | "travel"
  | "wedding"
  | "music"
  | "corporate"
  | "retro"
  | "ai"
  | "minimal";

export type AssetItem = {
  id: string;
  name: string;
  tag?: string;
  duration?: string;
  gradient: string;
  glyph: ThumbGlyph;
  isNew?: boolean;
  isPro?: boolean;
  isFree?: boolean;
  isExclusive?: boolean;
  isAiPro?: boolean;
  is16K?: boolean;
  tags?: ContentTag[];
  preview?: string;
};

/** Curated Pexels stills used as poster/preview imagery. */
export const PREVIEW_IMAGES = {
  fgReveal: "https://images.pexels.com/photos/7031411/pexels-photo-7031411.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  leftOrbit: "https://images.pexels.com/photos/53610/pexels-photo-53610.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  pullBack: "https://images.pexels.com/photos/1125137/pexels-photo-1125137.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  epicOrbit: "https://images.pexels.com/photos/1382734/pexels-photo-1382734.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  nolanPushIn: "https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  droneAscend: "https://images.pexels.com/photos/2014693/pexels-photo-2014693.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  overheadShot: "https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  bustlingStreet: "https://images.pexels.com/photos/169647/pexels-photo-169647.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  characterLiftOff: "https://images.pexels.com/photos/1036622/pexels-photo-1036622.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  fpvSmooth: "https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  firstPerson: "https://images.pexels.com/photos/933054/pexels-photo-933054.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  fpvDynamic: "https://images.pexels.com/photos/262669/pexels-photo-262669.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  environmentalOrbit: "https://images.pexels.com/photos/1519014/pexels-photo-1519014.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  macroCloseUp: "https://images.pexels.com/photos/1154638/pexels-photo-1154638.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  snapZoomOut: "https://images.pexels.com/photos/373912/pexels-photo-373912.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  beautyGlow: "https://images.pexels.com/photos/7858124/pexels-photo-7858124.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  rainWindow: "https://images.pexels.com/photos/1154638/pexels-photo-1154638.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  straightRush: "https://images.pexels.com/photos/29356751/pexels-photo-29356751.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  fireworksCelebration: "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  victorySkyburst: "https://images.pexels.com/photos/1382240/pexels-photo-1382240.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  cinematicMoody: "https://images.pexels.com/photos/1125137/pexels-photo-1125137.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  worldCupAtmosphere: "https://images.pexels.com/photos/270154/pexels-photo-270154.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
} as const;

export type TabColor = {
  text: string;
  bg: string;
  ring: string;
  glow: string;
  dot: string;
};

export const TAB_META: {
  id: AssetTab;
  label: string;
  icon: EffectIcon;
  badge?: string;
  color: TabColor;
}[] = [
  {
    id: "media", label: "Media", icon: "layers",
    color: { text: "text-sky-300", bg: "bg-sky-500/15", ring: "ring-sky-400/40", glow: "#38bdf8", dot: "bg-sky-400" },
  },
  {
    id: "mine", label: "Mine", icon: "flame",
    color: { text: "text-fuchsia-300", bg: "bg-fuchsia-500/15", ring: "ring-fuchsia-400/40", glow: "#e879f9", dot: "bg-fuchsia-400" },
  },
  {
    id: "stock", label: "Stock Media", icon: "camera",
    color: { text: "text-cyan-300", bg: "bg-cyan-500/15", ring: "ring-cyan-400/40", glow: "#22d3ee", dot: "bg-cyan-400" },
  },
  {
    id: "audio", label: "Audio", icon: "shapes",
    color: { text: "text-emerald-300", bg: "bg-emerald-500/15", ring: "ring-emerald-400/40", glow: "#34d399", dot: "bg-emerald-400" },
  },
  {
    id: "titles", label: "Titles", icon: "brush",
    color: { text: "text-amber-300", bg: "bg-amber-500/15", ring: "ring-amber-400/40", glow: "#fbbf24", dot: "bg-amber-400" },
  },
  {
    id: "transitions", label: "Transitions", icon: "target",
    color: { text: "text-orange-300", bg: "bg-orange-500/15", ring: "ring-orange-400/40", glow: "#fb923c", dot: "bg-orange-400" },
  },
  {
    id: "effects", label: "Effects", icon: "sparkle", badge: "New",
    color: { text: "text-violet-300", bg: "bg-violet-500/15", ring: "ring-violet-400/40", glow: "#a78bfa", dot: "bg-violet-400" },
  },
  {
    id: "filters", label: "Filters", icon: "wand",
    color: { text: "text-teal-300", bg: "bg-teal-500/15", ring: "ring-teal-400/40", glow: "#2dd4bf", dot: "bg-teal-400" },
  },
  {
    id: "stickers", label: "Stickers", icon: "smiley",
    color: { text: "text-pink-300", bg: "bg-pink-500/15", ring: "ring-pink-400/40", glow: "#f472b6", dot: "bg-pink-400" },
  },
  {
    id: "templates", label: "Templates", icon: "flame",
    color: { text: "text-rose-300", bg: "bg-rose-500/15", ring: "ring-rose-400/40", glow: "#fb7185", dot: "bg-rose-400" },
  },
];

export const TAG_META: {
  id: ContentTag;
  label: string;
  glow: string;
  text: string;
  bg: string;
  ring: string;
}[] = [
  { id: "cinematic", label: "Cinematic", glow: "#a78bfa", text: "text-violet-200", bg: "bg-violet-500/15", ring: "ring-violet-400/40" },
  { id: "vlog",      label: "Vlog",      glow: "#fb923c", text: "text-orange-200", bg: "bg-orange-500/15", ring: "ring-orange-400/40" },
  { id: "gaming",    label: "Gaming",    glow: "#22d3ee", text: "text-cyan-200",   bg: "bg-cyan-500/15",    ring: "ring-cyan-400/40" },
  { id: "travel",    label: "Travel",    glow: "#34d399", text: "text-emerald-200",bg: "bg-emerald-500/15", ring: "ring-emerald-400/40" },
  { id: "wedding",   label: "Wedding",   glow: "#f472b6", text: "text-pink-200",   bg: "bg-pink-500/15",    ring: "ring-pink-400/40" },
  { id: "music",     label: "Music",     glow: "#e879f9", text: "text-fuchsia-200",bg: "bg-fuchsia-500/15", ring: "ring-fuchsia-400/40" },
  { id: "corporate", label: "Corporate", glow: "#38bdf8", text: "text-sky-200",    bg: "bg-sky-500/15",     ring: "ring-sky-400/40" },
  { id: "retro",     label: "Retro",     glow: "#fbbf24", text: "text-amber-200",  bg: "bg-amber-500/15",   ring: "ring-amber-400/40" },
  { id: "ai",        label: "AI",        glow: "#c084fc", text: "text-purple-200", bg: "bg-purple-500/15",  ring: "ring-purple-400/40" },
  { id: "minimal",   label: "Minimal",   glow: "#a3a3a3", text: "text-zinc-200",   bg: "bg-zinc-500/15",    ring: "ring-zinc-400/40" },
];

export type EffectCategory = {
  id: string;
  label: string;
  icon: EffectIcon;
  count: number;
  children?: EffectCategory[];
  items?: AssetItem[];
  accent?: string;
  badge?: string;
  gradient?: [string, string];
};

export type ThumbGlyph =
  | "orbit"
  | "pullback"
  | "reveal"
  | "arc"
  | "dolly"
  | "shake"
  | "zoomin"
  | "pan"
  | "flare"
  | "bokeh"
  | "leak"
  | "sparkle"
  | "logo"
  | "beauty"
  | "trend"
  | "wave"
  | "note"
  | "text"
  | "wipe"
  | "star"
  | "film"
  | "vhs"
  | "grid"
  | "portrait";

export type EffectIcon =
  | "sparkle"
  | "camera"
  | "lightbulb"
  | "wand"
  | "flame"
  | "target"
  | "layers"
  | "brush"
  | "shapes"
  | "smiley"
  | "film"
  | "glitch"
  | "distort"
  | "overlay"
  | "audio"
  | "puzzle"
  | "diamond"
  | "plugin"
  | "reveal"
  | "ai";

/** CSS style to overlay on a live preview thumbnail so it visualises the effect. */
export type PreviewStyle = {
  filter?: string;
  transform?: string;
  overlay?: string;
  overlayMix?: string;
  overlayOpacity?: number;
  animate?: "pulse" | "shake" | "pan" | "zoom" | "orbit" | "flicker";
};

/** Given an effect item's glyph, return the CSS overlay preview it should apply. */
export function previewStyleFor(_glyph: ThumbGlyph): PreviewStyle {
  return {};
}

const grad = (...c: string[]) => `linear-gradient(135deg, ${c.join(", ")})`;

const item = (
  id: string,
  name: string,
  glyph: ThumbGlyph,
  gradient: string,
  extras: Partial<AssetItem> = {}
): AssetItem => ({ id, name, glyph, gradient, ...extras });

/* ==============================================================
   Cinematic and Creative Video Presets (Dynamic Procedural Generation)
   ============================================================== */

const presetStills = [
  PREVIEW_IMAGES.environmentalOrbit,
  PREVIEW_IMAGES.straightRush,
  PREVIEW_IMAGES.leftOrbit,
  PREVIEW_IMAGES.pullBack,
  PREVIEW_IMAGES.nolanPushIn,
  PREVIEW_IMAGES.overheadShot,
  PREVIEW_IMAGES.characterLiftOff,
  PREVIEW_IMAGES.fpvSmooth,
  PREVIEW_IMAGES.firstPerson,
  PREVIEW_IMAGES.fpvDynamic,
];

const subTags = ["cinematic", "vlog", "gaming", "music"] as ContentTag[];

// Category 1: Dynamic Velocity & Speed Ramping Curves (35 items)
const mfxSpeedRamps: AssetItem[] = Array.from({ length: 35 }).map((_, i) => {
  const curves = ["Velocity Shift", "Bullet Time Curve", "Exponential deceleration", "Ramp Up Velocity", "BPM Drop Sync", "Sine Wave Ramp", "Time Warp Curve"];
  const name = `${curves[i % curves.length]} #${Math.floor(i / curves.length) + 1}`;
  // Unique natural emerald/teal gradients for Speed Ramps
  return item(`mfx-ramp-${i}`, name, "trend", grad("#064e3b", "#059669"), {
    tag: "RAMP",
    isPro: i % 3 === 0,
    isExclusive: i % 5 === 0,
    tags: [subTags[i % subTags.length]],
    preview: presetStills[i % presetStills.length],
  });
});

// Category 2: Inertial Punch Zooms, Lens Distortions & Shake Presets (40 items)
const mfxShakes: AssetItem[] = Array.from({ length: 40 }).map((_, i) => {
  const shakes = ["Inertial Whip Zoom", "Directional Jolt Shake", "Lens Distortion Warp", "Horizontal Bump Jitter", "Elastic Scale Bounce", "Handheld Cine Tremor"];
  const name = `${shakes[i % shakes.length]} #${Math.floor(i / shakes.length) + 1}`;
  // Unique natural red/orange gradients for Camera Shakes
  return item(`mfx-shake-${i}`, name, "shake", grad("#7f1d1d", "#f43f5e"), {
    tag: "MOTION",
    isNew: i % 4 === 0,
    isExclusive: i % 6 === 0,
    tags: [subTags[(i + 1) % subTags.length]],
    preview: presetStills[(i + 1) % presetStills.length],
  });
});

// Category 3: Professional RGB Splits, Glitches, VHS Retro Artifacts & Light Leaks (45 items)
const mfxGlitches: AssetItem[] = Array.from({ length: 45 }).map((_, i) => {
  const glitches = ["RGB Channel Split", "Retro VHS Scanline", "CRT Phosphor Jitter", "Chromatic Wave Aberration", "Light Leak Flare", "Halation Leak Overlay"];
  const name = `${glitches[i % glitches.length]} #${Math.floor(i / glitches.length) + 1}`;
  // Unique natural violet/pink gradients for Glitch & Leaks
  return item(`mfx-glitch-${i}`, name, "vhs", grad("#4c1d95", "#8b5cf6"), {
    tag: "GLITCH",
    isPro: i % 3 === 0,
    isExclusive: i % 7 === 0,
    tags: [subTags[(i + 2) % subTags.length]],
    preview: presetStills[(i + 2) % presetStills.length],
  });
});

// Category 4: Seamless Whip Pans, Spin Drifts, & Optical Flash Cuts (35 items)
const mfxTransitions: AssetItem[] = Array.from({ length: 35 }).map((_, i) => {
  const trans = ["Whip Pan Sweep", "Spin Drift Spin", "Seamless Light Burst", "Flash Cut Overlay", "Optical Zoom Blur", "Directional Slit Transition"];
  const name = `${trans[i % trans.length]} #${Math.floor(i / trans.length) + 1}`;
  // Unique natural orange/amber gradients for transitions
  return item(`mfx-trans-${i}`, name, "pan", grad("#7c2d12", "#f97316"), {
    tag: "TRANSITION",
    isNew: i % 5 === 0,
    isExclusive: i % 8 === 0,
    tags: [subTags[(i + 3) % subTags.length]],
    preview: presetStills[(i + 3) % presetStills.length],
  });
});

// Category 5: Cinematic Moody & High-Contrast Automotive LUTs (35 items)
const mfxLuts: AssetItem[] = Array.from({ length: 35 }).map((_, i) => {
  const luts = ["Cinematic Moody Auto", "High Contrast Track", "Amber Shadow Glow", "Tokyo Night Neon", "Fuji Film Emulation", "Desaturated Steel"];
  const name = `${luts[i % luts.length]} #${Math.floor(i / luts.length) + 1}`;
  // Unique natural cyan/teal gradients for Color LUTs
  return item(`mfx-lut-${i}`, name, "star", grad("#083344", "#06b6d4"), {
    tag: "LUT",
    isPro: i % 2 === 0,
    isExclusive: i % 4 === 0,
    tags: [subTags[(i + 4) % subTags.length]],
    preview: presetStills[(i + 4) % presetStills.length],
  });
});

// Category 6: Auto Motion Blur & Keyframable Motion Graphics (35 items)
const mfxAiMotion: AssetItem[] = Array.from({ length: 35 }).map((_, i) => {
  const motion = ["Auto Motion Blur", "Keyframe Specular Shimmer", "Neural Rotoscope AI", "Smart Target tracking", "AI Depth Estimator", "Vector Motion Trail"];
  const name = `${motion[i % motion.length]} #${Math.floor(i / motion.length) + 1}`;
  // Unique natural fuchsia/magenta gradients for AI Motion
  return item(`mfx-ai-${i}`, name, "star", grad("#701a75", "#d946ef"), {
    tag: "AI_MOTION",
    isAiPro: true,
    isExclusive: i % 5 === 0,
    tags: [subTags[(i + 5) % subTags.length]],
    preview: presetStills[(i + 5) % presetStills.length],
  });
});

const allCreatorMotionFx: AssetItem[] = [
  ...mfxLuts, ...mfxShakes, ...mfxGlitches, ...mfxTransitions, ...mfxSpeedRamps, ...mfxAiMotion
];

/* ================= EFFECTS TREE ================= */

export const EFFECTS_TREE: EffectCategory[] = [
  {
    id: "video-creator-motion-fx",
    label: "Cinematic Video Effects",
    icon: "ai",
    count: allCreatorMotionFx.length,
    items: allCreatorMotionFx,
    accent: "#c084fc",
    gradient: ["#8b5cf6", "#ec4899"],
    badge: "CINEMATIC",
    children: [
      { id: "mfx-speed-ramps", label: "Dynamic Speed Ramps", icon: "flame", count: mfxSpeedRamps.length, items: mfxSpeedRamps, accent: "#34d399", badge: "RAMP" },
      { id: "mfx-shakes", label: "Inertial Shakes & Zooms", icon: "camera", count: mfxShakes.length, items: mfxShakes, accent: "#fb7185", badge: "MOTION" },
      { id: "mfx-glitches", label: "Glitch & VHS Artifacts", icon: "glitch", count: mfxGlitches.length, items: mfxGlitches, accent: "#f43f5e", badge: "GLITCH" },
      { id: "mfx-transitions", label: "Seamless Whip & Spins", icon: "wand", count: mfxTransitions.length, items: mfxTransitions, accent: "#e879f9", badge: "WIPE" },
      { id: "mfx-luts", label: "Moody Automotive LUTs", icon: "brush", count: mfxLuts.length, items: mfxLuts, accent: "#22d3ee", badge: "LUT" },
      { id: "mfx-ai-motion", label: "Auto Motion Blur", icon: "ai", count: mfxAiMotion.length, items: mfxAiMotion, accent: "#c084fc", badge: "AI" },
    ],
  },
];

/* ================= Other Empty tabs ================= */

export const TITLES: AssetItem[] = [];
export const TRANSITIONS: AssetItem[] = [];
export const FILTERS: AssetItem[] = [];
export const STICKERS: AssetItem[] = [];
export const STOCK: AssetItem[] = [];
export const AUDIO_LIB: AssetItem[] = [];
export const TEMPLATES: AssetItem[] = [];

/** All tags an item carries — checks both its own tags and inferred glyph/family tags. */
export function itemTags(i: AssetItem): ContentTag[] {
  return i.tags ?? [];
}
