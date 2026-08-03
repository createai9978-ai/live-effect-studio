/**
 * Context-aware effect parameter schemas.
 *
 * Every effect in the library (and every effect instance placed on the timeline)
 * resolves to an "effect family". A family declares the professional parameters
 * a real NLE would expose for that class of effect (frame interpolation amount,
 * motion blur, feather radius, RGB split distance, …) and knows how to compile
 * those parameters into a live CSS filter / transform / overlay so the program
 * monitor and the control-panel preview react in real time.
 */

export type ParamDef =
  | {
      key: string;
      label: string;
      type: "slider";
      min: number;
      max: number;
      step?: number;
      unit?: string;
      default: number;
      hint?: string;
    }
  | {
      key: string;
      label: string;
      type: "select";
      options: string[];
      default: string;
      hint?: string;
    };

export type ParamValues = Record<string, number | string>;

export type EffectFamily =
  | "ai-motion"
  | "ai-mask"
  | "transition"
  | "glitch"
  | "overlay"
  | "lut"
  | "speed"
  | "blur"
  | "generic";

export type FamilySchema = {
  family: EffectFamily;
  familyLabel: string;
  params: ParamDef[];
  presets: { name: string; values: ParamValues }[];
};

const num = (
  key: string,
  label: string,
  min: number,
  max: number,
  def: number,
  unit = "%",
  step = 1,
  hint?: string
): ParamDef => ({ key, label, type: "slider", min, max, default: def, unit, step, hint });

const sel = (key: string, label: string, options: string[], def: string, hint?: string): ParamDef => ({
  key,
  label,
  type: "select",
  options,
  default: def,
  hint,
});

const SCHEMAS: Record<EffectFamily, FamilySchema> = {
  "ai-motion": {
    family: "ai-motion",
    familyLabel: "AI Motion / Frame Synthesis",
    params: [
      sel("interpolation", "Frame Interpolation", ["Off", "2×", "4×", "8×"], "2×", "Optical-flow frames generated between source frames"),
      num("motionBlur", "Motion Blur Intensity", 0, 100, 35),
      sel("smoothing", "Smoothing Mode", ["Optical Flow", "Frame Blend", "Nearest"], "Optical Flow"),
      num("stabilize", "Motion Smoothness", 0, 100, 45),
      num("sharpen", "Detail Recovery", 0, 100, 30),
    ],
    presets: [
      { name: "Subtle", values: { interpolation: "2×", motionBlur: 18, smoothing: "Frame Blend", stabilize: 25, sharpen: 15 } },
      { name: "Balanced", values: { interpolation: "2×", motionBlur: 35, smoothing: "Optical Flow", stabilize: 45, sharpen: 30 } },
      { name: "Slow-Mo 4×", values: { interpolation: "4×", motionBlur: 55, smoothing: "Optical Flow", stabilize: 70, sharpen: 40 } },
      { name: "Hyper Smooth", values: { interpolation: "8×", motionBlur: 75, smoothing: "Optical Flow", stabilize: 90, sharpen: 55 } },
    ],
  },
  "ai-mask": {
    family: "ai-mask",
    familyLabel: "AI Masking / Depth",
    params: [
      num("maskStrength", "Mask Strength", 0, 100, 70),
      num("feather", "Edge Feather", 0, 100, 25),
      num("depth", "Depth Separation", 0, 100, 50),
      sel("tracking", "Tracking Mode", ["Body", "Face", "Subject", "Background"], "Subject"),
      num("bgBlur", "Background Blur", 0, 100, 40),
    ],
    presets: [
      { name: "Natural", values: { maskStrength: 55, feather: 35, depth: 30, tracking: "Subject", bgBlur: 20 } },
      { name: "Balanced", values: { maskStrength: 70, feather: 25, depth: 50, tracking: "Subject", bgBlur: 40 } },
      { name: "Portrait", values: { maskStrength: 85, feather: 20, depth: 65, tracking: "Face", bgBlur: 70 } },
      { name: "Hard Cutout", values: { maskStrength: 100, feather: 5, depth: 85, tracking: "Body", bgBlur: 90 } },
    ],
  },
  transition: {
    family: "transition",
    familyLabel: "Transition",
    params: [
      num("duration", "Transition Length", 2, 40, 10, "f", 1, "Length in frames at sequence rate"),
      sel("easing", "Easing", ["Linear", "Ease In", "Ease Out", "Ease In-Out", "Exponential"], "Ease In-Out"),
      num("blur", "Directional Blur", 0, 100, 40),
      num("zoom", "Zoom Push", 0, 100, 30),
      num("flash", "Light Burst", 0, 100, 25),
    ],
    presets: [
      { name: "Soft Cut", values: { duration: 6, easing: "Ease Out", blur: 15, zoom: 8, flash: 0 } },
      { name: "Balanced", values: { duration: 10, easing: "Ease In-Out", blur: 40, zoom: 30, flash: 25 } },
      { name: "Whip Pan", values: { duration: 8, easing: "Exponential", blur: 85, zoom: 45, flash: 15 } },
      { name: "Light Burst", values: { duration: 14, easing: "Ease In-Out", blur: 55, zoom: 60, flash: 85 } },
    ],
  },
  glitch: {
    family: "glitch",
    familyLabel: "Glitch / Retro",
    params: [
      num("rgbSplit", "RGB Split Distance", 0, 100, 45),
      num("scanlines", "Scanline Density", 0, 100, 35),
      num("jitter", "Phosphor Jitter", 0, 100, 30),
      num("noise", "Analog Noise", 0, 100, 25),
      sel("mode", "Glitch Mode", ["CRT", "VHS", "Datamosh", "Signal Loss"], "VHS"),
    ],
    presets: [
      { name: "Light Static", values: { rgbSplit: 18, scanlines: 20, jitter: 10, noise: 12, mode: "VHS" } },
      { name: "Balanced", values: { rgbSplit: 45, scanlines: 35, jitter: 30, noise: 25, mode: "VHS" } },
      { name: "CRT Phosphor", values: { rgbSplit: 60, scanlines: 80, jitter: 55, noise: 30, mode: "CRT" } },
      { name: "Signal Loss", values: { rgbSplit: 95, scanlines: 55, jitter: 90, noise: 70, mode: "Signal Loss" } },
    ],
  },
  overlay: {
    family: "overlay",
    familyLabel: "Cinematic Overlay",
    params: [
      num("opacity", "Overlay Opacity", 0, 100, 70),
      sel("blend", "Blend Mode", ["screen", "overlay", "soft-light", "lighten", "color-dodge"], "screen"),
      num("bloom", "Bloom / Halation", 0, 100, 40),
      num("grain", "Dust & Grain", 0, 100, 25),
      num("warmth", "Overlay Warmth", -100, 100, 20, "", 1),
    ],
    presets: [
      { name: "Soft", values: { opacity: 40, blend: "soft-light", bloom: 20, grain: 10, warmth: 10 } },
      { name: "Balanced", values: { opacity: 70, blend: "screen", bloom: 40, grain: 25, warmth: 20 } },
      { name: "Anamorphic", values: { opacity: 85, blend: "screen", bloom: 75, grain: 20, warmth: 35 } },
      { name: "Blown Out", values: { opacity: 100, blend: "color-dodge", bloom: 95, grain: 40, warmth: 55 } },
    ],
  },
  lut: {
    family: "lut",
    familyLabel: "Color / LUT",
    params: [
      num("intensity", "LUT Intensity", 0, 100, 80),
      num("contrast", "Contrast", -100, 100, 15, "", 1),
      num("saturation", "Saturation", -100, 100, 20, "", 1),
      num("temperature", "Temperature", -100, 100, 0, "", 1),
      num("fade", "Film Fade", 0, 100, 10),
    ],
    presets: [
      { name: "Subtle", values: { intensity: 40, contrast: 8, saturation: 8, temperature: 0, fade: 5 } },
      { name: "Balanced", values: { intensity: 80, contrast: 15, saturation: 20, temperature: 0, fade: 10 } },
      { name: "Cinematic", values: { intensity: 100, contrast: 32, saturation: 28, temperature: 18, fade: 22 } },
      { name: "Bleach Bypass", values: { intensity: 100, contrast: 55, saturation: -45, temperature: -10, fade: 30 } },
    ],
  },
  speed: {
    family: "speed",
    familyLabel: "Speed / Time Remap",
    params: [
      num("speed", "Speed", 10, 400, 100, "%", 5),
      num("ramp", "Ramp Aggression", 0, 100, 50),
      num("motionBlur", "Motion Blur", 0, 100, 40),
      sel("interpolation", "Time Interpolation", ["Frame Sampling", "Frame Blend", "Optical Flow"], "Optical Flow"),
    ],
    presets: [
      { name: "Slow Push", values: { speed: 60, ramp: 30, motionBlur: 25, interpolation: "Frame Blend" } },
      { name: "Balanced", values: { speed: 100, ramp: 50, motionBlur: 40, interpolation: "Optical Flow" } },
      { name: "Bullet Time", values: { speed: 25, ramp: 90, motionBlur: 70, interpolation: "Optical Flow" } },
      { name: "Beat Drop", values: { speed: 220, ramp: 80, motionBlur: 60, interpolation: "Frame Sampling" } },
    ],
  },
  blur: {
    family: "blur",
    familyLabel: "Blur / Optics",
    params: [
      num("amount", "Blur Amount", 0, 100, 35),
      sel("type", "Blur Type", ["Gaussian", "Radial", "Directional", "Bokeh"], "Gaussian"),
      num("angle", "Angle", 0, 360, 0, "°", 1),
      num("highlights", "Highlight Bloom", 0, 100, 30),
    ],
    presets: [
      { name: "Soft Focus", values: { amount: 18, type: "Gaussian", angle: 0, highlights: 20 } },
      { name: "Balanced", values: { amount: 35, type: "Gaussian", angle: 0, highlights: 30 } },
      { name: "Dreamy Bokeh", values: { amount: 55, type: "Bokeh", angle: 0, highlights: 70 } },
      { name: "Zoom Blur", values: { amount: 80, type: "Radial", angle: 45, highlights: 45 } },
    ],
  },
  generic: {
    family: "generic",
    familyLabel: "Effect",
    params: [
      num("intensity", "Effect Intensity", 0, 100, 75),
      num("contrast", "Contrast", -100, 100, 10, "", 1),
      num("saturation", "Saturation", -100, 100, 15, "", 1),
      num("softness", "Softness", 0, 100, 10),
      num("scale", "Scale", 100, 160, 100, "%", 1),
    ],
    presets: [
      { name: "Subtle", values: { intensity: 35, contrast: 4, saturation: 5, softness: 4, scale: 100 } },
      { name: "Balanced", values: { intensity: 75, contrast: 10, saturation: 15, softness: 10, scale: 100 } },
      { name: "Cinematic", values: { intensity: 90, contrast: 25, saturation: 25, softness: 6, scale: 106 } },
      { name: "Extreme", values: { intensity: 100, contrast: 45, saturation: 45, softness: 0, scale: 115 } },
    ],
  },
};

/** Resolve a family from an effect name / pack tag. */
export function familyFor(name: string, tag?: string): EffectFamily {
  const n = `${name} ${tag ?? ""}`.toLowerCase();
  if (/interpolat|frame rate|slow ?mo|motion sync|voice-to-fx|smart body|tracking|fps/.test(n)) return "ai-motion";
  if (/rotoscope|depth|mask|cutout|background|portrait|segment|body effect/.test(n)) return "ai-mask";
  if (/transition|wipe|slit|zoom blur|whip|burst|dissolve|swipe|morph/.test(n)) return "transition";
  if (/glitch|vhs|crt|retro|rgb|datamosh|scanline|cyberpunk|distort/.test(n)) return "glitch";
  if (/overlay|flare|leak|burn|dust|scratch|bokeh|halation|atmos|light|magic/.test(n)) return "overlay";
  if (/lut|grade|filter|teal|orange|noir|kodak|portra|color|tone/.test(n)) return "lut";
  if (/speed|ramp|time|freeze|velocity/.test(n)) return "speed";
  if (/blur|focus|defocus|tilt/.test(n)) return "blur";
  return "generic";
}

export function schemaFor(family: EffectFamily): FamilySchema {
  return SCHEMAS[family] ?? SCHEMAS.generic;
}

export function defaultValues(family: EffectFamily): ParamValues {
  const out: ParamValues = {};
  for (const p of schemaFor(family).params) out[p.key] = p.default;
  return out;
}

const n = (v: number | string | undefined, fallback = 0) =>
  typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : fallback;

export type VisualResult = {
  filter: string;
  transform: string;
  overlay?: string;
  overlayBlend?: string;
  overlayOpacity?: number;
};

/** Compile parameter values into a live CSS visual result. */
export function paramsToVisual(family: EffectFamily, v: ParamValues): VisualResult {
  const f: string[] = [];
  let transform = "";
  let overlay: string | undefined;
  let overlayBlend: string | undefined;
  let overlayOpacity: number | undefined;

  switch (family) {
    case "ai-motion": {
      // Frame-synthesis is simulated on the CPU/GPU-less path. It must never
      // fall back to a whole-frame blur (that read as broken footage), so the
      // motion cue is a very small directional softening plus detail recovery.
      const mb = n(v.motionBlur) / 100;
      const sharp = n(v.sharpen) / 100;
      const mult = v.interpolation === "8×" ? 1.3 : v.interpolation === "4×" ? 1.15 : v.interpolation === "2×" ? 1.05 : 1;
      f.push(`contrast(${(1 + sharp * 0.22).toFixed(3)})`, `saturate(${(1 + sharp * 0.15).toFixed(3)})`);
      if (mb > 0.35) f.push(`blur(${(Math.min(mb, 1) * 0.6).toFixed(2)}px)`);
      transform = `scale(${(1 + (n(v.stabilize) / 100) * 0.03 * mult).toFixed(3)})`;
      break;
    }
    case "ai-mask": {
      // Background separation is expressed through a depth vignette rather than
      // a global blur, so the subject/edges stay perfectly sharp.
      const bg = n(v.bgBlur) / 100;
      f.push(
        `contrast(${(1 + (n(v.depth) / 100) * 0.25).toFixed(3)})`,
        `saturate(${(1 + (n(v.maskStrength) / 100) * 0.2).toFixed(3)})`
      );
      overlay = `radial-gradient(ellipse at 50% 48%, transparent ${(30 + n(v.feather) * 0.25).toFixed(0)}%, rgba(0,0,0,${(0.15 + bg * 0.5).toFixed(2)}) 100%)`;
      overlayBlend = "multiply";
      overlayOpacity = 0.35 + (n(v.maskStrength) / 100) * 0.5;
      break;
    }
    case "transition": {
      const b = n(v.blur) / 100;
      const z = n(v.zoom) / 100;
      const flash = n(v.flash) / 100;
      if (b > 0.02) f.push(`blur(${(b * 3).toFixed(2)}px)`);
      f.push(`brightness(${(1 + flash * 0.35).toFixed(3)})`, `contrast(${(1 + b * 0.15).toFixed(3)})`);
      transform = `scale(${(1 + z * 0.18).toFixed(3)})`;
      if (flash > 0.02) {
        overlay = `radial-gradient(ellipse at center, rgba(255,255,255,${(flash * 0.7).toFixed(2)}), transparent 65%)`;
        overlayBlend = "screen";
        overlayOpacity = flash;
      }
      break;
    }
    case "glitch": {
      const split = n(v.rgbSplit) / 100;
      const noise = n(v.noise) / 100;
      f.push(
        `saturate(${(1 + split * 0.7).toFixed(3)})`,
        `contrast(${(1 + noise * 0.4).toFixed(3)})`,
        `hue-rotate(${(split * 12).toFixed(1)}deg)`
      );
      if (v.mode === "VHS") f.push(`brightness(1.03)`);
      if (v.mode === "Signal Loss") f.push(`grayscale(${(noise * 0.35).toFixed(2)})`);
      const density = Math.max(2, 10 - (n(v.scanlines) / 100) * 8);
      overlay = `repeating-linear-gradient(0deg, rgba(0,0,0,${(0.12 + noise * 0.25).toFixed(2)}) 0px, rgba(0,0,0,0) ${density.toFixed(1)}px, rgba(0,0,0,0) ${(density * 2).toFixed(1)}px)`;
      overlayBlend = "multiply";
      overlayOpacity = 0.25 + (n(v.scanlines) / 100) * 0.6;
      transform = `translateX(${((n(v.jitter) / 100) * 3).toFixed(2)}px)`;
      break;
    }
    case "overlay": {
      const bloom = n(v.bloom) / 100;
      const warm = n(v.warmth) / 100;
      f.push(`brightness(${(1 + bloom * 0.15).toFixed(3)})`, `saturate(${(1 + bloom * 0.25).toFixed(3)})`);
      if (warm > 0) f.push(`sepia(${(warm * 0.3).toFixed(2)})`);
      if (warm < 0) f.push(`hue-rotate(${(warm * 15).toFixed(1)}deg)`);
      overlay = `radial-gradient(ellipse at 70% 35%, rgba(255,224,170,${(0.25 + bloom * 0.5).toFixed(2)}), transparent 55%), linear-gradient(90deg, transparent 25%, rgba(255,240,210,${(bloom * 0.35).toFixed(2)}) 50%, transparent 75%)`;
      overlayBlend = String(v.blend ?? "screen");
      overlayOpacity = n(v.opacity, 70) / 100;
      break;
    }
    case "lut": {
      const i = n(v.intensity) / 100;
      f.push(
        `contrast(${(1 + (n(v.contrast) / 100) * 0.5 * i).toFixed(3)})`,
        `saturate(${(1 + (n(v.saturation) / 100) * 0.8 * i).toFixed(3)})`,
        `brightness(${(1 - (n(v.fade) / 100) * 0.06).toFixed(3)})`
      );
      const t = n(v.temperature) / 100;
      if (t > 0) f.push(`sepia(${(t * 0.35 * i).toFixed(2)})`);
      if (t < 0) f.push(`hue-rotate(${(t * 14 * i).toFixed(1)}deg)`);
      if (n(v.fade) > 2) {
        overlay = `linear-gradient(0deg, rgba(120,130,160,${((n(v.fade) / 100) * 0.35).toFixed(2)}), rgba(120,130,160,${((n(v.fade) / 100) * 0.2).toFixed(2)}))`;
        overlayBlend = "screen";
        overlayOpacity = 0.6;
      }
      break;
    }
    case "speed": {
      const mb = n(v.motionBlur) / 100;
      const fast = n(v.speed, 100) / 100;
      if (mb > 0.02) f.push(`blur(${(mb * 2).toFixed(2)}px)`);
      f.push(`contrast(${(1 + (n(v.ramp) / 100) * 0.2).toFixed(3)})`, `saturate(${(1 + (fast > 1 ? 0.2 : -0.05)).toFixed(3)})`);
      transform = `scale(${(1 + Math.min(0.12, Math.abs(fast - 1) * 0.08)).toFixed(3)})`;
      break;
    }
    case "blur": {
      const a = n(v.amount) / 100;
      f.push(`blur(${(a * 6).toFixed(2)}px)`, `brightness(${(1 + (n(v.highlights) / 100) * 0.18).toFixed(3)})`);
      if (v.type === "Bokeh") f.push(`saturate(1.2)`);
      transform = v.type === "Radial" ? `scale(${(1 + a * 0.1).toFixed(3)}) rotate(${(n(v.angle) * 0.01).toFixed(2)}deg)` : "";
      break;
    }
    default: {
      const i = n(v.intensity, 75) / 100;
      f.push(
        `contrast(${(1 + (n(v.contrast) / 100) * 0.5 * i).toFixed(3)})`,
        `saturate(${(1 + (n(v.saturation) / 100) * 0.7 * i).toFixed(3)})`
      );
      if (n(v.softness) > 2) f.push(`blur(${((n(v.softness) / 100) * 1.5).toFixed(2)}px)`);
      transform = `scale(${(n(v.scale, 100) / 100).toFixed(3)})`;
    }
  }

  return { filter: f.filter(Boolean).join(" "), transform, overlay, overlayBlend, overlayOpacity };
}

/* ---------- custom user presets (localStorage) ---------- */
const CUSTOM_KEY = "nova.customPresets.v1";
export type CustomPreset = { id: string; family: EffectFamily; name: string; values: ParamValues };

export function loadCustomPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(p: CustomPreset): CustomPreset[] {
  const next = [...loadCustomPresets().filter((x) => !(x.family === p.family && x.name === p.name)), p];
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function deleteCustomPreset(id: string): CustomPreset[] {
  const next = loadCustomPresets().filter((x) => x.id !== id);
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/* ------------------------------------------------------------------ *
 * Filter composition
 *
 * Stacking raw CSS filter strings ("blur(3px) blur(4px) contrast(1.4) …")
 * multiplies destructively and produces the washed-out, edge-smeared
 * "blasted" frame. composeFilters merges duplicate functions with the right
 * math per function and clamps every channel to a safe broadcast range so a
 * heavy effect stack degrades gracefully instead of destroying the image.
 * ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function composeFilters(parts: (string | undefined | null | false)[]): string {
  let blur = 0;
  let brightness = 1;
  let contrast = 1;
  let saturate = 1;
  let opacity = 1;
  let hue = 0;
  let grayscale = 0;
  let sepia = 0;
  let invert = 0;
  const passthrough: string[] = [];
  let used = false;

  const re = /([a-z-]+)\(([^)]*)\)/gi;

  for (const raw of parts) {
    if (!raw || typeof raw !== "string") continue;
    const s = raw.trim();
    if (!s || s === "none") continue;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const fn = m[1].toLowerCase();
      const argRaw = m[2].trim();
      const numeric = parseFloat(argRaw);
      const isPercent = argRaw.endsWith("%");
      const unitless = isNaN(numeric) ? 0 : isPercent ? numeric / 100 : numeric;
      used = true;
      switch (fn) {
        case "blur":
          blur += isNaN(numeric) ? 0 : numeric;
          break;
        case "brightness":
          brightness *= unitless;
          break;
        case "contrast":
          contrast *= unitless;
          break;
        case "saturate":
          saturate *= unitless;
          break;
        case "opacity":
          opacity *= unitless;
          break;
        case "hue-rotate":
          hue += isNaN(numeric) ? 0 : numeric;
          break;
        case "grayscale":
          grayscale = Math.max(grayscale, unitless);
          break;
        case "sepia":
          sepia = Math.max(sepia, unitless);
          break;
        case "invert":
          invert = Math.max(invert, unitless);
          break;
        default:
          passthrough.push(`${fn}(${argRaw})`);
      }
    }
  }

  if (!used) return "";

  const out: string[] = [];
  // Colour first, optics last — matches how an NLE orders its render stack.
  if (Math.abs(contrast - 1) > 0.001) out.push(`contrast(${clamp(contrast, 0.35, 2.2).toFixed(3)})`);
  if (Math.abs(brightness - 1) > 0.001) out.push(`brightness(${clamp(brightness, 0.4, 1.8).toFixed(3)})`);
  if (Math.abs(saturate - 1) > 0.001) out.push(`saturate(${clamp(saturate, 0, 2.6).toFixed(3)})`);
  if (Math.abs(hue) > 0.1) out.push(`hue-rotate(${clamp(hue, -180, 180).toFixed(1)}deg)`);
  if (sepia > 0.001) out.push(`sepia(${clamp(sepia, 0, 1).toFixed(3)})`);
  if (grayscale > 0.001) out.push(`grayscale(${clamp(grayscale, 0, 1).toFixed(3)})`);
  if (invert > 0.001) out.push(`invert(${clamp(invert, 0, 1).toFixed(3)})`);
  for (const p of passthrough) out.push(p);
  // Blur is the main cause of edge breakdown — hard-capped and applied once.
  if (blur > 0.05) out.push(`blur(${clamp(blur, 0, 4).toFixed(2)}px)`);
  if (opacity < 0.999) out.push(`opacity(${clamp(opacity, 0.15, 1).toFixed(3)})`);

  return out.join(" ");
}
