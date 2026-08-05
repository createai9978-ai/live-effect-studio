/**
 * NOVA Studio — professional motion engine.
 *
 * Provides Filmora/Premiere-grade animation primitives:
 *  - real cubic-bezier easing solvers (Newton-Raphson + bisection fallback)
 *  - a library of named cinematic curves (expo, quint, back, elastic, filmic)
 *  - unique per-preset motion trajectories (arc, swing, dolly, handheld, whip…)
 *  - velocity sampling so the GPU can render true shutter-angle motion blur
 */

export type EasingId =
  | "filmicSlowIn"
  | "easeOutExpo"
  | "easeInOutQuint"
  | "easeOutBack"
  | "anticipate"
  | "elasticSoft"
  | "snapCut"
  | "driftEase"
  | "whipEase"
  | "cinematicEase";

export type MotionCurve = {
  id: EasingId;
  label: string;
  /** cubic-bezier control points, CSS order: x1, y1, x2, y2 */
  bezier: [number, number, number, number];
};

export const MOTION_CURVES: MotionCurve[] = [
  { id: "cinematicEase", label: "Cinematic Ease", bezier: [0.65, 0.02, 0.15, 1.0] },
  { id: "filmicSlowIn", label: "Filmic Slow-In", bezier: [0.33, 0.0, 0.12, 1.0] },
  { id: "easeOutExpo", label: "Ease Out Expo", bezier: [0.16, 1.0, 0.3, 1.0] },
  { id: "easeInOutQuint", label: "Ease In-Out Quint", bezier: [0.83, 0.0, 0.17, 1.0] },
  { id: "easeOutBack", label: "Overshoot Back", bezier: [0.34, 1.56, 0.64, 1.0] },
  { id: "anticipate", label: "Anticipate", bezier: [0.68, -0.55, 0.27, 1.55] },
  { id: "elasticSoft", label: "Soft Elastic", bezier: [0.22, 1.4, 0.36, 1.0] },
  { id: "snapCut", label: "Snap Cut", bezier: [0.9, 0.0, 0.1, 1.0] },
  { id: "driftEase", label: "Drift", bezier: [0.4, 0.0, 0.6, 1.0] },
  { id: "whipEase", label: "Whip", bezier: [0.95, 0.05, 0.05, 0.95] },
];

const CURVE_BY_ID = new Map(MOTION_CURVES.map((c) => [c.id, c]));

/** Build a cubic-bezier easing function, matching the CSS timing-function math. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    const clamped = Math.min(1, Math.max(0, x));
    // Newton-Raphson first — converges in 3-4 steps for well-formed curves.
    let t = clamped;
    for (let i = 0; i < 5; i += 1) {
      const dx = sampleX(t) - clamped;
      if (Math.abs(dx) < 1e-5) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    // Bisection fallback keeps curves with overshooting control points stable.
    let lo = 0;
    let hi = 1;
    t = clamped;
    for (let i = 0; i < 20; i += 1) {
      const dx = sampleX(t) - clamped;
      if (Math.abs(dx) < 1e-5) break;
      if (dx > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

const EASE_CACHE = new Map<EasingId, (x: number) => number>();

export function easing(id: EasingId) {
  let fn = EASE_CACHE.get(id);
  if (!fn) {
    const curve = CURVE_BY_ID.get(id) ?? MOTION_CURVES[0];
    fn = cubicBezier(...curve.bezier);
    EASE_CACHE.set(id, fn);
  }
  return fn;
}

export function cssEase(id: EasingId) {
  const c = CURVE_BY_ID.get(id) ?? MOTION_CURVES[0];
  return `cubic-bezier(${c.bezier.join(", ")})`;
}

/* ------------------------------------------------------------------ */
/* Trajectories                                                        */
/* ------------------------------------------------------------------ */

export type TrajectoryId =
  | "dollyPush"
  | "arcSweep"
  | "handheldBreath"
  | "pendulumSwing"
  | "whipPan"
  | "spiralPush"
  | "parallaxSlide"
  | "vertigoZoom"
  | "riseFloat"
  | "shutterPulse";

export const TRAJECTORIES: TrajectoryId[] = [
  "dollyPush",
  "arcSweep",
  "handheldBreath",
  "pendulumSwing",
  "whipPan",
  "spiralPush",
  "parallaxSlide",
  "vertigoZoom",
  "riseFloat",
  "shutterPulse",
];

export type MotionSample = {
  /** translation in UV space */
  tx: number;
  ty: number;
  /** uniform scale multiplier around frame centre */
  scale: number;
  /** rotation in radians */
  rot: number;
};

/**
 * A per-preset motion signature. Every field is derived deterministically from
 * the asset hash so two presets never animate identically.
 */
export type MotionSignature = {
  curve: EasingId;
  trajectory: TrajectoryId;
  /** seconds for one full eased cycle */
  period: number;
  /** 0-1 phase offset so simultaneous presets stay out of lockstep */
  phase: number;
  /** translation amplitude in UV units */
  amplitude: number;
  /** zoom amplitude (0 = locked off, 0.08 = 8% push) */
  zoom: number;
  /** rotation amplitude in radians */
  rotation: number;
  /** shutter angle 0-360; drives motion-blur trail length */
  shutter: number;
  /** ping-pong (true) vs. continuous loop (false) */
  pingPong: boolean;
};

function evalTrajectory(id: TrajectoryId, e: number, sig: MotionSignature): MotionSample {
  // `e` is the eased 0..1 progress of the current cycle.
  const s = e * 2 - 1; // -1..1 eased sweep
  const a = sig.amplitude;
  const z = sig.zoom;
  const r = sig.rotation;
  const tau = Math.PI * 2;

  switch (id) {
    case "dollyPush":
      return { tx: 0, ty: -a * 0.25 * e, scale: 1 + z * e, rot: 0 };
    case "arcSweep":
      return { tx: s * a, ty: -Math.sin(e * Math.PI) * a * 0.55, scale: 1 + z * Math.sin(e * Math.PI), rot: s * r * 0.4 };
    case "handheldBreath":
      return {
        tx: Math.sin(e * tau) * a * 0.35 + Math.sin(e * tau * 2.7) * a * 0.15,
        ty: Math.cos(e * tau * 1.3) * a * 0.3,
        scale: 1 + z * 0.4 * Math.sin(e * tau * 0.8),
        rot: Math.sin(e * tau * 0.6) * r * 0.5,
      };
    case "pendulumSwing":
      return { tx: s * a * 0.7, ty: Math.abs(s) * a * 0.2, scale: 1 + z * 0.3, rot: s * r };
    case "whipPan":
      return { tx: s * a * 2.2, ty: 0, scale: 1 + z * (1 - Math.abs(s)) * 1.4, rot: 0 };
    case "spiralPush":
      return {
        tx: Math.cos(e * tau) * a * 0.5,
        ty: Math.sin(e * tau) * a * 0.5,
        scale: 1 + z * e,
        rot: e * r * 1.6,
      };
    case "parallaxSlide":
      return { tx: s * a * 1.4, ty: s * a * 0.2, scale: 1 + z * 0.5, rot: 0 };
    case "vertigoZoom":
      return { tx: 0, ty: 0, scale: 1 + z * 2.2 * Math.sin(e * Math.PI), rot: Math.sin(e * Math.PI) * r * 0.25 };
    case "riseFloat":
      return { tx: Math.sin(e * tau * 0.5) * a * 0.2, ty: -a * 0.9 * e, scale: 1 + z * 0.6 * e, rot: 0 };
    case "shutterPulse":
    default:
      return {
        tx: 0,
        ty: 0,
        scale: 1 + z * 1.6 * Math.pow(Math.sin(e * Math.PI), 3),
        rot: Math.sin(e * tau) * r * 0.3,
      };
  }
}

function progress(sig: MotionSignature, timeSeconds: number) {
  const raw = ((timeSeconds / sig.period + sig.phase) % 1 + 1) % 1;
  const linear = sig.pingPong ? (raw < 0.5 ? raw * 2 : (1 - raw) * 2) : raw;
  return easing(sig.curve)(linear);
}

/** Sample the animated transform at a point in time. */
export function sampleMotion(sig: MotionSignature, timeSeconds: number): MotionSample {
  return evalTrajectory(sig.trajectory, progress(sig, timeSeconds), sig);
}

/**
 * Sample transform + per-frame velocity. The velocity vector is what makes the
 * GPU motion blur cinematic: fast eased sections smear, held sections stay sharp.
 */
export function sampleMotionWithVelocity(sig: MotionSignature, timeSeconds: number, fps = 60) {
  const dt = 1 / fps;
  const cur = sampleMotion(sig, timeSeconds);
  const prev = sampleMotion(sig, timeSeconds - dt);
  const shutter = Math.min(360, Math.max(0, sig.shutter)) / 360;
  return {
    ...cur,
    vx: (cur.tx - prev.tx) * shutter,
    vy: (cur.ty - prev.ty) * shutter,
    vScale: (cur.scale - prev.scale) * shutter,
    shutter,
  };
}

/* ------------------------------------------------------------------ */
/* Signature generation                                                */
/* ------------------------------------------------------------------ */

function hash32(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function slice(h: number, shift: number) {
  return ((h >>> shift) & 255) / 255;
}

/** Bias motion character by effect family so each suite feels distinct. */
type MotionFlavor = "cinematic" | "kinetic" | "glitch" | "ai" | "atmosphere";

const FLAVOR_TRAJECTORIES: Record<MotionFlavor, TrajectoryId[]> = {
  cinematic: ["dollyPush", "arcSweep", "handheldBreath", "riseFloat", "vertigoZoom"],
  kinetic: ["whipPan", "spiralPush", "parallaxSlide", "pendulumSwing", "vertigoZoom"],
  glitch: ["whipPan", "shutterPulse", "parallaxSlide", "pendulumSwing"],
  ai: ["handheldBreath", "spiralPush", "dollyPush", "arcSweep"],
  atmosphere: ["riseFloat", "handheldBreath", "dollyPush", "shutterPulse"],
};

const FLAVOR_CURVES: Record<MotionFlavor, EasingId[]> = {
  cinematic: ["cinematicEase", "filmicSlowIn", "easeInOutQuint", "driftEase"],
  kinetic: ["easeOutExpo", "easeOutBack", "whipEase", "anticipate", "snapCut"],
  glitch: ["snapCut", "whipEase", "anticipate"],
  ai: ["filmicSlowIn", "easeInOutQuint", "elasticSoft", "cinematicEase"],
  atmosphere: ["driftEase", "filmicSlowIn", "cinematicEase"],
};

export function motionSignatureFor(key: string, flavor: MotionFlavor = "cinematic"): MotionSignature {
  const h = hash32(`motion:${key}`);
  const trajectories = FLAVOR_TRAJECTORIES[flavor];
  const curves = FLAVOR_CURVES[flavor];
  const fast = flavor === "kinetic" || flavor === "glitch";

  return {
    curve: curves[Math.floor(slice(h, 0) * curves.length) % curves.length],
    trajectory: trajectories[Math.floor(slice(h, 8) * trajectories.length) % trajectories.length],
    period: fast ? 0.9 + slice(h, 16) * 1.6 : 3.2 + slice(h, 16) * 5.4,
    phase: slice(h, 24),
    amplitude: (fast ? 0.012 : 0.006) + slice(h, 4) * (fast ? 0.03 : 0.016),
    zoom: (fast ? 0.02 : 0.01) + slice(h, 12) * (fast ? 0.07 : 0.035),
    rotation: (slice(h, 20) - 0.5) * (fast ? 0.09 : 0.035),
    shutter: fast ? 160 + slice(h, 28) * 200 : 90 + slice(h, 28) * 150,
    pingPong: slice(h, 6) > (fast ? 0.35 : 0.2),
  };
}

export type { MotionFlavor };

/** Look up the label + control points for a curve id (used by the UI readout). */
export function curveMeta(id: EasingId): MotionCurve {
  return CURVE_BY_ID.get(id) ?? MOTION_CURVES[0];
}
