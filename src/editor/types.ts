export type TrackId = string;

export const INITIAL_VIDEO_TRACKS: TrackId[] = ["V3", "V2", "V1"];
export const INITIAL_AUDIO_TRACKS: TrackId[] = ["A1", "A2", "A3"];

/** Kept for backwards compatibility with existing imports. */
export const VIDEO_TRACKS = INITIAL_VIDEO_TRACKS;
export const AUDIO_TRACKS = INITIAL_AUDIO_TRACKS;

export type PanelVisibility = {
  projectBin: boolean;
  sourceMonitor: boolean;
  effectControls: boolean;
  lumetri: boolean;
  audioMeters: boolean;
};

export const DEFAULT_PANEL_VISIBILITY: PanelVisibility = {
  projectBin: true,
  sourceMonitor: true,
  effectControls: true,
  lumetri: true,
  audioMeters: true,
};

/** History snapshot for Undo/Redo. */
export type HistorySnapshot = {
  clips: Clip[];
  grade: Grade;
};

export type Asset = {
  id: string;
  name: string;
  kind: "video" | "audio" | "image";
  url: string;
  duration: number;
  thumb?: string;
  size: number;
};

/** Default timeline duration (seconds) given to a still image. */
export const IMAGE_CLIP_DURATION = 5;


export type ClipEffects = {
  posX: number;      // pixels, applied to preview
  posY: number;      // pixels
  scale: number;     // percent, 100 = default
  rotation: number;  // degrees
  opacity: number;   // 0..100
  speed: number;     // percent, 100 = default; affects playbackRate + source cursor
  /** Extra CSS filter string layered on top of the master grade (LUTs, glow, halation). */
  filter?: string;
  /** Optional CSS background layer painted over the video (light leaks, gradients). */
  overlay?: string;
  overlayBlend?: string;
  overlayOpacity?: number;
  /** Sub-label appended to the clip in the Effect Controls header (e.g. preset name). */
  presetLabel?: string;
  
  // Film Emulation
  filmType?: "none" | "16mm" | "35mm";
  grainAmount?: number;      // 0..100
  halationAmount?: number;  // 0..100
  gateWeaveAmount?: number; // 0..100

  // Creative LUTs
  lutType?: "none" | "tealOrange" | "vintageKodak" | "portra";
  lutIntensity?: number;    // 0..100

  // Dynamic Effects
  chromaticAberration?: number; // 0..100
  shakeIntensity?: number;      // 0..100
  blurTransition?: number;      // 0..100
  flickerIntensity?: number;    // 0..100
};

export const DEFAULT_EFFECTS: ClipEffects = {
  posX: 0,
  posY: 0,
  scale: 100,
  rotation: 0,
  opacity: 100,
  speed: 100,
  filmType: "none",
  grainAmount: 0,
  halationAmount: 0,
  gateWeaveAmount: 0,
  lutType: "none",
  lutIntensity: 0,
  chromaticAberration: 0,
  shakeIntensity: 0,
  blurTransition: 0,
  flickerIntensity: 0,
};

export type AppliedEffect = {
  id: string;
  name: string;
  enabled: boolean;
  intensity: number;      // 0..100
  filter?: string;
  overlay?: string;
  overlayBlend?: string;
  startOffset: number;    // seconds relative to parent clip start
  duration: number;       // seconds duration of the effect
  /** Parameter family of this effect (drives the Effect Control Panel schema). */
  family?: string;
  /** Live parameter values for the Effect Control Panel. */
  params?: Record<string, number | string>;
  /** Currently selected preset name. */
  preset?: string;
  /** Library item this instance came from. */
  sourceItemId?: string;
  /** Explicit AI/local-analysis lifecycle. AI effects never silently degrade to CSS exposure. */
  processingState?: "queued" | "analyzing" | "ready" | "failed";
  processingProgress?: number;
  processingMessage?: string;
};

export type Clip = {
  id: string;
  assetId: string;
  track: TrackId;
  start: number;         // timeline seconds
  duration: number;      // seconds on the timeline
  offset: number;        // in-point into source media (seconds)
  keyframes: number[];   // pen-tool keyframes, seconds relative to clip start
  effects: ClipEffects;
  group?: string;        // group id — grouped clips move together
  appliedEffects?: AppliedEffect[]; // Stackable non-destructive sub-layers
};

export type Workspace = "editing" | "color" | "audio" | "graphics";

export type Tool =
  | "select"
  | "trackfwd"
  | "ripple"
  | "razor"
  | "slip"
  | "slide"
  | "pen"
  | "hand"
  | "zoom";

export type TrackState = {
  muted: boolean;
  solo: boolean;
  locked: boolean;
  targeted: boolean;
};

export const DEFAULT_TRACK_STATE: TrackState = {
  muted: false,
  solo: false,
  locked: false,
  targeted: true,
};

export type WheelVal = { x: number; y: number }; // -1..1
export type Grade = {
  exposure: number; // -1..1
  contrast: number; // 0.5..1.5
  saturation: number; // 0..2
  temp: number; // -1..1
  tint: number; // -1..1
  curve: number; // 0..1 midpoint of master curve (0.5 = neutral)
  lift: WheelVal;
  gamma: WheelVal;
  gain: WheelVal;
};

export const DEFAULT_GRADE: Grade = {
  exposure: 0,
  contrast: 1,
  saturation: 1,
  temp: 0,
  tint: 0,
  curve: 0.5,
  lift: { x: 0, y: 0 },
  gamma: { x: 0, y: 0 },
  gain: { x: 0, y: 0 },
};

/** Convert the grade into a CSS filter string applied to the program monitor. */
export function gradeToFilter(g: Grade): string {
  const curveBright = 1 + (g.curve - 0.5) * 0.9;
  const brightness =
    (1 + g.exposure * 0.6 + g.gamma.y * -0.25 + g.gain.y * -0.15 + g.lift.y * -0.1) * curveBright;
  const contrast = g.contrast * (1 + (g.curve - 0.5) * 0.3) * (1 + g.gain.y * -0.1);
  const saturate = g.saturation;
  const hue = g.temp * -18 + g.tint * 14 + (g.lift.x + g.gamma.x + g.gain.x) * 12;
  const sepia = Math.max(0, g.temp) * 0.35;
  return [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturate.toFixed(3)})`,
    sepia > 0.01 ? `sepia(${sepia.toFixed(3)})` : "",
    Math.abs(hue) > 0.5 ? `hue-rotate(${hue.toFixed(1)}deg)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function toTimecode(seconds: number, fps = 30): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const f = Math.floor((s % 1) * fps);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}:${p(f)}`;
}

export function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export function niceStep(duration: number): number {
  const target = duration / 14;
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((s) => s >= target) ?? 1200;
}

// deterministic decorative waveform from a string seed
export function waveformBars(seedStr: string, bars: number): number[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 233280;
  const out: number[] = [];
  let s = seed || 7;
  for (let i = 0; i < bars; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const envelope = 0.45 + 0.55 * Math.abs(Math.sin(i / 5 + seed));
    out.push(Math.max(0.1, r * envelope));
  }
  return out;
}

/** Read duration (and a thumbnail for video/image) from a user file. */
export function probeFile(file: File): Promise<Asset | null> {
  const isVideo = file.type.startsWith("video");
  const isAudio = file.type.startsWith("audio");
  const isImage = file.type.startsWith("image");
  if (!isVideo && !isAudio && !isImage) return Promise.resolve(null);
  const url = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const base = { id: uid(), name: file.name, url, size: file.size };

    if (isImage) {
      resolve({ ...base, kind: "image", duration: IMAGE_CLIP_DURATION, thumb: url });
      return;
    }

    if (isAudio) {

      const a = new Audio();
      a.preload = "metadata";
      const done = () =>
        resolve({ ...base, kind: "audio", duration: isFinite(a.duration) ? a.duration : 10 });
      a.onloadedmetadata = done;
      a.onerror = () => resolve({ ...base, kind: "audio", duration: 10 });
      a.src = url;
      return;
    }

    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    let dur = 10;
    let settled = false;

    const finish = (thumb?: string) => {
      if (settled) return;
      settled = true;
      resolve({ ...base, kind: "video", duration: dur, thumb });
    };

    v.onloadedmetadata = () => {
      dur = isFinite(v.duration) ? v.duration : 10;
      try {
        v.currentTime = Math.min(0.5, dur / 2);
      } catch {
        finish();
      }
    };
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 240;
        c.height = 135;
        const ctx = c.getContext("2d");
        ctx?.drawImage(v, 0, 0, 240, 135);
        finish(c.toDataURL("image/jpeg", 0.65));
      } catch {
        finish();
      }
    };
    v.onerror = () => finish();
    setTimeout(() => finish(), 5000);
    v.src = url;
  });
}
