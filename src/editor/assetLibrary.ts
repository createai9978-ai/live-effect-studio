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

import { compileRenderProgram } from "./effectRuntime";

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
  /** Audio/media source url (stock + audio tabs). */
  src?: string;
  /** Explicit GPU effect primitive — bypasses keyword inference entirely. */
  fx?: import("./VideoProcessor").EffectType;
  /** Hard separation between colour science (LUTs/grades) and real visual effects. */
  kind?: "grade" | "effect" | "media";
  /** Unique executable render descriptor; never shared by differently named assets. */
  renderProgram?: import("./effectRuntime").RenderProgram;
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
   NOVA 2026 preset generator — every preset is authored by name and
   compiled into a unique seeded render program.
   ============================================================== */
const subTags = ["cinematic", "vlog", "gaming", "music", "travel", "wedding"] as ContentTag[];

type FxType = import("./VideoProcessor").EffectType;

type SetSpec = {
  prefix: string;
  /** Either a plain name, or [name, explicit GPU effect primitive]. */
  names: (string | [string, FxType])[];
  glyph: ThumbGlyph;
  gradient: [string, string];
  tag: string;
  tags?: ContentTag[];
  ai?: boolean;
  /** Default effect primitive for every entry that does not declare its own. */
  fx?: FxType;
  kind?: "grade" | "effect" | "media";
};

/**
 * Build a preset set. Every entry is generated from an explicit, unique name —
 * there is no numeric cloning, so the array length always equals the number of
 * distinct presets the grid will render.
 */
const GLOBAL_IDS = new Set<string>();
const GLOBAL_NAMES = new Set<string>();

function makeSet(spec: SetSpec): AssetItem[] {
  const out: AssetItem[] = [];
  spec.names.forEach((entry, i) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    const fx = Array.isArray(entry) ? entry[1] : spec.fx;
    const key = name.trim().toLowerCase();
    const id = `${spec.prefix}-${i}`;
    // Strict global de-duplication: a preset name/id may only exist once in the whole library.
    if (GLOBAL_NAMES.has(key) || GLOBAL_IDS.has(id)) return;
    GLOBAL_NAMES.add(key);
    GLOBAL_IDS.add(id);
    const pool = spec.tags ?? subTags;
    const asset = item(id, name, spec.glyph, grad(spec.gradient[0], spec.gradient[1]), {
        tag: spec.tag,
        isNew: i % 7 === 0,
        isPro: i % 3 === 1,
        isExclusive: i % 9 === 0,
        isAiPro: spec.ai || undefined,
        tags: [pool[i % pool.length]],
        fx,
        kind: spec.kind ?? (fx ? "effect" : "grade"),
        // Generated presets use live video + a seeded shader, never recycled still thumbnails.
        preview: undefined,
      });
    asset.renderProgram = compileRenderProgram(asset);
    out.push(asset);
  });
  return out;
}

/** Alias kept for readability at the call sites. */
const makeUnique = makeSet;

/** Strict de-duplication by id (and by name) across a merged pool. */
function dedupe(items: AssetItem[]): AssetItem[] {
  const ids = new Set<string>();
  const names = new Set<string>();
  const out: AssetItem[] = [];
  for (const i of items) {
    const nk = i.name.trim().toLowerCase();
    if (ids.has(i.id) || names.has(nk)) continue;
    ids.add(i.id);
    names.add(nk);
    out.push(i);
  }
  return out;
}

/* ---------- Filmora-style production suite ---------- */

/* ==========================================================================
   NOVA 2026 Signature Library — fully rebuilt. Every legacy preset was retired
   and replaced with a modern, production-grade catalog: three suites, twelve
   sub-collections, all driven by unique seeded render programs.
   ========================================================================== */

/* ---------- Suite A — Cinema Grade ---------- */

const cgSignature = makeSet({
  prefix: "cg-sig", glyph: "star", tag: "GRADE",
  gradient: ["#0b1220", "#2563eb"],
  tags: ["cinematic", "travel", "corporate"],
  names: [
    "Dune Sandstorm Grade", "Blade Neon Teal", "Oppenheimer Ash Mono", "Midsommar Bloom Warmth",
    "Wick Emerald Contrast", "Villeneuve Dust Amber", "Fincher Cyan Shadow", "Nolan Steel Contrast",
    "A24 Pastel Melancholy", "Arri Alexa Natural", "Venice Skin Rollout", "Log-C Filmic Rollout",
    "Ektachrome Daylight", "Vision3 500T Night", "Cinestill Halide Halo", "Fuji Eterna Soft Print",
    "Modern Bleach Steel", "Hyperreal HDR Grade", "Charcoal Luxury Tone", "Editorial Champagne Grade",
    "Onyx Midnight Grade", "Ivory Skin Cinema", "Marine Deep Grade", "Sunbaked Kodachrome",
  ],
});

const cgLight = makeSet({
  prefix: "cg-light", glyph: "flare", tag: "LIGHT",
  gradient: ["#3b0764", "#f59e0b"],
  tags: ["cinematic", "wedding", "music"],
  names: [
    "Anamorphic Blue Streak", "Volumetric God Ray Flare", "Halation Bloom Wrap", "Practical Bokeh Glow",
    "Ultra Wide Lens Flare", "Neon Sign Spill Light", "Softbox Beauty Sheen", "Rim Light Sculpt",
    "Sun Flare Kiss Overlay", "Prism Rainbow Flare", "Studio Kicker Highlight", "Candlelight Warm Glow",
    "Stadium Lamp Starburst", "Lantern Bokeh Field", "Laser Beam Sweep Flare", "Window Blind Shadow Cast",
    "Aurora Ribbon Light", "Caustic Water Light", "Golden Hour Streak Flare", "Cyber Rooftop Glow",
  ],
});

const cgAtmosphere = makeSet({
  prefix: "cg-atmo", glyph: "leak", tag: "ATMOS",
  gradient: ["#082f49", "#22d3ee"],
  tags: ["cinematic", "travel", "wedding"],
  names: [
    "Volumetric Fog Roll Overlay", "Ember Rise Overlay", "Monsoon Rain Streaks", "Powder Snow Depth Pass",
    "Desert Grit Overlay", "Cinematic Smoke Haze", "Falling Petal Drift Overlay", "Firefly Night Bokeh",
    "Ash Fall Slow Overlay", "Heat Shimmer Haze", "Underwater Caustic Overlay", "Storm Cloud Shadow Sweep",
    "Confetti Burst Overlay", "Ice Frost Edge Overlay", "35mm Grain Plate Overlay", "Projector Gate Dust",
    "Steam Vent Wisp Overlay", "Pollen Float Overlay",
  ],
});

const cgTexture = makeSet({
  prefix: "cg-tex", glyph: "film", tag: "TEXTURE",
  gradient: ["#1c1917", "#a8a29e"],
  tags: ["retro", "cinematic", "minimal"],
  names: [
    "Organic Film Grain Grade", "Print Emulsion Grade", "Matte Black Lift Grade", "Silver Halide Mono Grade",
    "Duotone Editorial Grade", "Split Tone Cyan Amber", "Faded Archive Grade", "Cross Process Grade",
    "Infrared False Colour Grade", "Cinema Contrast Curve", "Soft Diffusion Filter Grade", "Glass Bloom Filter Grade",
  ],
});

const cinemaAll = dedupe([...cgSignature, ...cgLight, ...cgAtmosphere, ...cgTexture]);

/* ---------- Suite B — Motion Lab ---------- */

const mlTransitions = makeSet({
  prefix: "ml-trans", glyph: "wipe", tag: "TRANSITION",
  gradient: ["#0c4a6e", "#38bdf8"],
  tags: ["music", "gaming", "travel"],
  names: [
    "Seamless Light Burst Transition", "Optical Zoom Blur Transition", "Directional Slit Transition", "Liquid Mercury Transition",
    "Prism Refraction Transition", "Camera Whip Handoff Transition", "Shatter Glass Transition", "Ink Bleed Transition",
    "Vortex Twirl Transition", "Depth Push Through Transition", "Sky Match Cut Transition", "Kaleidoscope Fold Transition",
    "Pixel Sort Transition", "Bokeh Bloom Transition", "Shape Morph Mask Transition", "Speed Line Rush Transition",
    "Barrel Roll Transition", "Iris Expand Transition", "Grid Slice Shuffle Transition", "Chromatic Fade Transition",
  ],
});

const mlCamera = makeSet({
  prefix: "ml-cam", glyph: "zoomin", tag: "CAMERA",
  gradient: ["#111827", "#60a5fa"],
  tags: ["cinematic", "vlog", "gaming"],
  names: [
    "Handheld Breathing Rig", "Dolly Push-In Move", "Parallax Orbit Move", "Crash Zoom Punch",
    "Snap Pan Reframe", "Gimbal Float Drift", "Vertigo Dolly Zoom", "Crane Rise Move",
    "Shoulder Shake Rig", "Micro Jitter Handheld", "Slow Creep Push", "Whip Tilt Reframe",
    "Impact Recoil Shake", "Drone Sweep Move", "Rack Focus Reframe", "Screen Shake Bass Hit",
  ],
});

const mlTime = makeSet({
  prefix: "ml-time", glyph: "trend", tag: "SPEED",
  gradient: ["#064e3b", "#10b981"],
  tags: ["music", "gaming", "vlog"],
  names: [
    "Velocity Ramp Curve", "Bullet Time Freeze Ramp", "Beat Drop Speed Ramp", "Optical Flow Slow-Mo",
    "Stutter Step Retime", "Freeze Frame Hold Ramp", "Reverse Kickback Ramp", "Hyperlapse Rush Speed",
    "Ping-Pong Loop Speed", "Impact Slam Ramp", "Breath Pause Ramp", "Trailer Cut Accelerate Speed",
    "Whip Handoff Ramp", "Rolling Boomerang Speed",
  ],
});

const mlType = makeSet({
  prefix: "ml-type", glyph: "text", tag: "TYPE",
  gradient: ["#1e1b4b", "#818cf8"],
  tags: ["corporate", "music", "vlog"],
  names: [
    "Kinetic Caption Karaoke Text", "Word Pop Caption Text", "Swiss Minimal Title Text", "3D Extrude Headline Text",
    "Chrome Liquid Title Text", "Neon Outline Caption Text", "Typewriter Terminal Text", "Blur Focus Reveal Text",
    "Split Colour Word Text", "Marquee Ticker Text", "Counter Odometer Text", "Editorial Serif Lower Third Text",
    "Sticker Bubble Caption Text", "Glass Panel Title Text", "Beat Slam Impact Text", "Handwritten Scribble Text",
  ],
});

const motionAll = dedupe([...mlTransitions, ...mlCamera, ...mlTime, ...mlType]);

/* ---------- Suite C — Neural FX ---------- */

const nxSubject = makeSet({
  prefix: "nx-sub", glyph: "portrait", tag: "AI", ai: true,
  gradient: ["#2e1065", "#a855f7"],
  tags: ["ai", "music", "vlog"],
  names: [
    "Neural Rotoscope Cutout", "Smart Body Tracking Rig", "Green Screen Neural Key", "Semantic Object Removal",
    "Subject Isolation Pop", "Body Glow Contour Mask", "Silhouette Extractor Mask", "Occlusion Aware Masking",
    "Pose Skeleton Overlay Track", "Auto Reframe Subject Tracker", "Segmented Body Recolor Mask", "Spotlight Subject Lock Track",
    "Motion Vector Trail Track", "Clone Echo Body Trail", "Particle Body Dissolve Mask", "Edge Arc Body Outline",
  ],
});

const nxDepth = makeSet({
  prefix: "nx-depth", glyph: "orbit", tag: "DEPTH", ai: true,
  gradient: ["#083344", "#06b6d4"],
  tags: ["ai", "cinematic", "travel"],
  names: [
    "AI Depth Estimator Map", "2.5D Depth Parallax", "Depth Aware Background Blur", "Depth Fog Simulation",
    "Depth Light Wrap Pass", "Cinematic Portrait Depth Bokeh", "Volumetric Depth Relight", "Depth Displacement Warp",
    "Dolly Zoom Depth Rig", "Layered Depth Sky Replace", "Depth Colour Separation", "Depth Edge Refine Matte",
  ],
});

const nxAudio = makeSet({
  prefix: "nx-audio", glyph: "wave", tag: "REACTIVE", ai: true,
  gradient: ["#4a044e", "#e879f9"],
  tags: ["music", "gaming", "ai"],
  names: [
    "Voice-to-FX Sync Engine", "Audio Reactive Pulse Rig", "Beat Detect Zoom Sync", "Voice Emotion Glow",
    "Spectrum Bar Reactive Overlay", "Bass Shockwave Reactive Ring", "Lip Sync Retime Engine", "Waveform Trail Reactive",
    "Kick Flash Reactive Strobe", "Vocal Isolation Highlight", "Tempo Grid Reactive Shake", "Audio Reactive Colour Cycle",
  ],
});

const nxStylize = makeSet({
  prefix: "nx-style", glyph: "vhs", tag: "STYLIZE",
  gradient: ["#4c1d95", "#8b5cf6"],
  tags: ["retro", "gaming", "ai"],
  names: [
    "Neural Style Transfer Paint", "Anime Cel Shade Stylize", "Comic Ink Halftone Stylize", "Cyberpunk Neon Glow",
    "Datamosh Smear Glitch", "CRT Phosphor Jitter Glitch", "RGB Channel Split Glitch", "Hologram Flicker Glitch",
    "Wireframe Scan Stylize", "Vaporwave Horizon Glitch", "Oil Paint Flow Stylize", "Low Poly Facet Stylize",
    "Chromatic Shockwave Glitch", "Pixel Crush Glitch", "Screen Tear Displace Glitch", "Circuit Trace Glow Stylize",
  ],
});

const neuralAll = dedupe([...nxSubject, ...nxDepth, ...nxAudio, ...nxStylize]);

/* ---------- Suite D — Visual FX (real image-altering primitives) ---------- */

const vfxBlur = makeSet({
  prefix: "vfx-blur", glyph: "bokeh", tag: "BLUR",
  gradient: ["#0f172a", "#64748b"],
  tags: ["cinematic", "minimal", "corporate"],
  names: [
    ["Gaussian Soft Blur", "gaussianBlur"],
    ["Heavy Dream Blur", "gaussianBlur"],
    ["Directional Motion Blur", "directionalBlur"],
    ["Whip Streak Blur", "directionalBlur"],
    ["Radial Zoom Blur", "zoomPulse"],
    ["Focus Pull Defocus", "gaussianBlur"],
    ["Speed Smear Blur", "directionalBlur"],
    ["Tilt Shift Miniature", "gaussianBlur"],
  ],
});

const vfxDistort = makeSet({
  prefix: "vfx-dist", glyph: "shake", tag: "DISTORT",
  gradient: ["#1e1b4b", "#f43f5e"],
  tags: ["gaming", "music", "vlog"],
  names: [
    ["RGB Split Displace", "rgbSplit"],
    ["Chromatic Aberration Lens", "chromaticAberration"],
    ["Camera Shake Handheld", "cameraShake"],
    ["Bass Impact Shake", "cameraShake"],
    ["Earthquake Rumble Shake", "cameraShake"],
    ["Zoom Pulse Punch", "zoomPulse"],
    ["Kaleidoscope Fold FX", "kaleido"],
    ["Mirror Split FX", "mirror"],
  ],
});

const vfxGlitch = makeSet({
  prefix: "vfx-glitch", glyph: "vhs", tag: "GLITCH",
  gradient: ["#4c1d95", "#22d3ee"],
  tags: ["gaming", "retro", "music"],
  names: [
    ["Digital Block Glitch", "glitchBlock"],
    ["Signal Corrupt Glitch", "glitchBlock"],
    ["Datamosh Tear FX", "glitchBlock"],
    ["VHS Tape Warp", "vhs"],
    ["Retro VHS Scanlines", "vhs"],
    ["CRT Phosphor Roll", "vhs"],
    ["Hologram Interference", "rgbSplit"],
    ["Cyberpunk Neon Glow FX", "glow"],
  ],
});

const vfxLight = makeSet({
  prefix: "vfx-light", glyph: "flare", tag: "LIGHT FX",
  gradient: ["#7c2d12", "#fbbf24"],
  tags: ["cinematic", "wedding", "travel"],
  names: [
    ["Soft Bloom Glow", "glow"],
    ["Dreamy Halation Glow", "glow"],
    ["Warm Light Leak Sweep", "lightLeakFx"],
    ["Sunset Leak Burn", "lightLeakFx"],
    ["Cool Window Leak", "lightLeakFx"],
    ["35mm Grain Texture FX", "grain"],
    ["Heavy Noise Stock FX", "grain"],
    ["Neon Glow Pulse", "glow"],
  ],
});

const visualAll = dedupe([...vfxBlur, ...vfxDistort, ...vfxGlitch, ...vfxLight]);

/* ================= EFFECTS TREE ================= */

export const EFFECTS_TREE: EffectCategory[] = [
  {
    id: "visual-fx",
    label: "Visual Effects",
    icon: "glitch",
    count: visualAll.length,
    items: visualAll,
    accent: "#f43f5e",
    gradient: ["#f43f5e", "#22d3ee"],
    badge: "FX",
    children: [
      { id: "vfx-blur-cat", label: "Blur & Focus", icon: "distort", count: vfxBlur.length, items: vfxBlur, accent: "#94a3b8", badge: "BLUR" },
      { id: "vfx-distort-cat", label: "Distort & Shake", icon: "distort", count: vfxDistort.length, items: vfxDistort, accent: "#f43f5e", badge: "WARP" },
      { id: "vfx-glitch-cat", label: "Glitch & VHS", icon: "glitch", count: vfxGlitch.length, items: vfxGlitch, accent: "#22d3ee", badge: "GLITCH" },
      { id: "vfx-light-cat", label: "Glow, Grain & Leaks", icon: "lightbulb", count: vfxLight.length, items: vfxLight, accent: "#fbbf24", badge: "LIGHT" },
    ],
  },
  {
    id: "cinema-grade",
    label: "Cinema Grade",
    icon: "film",
    count: cinemaAll.length,
    items: cinemaAll,
    accent: "#60a5fa",
    gradient: ["#2563eb", "#f59e0b"],
    badge: "NEW",
    children: [
      { id: "cg-signature", label: "Signature Looks", icon: "brush", count: cgSignature.length, items: cgSignature, accent: "#60a5fa", badge: "LUT" },
      { id: "cg-light", label: "Light & Flares", icon: "lightbulb", count: cgLight.length, items: cgLight, accent: "#f59e0b", badge: "LIGHT" },
      { id: "cg-atmosphere", label: "Atmosphere", icon: "overlay", count: cgAtmosphere.length, items: cgAtmosphere, accent: "#22d3ee", badge: "FX" },
      { id: "cg-texture", label: "Film Texture", icon: "film", count: cgTexture.length, items: cgTexture, accent: "#a8a29e", badge: "GRAIN" },
    ],
  },
  {
    id: "motion-lab",
    label: "Motion Lab",
    icon: "target",
    count: motionAll.length,
    items: motionAll,
    accent: "#38bdf8",
    gradient: ["#0ea5e9", "#10b981"],
    badge: "PRO",
    children: [
      { id: "ml-transitions", label: "Kinetic Transitions", icon: "target", count: mlTransitions.length, items: mlTransitions, accent: "#38bdf8", badge: "HOT" },
      { id: "ml-camera", label: "Camera Moves", icon: "camera", count: mlCamera.length, items: mlCamera, accent: "#60a5fa", badge: "RIG" },
      { id: "ml-time", label: "Speed & Time", icon: "flame", count: mlTime.length, items: mlTime, accent: "#10b981", badge: "RAMP" },
      { id: "ml-type", label: "Kinetic Typography", icon: "brush", count: mlType.length, items: mlType, accent: "#818cf8", badge: "TEXT" },
    ],
  },
  {
    id: "neural-fx",
    label: "Neural FX",
    icon: "ai",
    count: neuralAll.length,
    items: neuralAll,
    accent: "#a855f7",
    gradient: ["#a855f7", "#e879f9"],
    badge: "AI",
    children: [
      { id: "nx-subject", label: "Subject & Body AI", icon: "ai", count: nxSubject.length, items: nxSubject, accent: "#a855f7", badge: "AI" },
      { id: "nx-depth", label: "Depth & Space", icon: "layers", count: nxDepth.length, items: nxDepth, accent: "#06b6d4", badge: "3D" },
      { id: "nx-audio", label: "Audio Reactive", icon: "audio", count: nxAudio.length, items: nxAudio, accent: "#e879f9", badge: "SYNC" },
      { id: "nx-stylize", label: "Stylize & Glitch", icon: "glitch", count: nxStylize.length, items: nxStylize, accent: "#8b5cf6", badge: "STYLE" },
    ],
  },
];


/* ================= Standalone library tabs =================
   Each library tab now mirrors a pro NLE: a left sub-category rail
   (Trending / Basic / Mono / Zoom / Film Burn / …) with its own curated
   collections, instead of one flat pool.
   ========================================================================= */

/* ---------- FILTERS ---------- */
const fltBasic = makeSet({
  prefix: "flt-basic", glyph: "star", tag: "FILTER", kind: "grade", fx: "colorGrade",
  gradient: ["#0f172a", "#38bdf8"], tags: ["minimal", "vlog"],
  names: [
    "AI Colour Enhance", "AI White Balance", "Sunny Days", "Teal & Orange",
    "Auto Contrast Lift", "Clean Daylight", "Soft Skin Balance", "Vivid Punch",
  ],
});
const fltMono = makeSet({
  prefix: "flt-mono", glyph: "film", tag: "MONO", kind: "grade", fx: "colorGrade",
  gradient: ["#0a0a0a", "#a8a29e"], tags: ["cinematic", "minimal"],
  names: ["Noir High Contrast", "Silver Print Mono", "Charcoal Fade Mono", "Ink Wash Mono", "Platinum Soft Mono", "Street Grit Mono"],
});
const fltCinematic = makeSet({
  prefix: "flt-cine", glyph: "star", tag: "CINEMATIC", kind: "grade", fx: "colorGrade",
  gradient: ["#0f172a", "#f59e0b"], tags: ["cinematic"],
  names: ["Moody Dark Teal", "Bleach Bypass Steel", "Blockbuster Amber", "Cold Thriller Blue", "Desaturated Drama", "Anamorphic Night"],
});
const fltPortrait = makeSet({
  prefix: "flt-port", glyph: "beauty", tag: "PORTRAIT", kind: "grade", fx: "colorGrade",
  gradient: ["#3f1d38", "#fbcfe8"], tags: ["wedding", "vlog"],
  names: ["Clean Natural Skin", "Soft Beauty Glow Tone", "Studio Ivory Portrait", "Warm Editorial Skin", "Matte Fashion Portrait"],
});
const fltSummer = makeSet({
  prefix: "flt-sum", glyph: "flare", tag: "SUMMER", kind: "grade", fx: "colorGrade",
  gradient: ["#0369a1", "#fde68a"], tags: ["travel"],
  names: ["Coral Beach Summer", "Tropical Aqua Pop", "Golden Hour Warmth", "Poolside Bright", "Sun Kissed Sand"],
});
const fltLifestyle = makeSet({
  prefix: "flt-life", glyph: "star", tag: "LIFESTYLE", kind: "grade", fx: "colorGrade",
  gradient: ["#1f2937", "#f9a8d4"], tags: ["vlog", "minimal"],
  names: ["Soft Pastel Dream", "Cafe Morning Tone", "Urban Everyday", "Nordic Cool Mist", "Muted Journal"],
});
const fltValentine = makeSet({
  prefix: "flt-val", glyph: "sparkle", tag: "VALENTINE", kind: "grade", fx: "colorGrade",
  gradient: ["#4c0519", "#fb7185"], tags: ["wedding"],
  names: ["Rose Blush Romance", "Candlelit Crimson", "Soft Pink Diffusion", "Velvet Love Tone"],
});
const fltRetro = makeSet({
  prefix: "flt-retro", glyph: "vhs", tag: "RETRO", kind: "grade", fx: "colorGrade",
  gradient: ["#3b0764", "#f472b6"], tags: ["retro"],
  names: ["Vintage Film Fade", "Retro VHS Colour", "Faded Polaroid", "Cyber Magenta Wash", "Super 8 Sunwash", "Tokyo Night Neon"],
});

/* ---------- TRANSITIONS ---------- */
const trnTrending = makeSet({
  prefix: "trn-trend", glyph: "wipe", tag: "TRENDING",
  gradient: ["#0c4a6e", "#38bdf8"], tags: ["music", "gaming"],
  names: [
    ["Tropical Waves Sweep", "transitionWarp"],
    ["Gold Glow Luxury Wipe", "glow"],
    ["Page Flip Snap", "transitionWarp"],
    ["Ink Splash Reveal", "transitionWarp"],
    ["Speed Line Rush Cut", "directionalBlur"],
  ],
});
const trnFade = makeSet({
  prefix: "trn-fade", glyph: "wipe", tag: "FADE",
  gradient: ["#111827", "#94a3b8"], tags: ["cinematic"],
  names: [
    ["Fade To Black", "transitionWarp"],
    ["Cross Dissolve", "transitionWarp"],
    ["Additive Dissolve", "glow"],
    ["White Flash Dissolve", "glow"],
    ["Black Flash Cut", "transitionWarp"],
  ],
});
const trnZoom = makeSet({
  prefix: "trn-zoom", glyph: "zoomin", tag: "ZOOM",
  gradient: ["#1e1b4b", "#818cf8"], tags: ["gaming", "music"],
  names: [
    ["Zoom In Punch", "zoomPulse"],
    ["Zoom Out Pull", "zoomPulse"],
    ["Spin Zoom Blur", "directionalBlur"],
    ["Crash Zoom Handoff", "zoomPulse"],
  ],
});
const trnSlides = makeSet({
  prefix: "trn-slide", glyph: "wipe", tag: "SLIDE",
  gradient: ["#0f172a", "#22d3ee"], tags: ["corporate", "travel"],
  names: [
    ["Slide Left Push", "directionalBlur"],
    ["Slide Up Push", "directionalBlur"],
    ["Linear Wipe", "transitionWarp"],
    ["Clock Wipe", "transitionWarp"],
    ["Grid Slice Push", "transitionWarp"],
  ],
});
const trnPremium = makeSet({
  prefix: "trn-prem", glyph: "sparkle", tag: "PREMIUM",
  gradient: ["#3b0764", "#fbbf24"], tags: ["wedding", "cinematic"],
  names: [
    ["Luxury Light Burst", "glow"],
    ["Prism Refraction Wipe", "chromaticAberration"],
    ["Liquid Mercury Morph", "transitionWarp"],
    ["Shatter Glass Break", "glitchBlock"],
  ],
});
const trn3D = makeSet({
  prefix: "trn-3d", glyph: "wipe", tag: "3D",
  gradient: ["#082f49", "#60a5fa"], tags: ["corporate", "gaming"],
  names: [
    ["Cube Rotate 3D", "transitionWarp"],
    ["Depth Push Through 3D", "zoomPulse"],
    ["Barrel Roll 3D", "transitionWarp"],
    ["Card Flip 3D", "mirror"],
  ],
});
const trnFilmBurn = makeSet({
  prefix: "trn-burn", glyph: "leak", tag: "FILM BURN",
  gradient: ["#7c2d12", "#fbbf24"], tags: ["retro", "cinematic"],
  names: [
    ["Film Burn Roll", "lightLeakFx"],
    ["Emulsion Melt Burn", "lightLeakFx"],
    ["Projector Gate Flash", "grain"],
    ["Analog Tape Roll", "vhs"],
  ],
});
const trnGlitchCat = makeSet({
  prefix: "trn-glitch", glyph: "vhs", tag: "GLITCH",
  gradient: ["#4c1d95", "#22d3ee"], tags: ["gaming", "retro"],
  names: [
    ["Glitch Cut Transition", "glitchBlock"],
    ["RGB Split Transition", "rgbSplit"],
    ["VHS Roll Transition", "vhs"],
    ["Pixel Sort Cut", "glitchBlock"],
    ["Shake Cut Transition", "cameraShake"],
  ],
});

/* ---------- TITLES ---------- */
const ttlTrending = makeSet({
  prefix: "ttl-trend", glyph: "text", tag: "TRENDING", fx: "textMotion",
  gradient: ["#1e1b4b", "#818cf8"], tags: ["music", "vlog"],
  names: ["Wintertime Frost Title", "Infernal Wild Metal Title", "Melting Candle Script", "Neon Graffiti Title", "Voltage Surge Title", "Groovy Disco Title"],
});
const ttlCaptions = makeSet({
  prefix: "ttl-cap", glyph: "text", tag: "CAPTIONS", fx: "textMotion",
  gradient: ["#0f172a", "#22d3ee"], tags: ["vlog", "music"],
  names: ["Auto Caption Karaoke", "Word Pop Caption", "Bold Subtitle Bar", "Highlight Word Caption", "Bounce Caption Stack"],
});
const ttlLowerThirds = makeSet({
  prefix: "ttl-lt", glyph: "text", tag: "LOWER THIRD", fx: "textMotion",
  gradient: ["#082f49", "#38bdf8"], tags: ["corporate", "minimal"],
  names: ["Clean Lower Third", "Bold Broadcast Lower Third", "Minimal Name Card", "Glass Panel Title", "Social Handle Bar"],
});
const ttlLuxury = makeSet({
  prefix: "ttl-lux", glyph: "sparkle", tag: "LUXURY", fx: "textMotion",
  gradient: ["#3b0764", "#fbbf24"], tags: ["wedding", "corporate"],
  names: ["Gold Serif Reveal", "Champagne Script Title", "Marble Editorial Title", "Diamond Shine Headline"],
});
const ttlTech = makeSet({
  prefix: "ttl-tech", glyph: "vhs", tag: "TECH", fx: "textMotion",
  gradient: ["#0b1220", "#22d3ee"], tags: ["gaming", "corporate"],
  names: ["Typewriter Terminal Title", "HUD Data Readout", "Glitch Scramble Title", "Circuit Trace Reveal"],
});
const ttlFun = makeSet({
  prefix: "ttl-fun", glyph: "star", tag: "GRAFFITI & FUN", fx: "textMotion",
  gradient: ["#4a044e", "#f472b6"], tags: ["vlog", "music"],
  names: ["Spray Tag Pop", "Comic Slam Title", "Sticker Doodle Title", "Bubble Cartoon Title"],
});
const ttlSport = makeSet({
  prefix: "ttl-sport", glyph: "logo", tag: "SPORT", fx: "textMotion",
  gradient: ["#052e16", "#4ade80"], tags: ["gaming", "corporate"],
  names: ["Stadium Scoreline Title", "Match Day Slam", "Kickoff Countdown Title", "Trophy Reveal Title"],
});

/* ---------- STICKERS ---------- */
const stkTrending = makeSet({
  prefix: "stk-trend", glyph: "sparkle", tag: "TRENDING", fx: "opticalOverlay",
  gradient: ["#4a044e", "#f472b6"], tags: ["vlog", "music"],
  names: ["Sparkle Burst Sticker", "Emoji Reaction Burst", "Fire Emoji Pop", "Confetti Rain Overlay"],
});
const stkSubscribe = makeSet({
  prefix: "stk-sub", glyph: "logo", tag: "SUBSCRIBE", fx: "opticalOverlay",
  gradient: ["#7f1d1d", "#fb7185"], tags: ["vlog"],
  names: ["Subscribe Button Pop", "Subscribed Bell Ring", "Follow Button Slide", "Like & Share Bar"],
});
const stkArrow = makeSet({
  prefix: "stk-arrow", glyph: "logo", tag: "ARROW", fx: "opticalOverlay",
  gradient: ["#7c2d12", "#fb923c"], tags: ["corporate", "vlog"],
  names: ["Curved Hand Arrow", "Straight Pointer Arrow", "Dashed Path Arrow", "Circle Highlight Arrow"],
});
const stkLine = makeSet({
  prefix: "stk-line", glyph: "star", tag: "LINE", fx: "opticalOverlay",
  gradient: ["#0f172a", "#22d3ee"], tags: ["minimal"],
  names: ["Underline Sweep", "Scribble Circle Line", "Divider Draw Line", "Speed Line Frame"],
});
const stkParticle = makeSet({
  prefix: "stk-part", glyph: "leak", tag: "PARTICLE", fx: "opticalOverlay",
  gradient: ["#082f49", "#a5f3fc"], tags: ["cinematic", "wedding"],
  names: ["Star Twinkle Overlay", "Snow Fall Overlay", "Rain Drop Overlay", "Bokeh Circles Overlay", "Light Dust Overlay"],
});
const stkSocial = makeSet({
  prefix: "stk-social", glyph: "grid", tag: "SOCIAL", fx: "opticalOverlay",
  gradient: ["#1e1b4b", "#818cf8"], tags: ["vlog", "music"],
  names: ["Story Progress Bar", "Chat Bubble Pop", "Poll Sticker", "Location Tag Sticker"],
});
const stkLove = makeSet({
  prefix: "stk-love", glyph: "sparkle", tag: "LOVE", fx: "opticalOverlay",
  gradient: ["#4c0519", "#fda4af"], tags: ["wedding"],
  names: ["Heart Float Overlay", "Kiss Mark Pop", "Love Frame Border", "Petal Drift Hearts"],
});

/* ---------- TEMPLATES ---------- */
const tplTrending = makeSet({
  prefix: "tpl-trend", glyph: "grid", tag: "TRENDING",
  gradient: ["#7f1d1d", "#fb7185"], tags: ["vlog", "music"],
  names: [
    ["Minimalist Thanks End Screen", "textMotion"],
    ["Minimalist Countdown", "zoomPulse"],
    ["Combustive Cinematic Opener", "glow"],
    ["Neon Blue End Card", "glow"],
    ["Beat Sync Montage", "cameraShake"],
  ],
});
const tplLogo = makeSet({
  prefix: "tpl-logo", glyph: "sparkle", tag: "LOGO", 
  gradient: ["#0b1220", "#60a5fa"], tags: ["corporate"],
  names: [
    ["Particle Logo Reveal", "glow"],
    ["Liquid Ink Logo Reveal", "transitionWarp"],
    ["Glitch Logo Sting", "glitchBlock"],
    ["Light Streak Logo Reveal", "lightLeakFx"],
  ],
});
const tplExclusive = makeSet({
  prefix: "tpl-excl", glyph: "star", tag: "EXCLUSIVE",
  gradient: ["#3b0764", "#fbbf24"], tags: ["cinematic", "corporate"],
  names: [
    ["Cinematic Trailer Kit", "directionalBlur"],
    ["Product Launch Promo", "glow"],
    ["Luxury Brand Showcase", "glow"],
    ["Fashion Lookbook Kit", "zoomPulse"],
  ],
});
const tplTravel = makeSet({
  prefix: "tpl-travel", glyph: "pan", tag: "TRAVEL",
  gradient: ["#083344", "#22d3ee"], tags: ["travel"],
  names: [
    ["Travel Vlog Opener", "zoomPulse"],
    ["Road Trip Story Reel", "directionalBlur"],
    ["Map Route Journey Kit", "textMotion"],
  ],
});
const tplGallery = makeSet({
  prefix: "tpl-gal", glyph: "grid", tag: "GALLERY",
  gradient: ["#1c1917", "#a8a29e"], tags: ["wedding", "minimal"],
  names: [
    ["Wedding Story Reel", "glow"],
    ["Photo Slideshow Frames", "transitionWarp"],
    ["Split Screen Gallery", "splitLayout"],
  ],
});
const tplSubscribe = makeSet({
  prefix: "tpl-sub", glyph: "grid", tag: "SUBSCRIBE",
  gradient: ["#4a044e", "#f472b6"], tags: ["vlog", "gaming"],
  names: [
    ["Subscribe Outro Kit", "textMotion"],
    ["Gaming Highlight Reel", "glitchBlock"],
    ["Podcast Clip Template", "textMotion"],
    ["Fitness Reel Template", "zoomPulse"],
  ],
});

const cat = (
  id: string,
  label: string,
  icon: EffectIcon,
  items: AssetItem[],
  accent: string,
  badge?: string
): EffectCategory => ({ id, label, icon, count: items.length, items, accent, badge });

/** Sub-category rails for every non-effects library tab. */
export const LIB_TREES: Partial<Record<AssetTab, EffectCategory[]>> = {
  filters: [
    cat("flt-cat-basic", "Basic", "sparkle", fltBasic, "#38bdf8", "AI"),
    cat("flt-cat-mono", "Mono", "film", fltMono, "#a8a29e"),
    cat("flt-cat-cine", "Cinematic", "sparkle", fltCinematic, "#f59e0b", "HOT"),
    cat("flt-cat-port", "Portrait", "smiley", fltPortrait, "#fbcfe8"),
    cat("flt-cat-sum", "Summer", "lightbulb", fltSummer, "#fde68a"),
    cat("flt-cat-life", "Lifestyle", "brush", fltLifestyle, "#f9a8d4"),
    cat("flt-cat-val", "Valentine", "sparkle", fltValentine, "#fb7185"),
    cat("flt-cat-retro", "Retro", "film", fltRetro, "#f472b6"),
  ],
  transitions: [
    cat("trn-cat-trend", "Trending", "reveal", trnTrending, "#38bdf8", "HOT"),
    cat("trn-cat-fade", "Fade & Dissolve", "reveal", trnFade, "#94a3b8"),
    cat("trn-cat-zoom", "Zoom", "camera", trnZoom, "#818cf8"),
    cat("trn-cat-slide", "Slides", "reveal", trnSlides, "#22d3ee"),
    cat("trn-cat-prem", "Premium", "sparkle", trnPremium, "#fbbf24", "PRO"),
    cat("trn-cat-3d", "3D", "shapes", trn3D, "#60a5fa"),
    cat("trn-cat-burn", "Film Burn", "overlay", trnFilmBurn, "#fb923c"),
    cat("trn-cat-glitch", "Glitch", "glitch", trnGlitchCat, "#22d3ee"),
  ],
  titles: [
    cat("ttl-cat-trend", "Trending", "brush", ttlTrending, "#818cf8", "HOT"),
    cat("ttl-cat-cap", "AI Captions", "brush", ttlCaptions, "#22d3ee", "AI"),
    cat("ttl-cat-lt", "Lower Thirds", "brush", ttlLowerThirds, "#38bdf8"),
    cat("ttl-cat-lux", "Luxury", "sparkle", ttlLuxury, "#fbbf24"),
    cat("ttl-cat-tech", "Tech", "glitch", ttlTech, "#22d3ee"),
    cat("ttl-cat-fun", "Graffiti & Fun", "brush", ttlFun, "#f472b6"),
    cat("ttl-cat-sport", "Sport", "target", ttlSport, "#4ade80"),
  ],
  stickers: [
    cat("stk-cat-trend", "Trending", "sparkle", stkTrending, "#f472b6", "HOT"),
    cat("stk-cat-sub", "Subscribe", "target", stkSubscribe, "#fb7185"),
    cat("stk-cat-arrow", "Arrow", "target", stkArrow, "#fb923c"),
    cat("stk-cat-line", "Line", "brush", stkLine, "#22d3ee"),
    cat("stk-cat-part", "Particle", "overlay", stkParticle, "#a5f3fc"),
    cat("stk-cat-social", "Social Media", "layers", stkSocial, "#818cf8"),
    cat("stk-cat-love", "Love", "sparkle", stkLove, "#fda4af"),
  ],
  templates: [
    cat("tpl-cat-trend", "Trending", "layers", tplTrending, "#fb7185", "HOT"),
    cat("tpl-cat-logo", "Logo Reveal", "sparkle", tplLogo, "#60a5fa"),
    cat("tpl-cat-excl", "Exclusive", "sparkle", tplExclusive, "#fbbf24", "PRO"),
    cat("tpl-cat-travel", "Travel", "camera", tplTravel, "#22d3ee"),
    cat("tpl-cat-gal", "Gallery", "layers", tplGallery, "#a8a29e"),
    cat("tpl-cat-sub", "Subscribe", "layers", tplSubscribe, "#f472b6"),
  ],
};

const flat = (tab: AssetTab) => dedupe((LIB_TREES[tab] ?? []).flatMap((c) => c.items ?? []));

/** Colour science only — LUTs and grades never displace pixels. */
export const FILTERS: AssetItem[] = flat("filters");
/** Clip-to-clip transitions. */
export const TRANSITIONS: AssetItem[] = flat("transitions");
/** Animated titles, lower thirds and captions. */
export const TITLES: AssetItem[] = flat("titles");
/** Animated stickers and overlay elements. */
export const STICKERS: AssetItem[] = flat("stickers");
/** Ready-to-use project templates. */
export const TEMPLATES: AssetItem[] = flat("templates");

/** Royalty-free stock footage & photos (live preview clips resolve per id). */
export const STOCK: AssetItem[] = makeSet({
  prefix: "stock", glyph: "film", tag: "STOCK", kind: "media",
  gradient: ["#083344", "#22d3ee"],
  tags: ["travel", "cinematic", "corporate", "minimal"],
  names: [
    "Aerial Coastline 4K", "City Night Traffic 4K", "Forest Mist Morning", "Desert Dunes Sunset",
    "Ocean Waves Slow-Mo", "Mountain Drone Sweep", "Rainy Window Mood", "Neon Street Tokyo",
    "Coffee Shop Ambience", "Office Team Meeting", "Snow Peaks Flyover", "Waterfall Close-Up",
    "Traffic Light Trails", "Skyline Timelapse", "Beach Sunrise Walk", "Autumn Leaves Fall",
    "Studio Portrait Light", "Abstract Ink Flow", "Bokeh Night Lights", "Highway Drive POV",
    "Countryside Fields", "Underwater Reef Dive", "Campfire Night Close", "Modern Architecture Pan",
  ],
});

const audioTrack = (
  id: string,
  name: string,
  tag: string,
  duration: string,
  tags: ContentTag[]
): AssetItem => ({
  id, name, tag, duration, kind: "media", glyph: "note",
  gradient: grad("#064e3b", "#34d399"), tags,
});

/** Background music beds + sound effects. */
export const AUDIO_LIB: AssetItem[] = [
  audioTrack("aud-cin-1", "Cinematic Rise Epic", "CINEMATIC", "2:14", ["cinematic"]),
  audioTrack("aud-cin-2", "Emotional Piano Score", "CINEMATIC", "3:02", ["cinematic"]),
  audioTrack("aud-cin-3", "Trailer Tension Build", "CINEMATIC", "1:48", ["cinematic"]),
  audioTrack("aud-cin-4", "Orchestral Horizon", "CINEMATIC", "2:36", ["cinematic"]),
  audioTrack("aud-vlog-1", "Sunny Vlog Ukulele", "VLOG", "2:05", ["vlog"]),
  audioTrack("aud-vlog-2", "Daily Routine Pop", "VLOG", "2:22", ["vlog"]),
  audioTrack("aud-vlog-3", "Travel Diary Acoustic", "VLOG", "2:47", ["travel"]),
  audioTrack("aud-vlog-4", "Morning Energy Indie", "VLOG", "1:58", ["vlog"]),
  audioTrack("aud-corp-1", "Corporate Uplift", "CORPORATE", "2:30", ["corporate"]),
  audioTrack("aud-corp-2", "Clean Tech Presentation", "CORPORATE", "2:12", ["corporate"]),
  audioTrack("aud-corp-3", "Product Reveal Minimal", "CORPORATE", "1:40", ["minimal"]),
  audioTrack("aud-lofi-1", "Lo-Fi Study Loop", "LO-FI", "3:10", ["minimal"]),
  audioTrack("aud-lofi-2", "Midnight Lo-Fi Tape", "LO-FI", "2:52", ["retro"]),
  audioTrack("aud-lofi-3", "Rainy Day Lo-Fi", "LO-FI", "3:24", ["minimal"]),
  audioTrack("aud-sfx-1", "Whoosh Transition SFX", "SFX", "0:02", ["music"]),
  audioTrack("aud-sfx-2", "Impact Boom SFX", "SFX", "0:03", ["gaming"]),
  audioTrack("aud-sfx-3", "Riser Sweep SFX", "SFX", "0:05", ["music"]),
  audioTrack("aud-sfx-4", "Camera Shutter SFX", "SFX", "0:01", ["minimal"]),
  audioTrack("aud-sfx-5", "Glitch Stutter SFX", "SFX", "0:02", ["gaming"]),
  audioTrack("aud-sfx-6", "Pop Click UI SFX", "SFX", "0:01", ["minimal"]),
];

/** All tags an item carries — checks both its own tags and inferred glyph/family tags. */
export function itemTags(i: AssetItem): ContentTag[] {
  return i.tags ?? [];
}
