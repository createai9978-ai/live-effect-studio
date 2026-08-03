import { useEffect, useMemo, useRef, useState } from "react";
import { Asset, Clip, toTimecode } from "../editor/types";
import { videoProcessor, EffectParams } from "../editor/VideoProcessor";
import { cn } from "../utils/cn";
import { findAssetItem, previewStyleFor } from "../editor/assetLibrary";
import { composeFilters } from "../editor/effectParams";

type Props = {
  assets: Asset[];
  clips: Clip[];
  time: number;
  playing: boolean;
  contentEnd: number;
  gradeFilter: string;
  audibleTracks: Record<string, boolean>;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onOpenImport: () => void;
  hoveredEffectId?: string | null;
};

/** Map preset labels to WebGL effect parameters */
function presetToEffect(presetLabel?: string): EffectParams | null {
  if (!presetLabel) return null;
  const lower = presetLabel.toLowerCase();
  
  // 1. Film Emulation & Grain
  if (lower.includes("grain") || lower.includes("noise")) {
    return { type: "filmGrain", intensity: 0.45 };
  }
  
  // 2. Optical Flares, Halation, and Leaks
  if (lower.includes("halation") || lower.includes("bloom") || lower.includes("glow")) {
    return { type: "halation", intensity: 0.55 };
  }
  if (lower.includes("flare") || lower.includes("streak") || lower.includes("beams")) {
    return { type: "anamorphicFlare", intensity: 0.65, color: [0.25, 0.65, 1.0] };
  }
  if (lower.includes("leak") || lower.includes("flicker") || lower.includes("sunbeam") || lower.includes("sunset")) {
    return { type: "lightLeak", intensity: 0.5, color: [1.0, 0.55, 0.25] };
  }
  
  // 3. Glitches & Chromatism
  if (lower.includes("chromatic") || lower.includes("aberration") || lower.includes("split")) {
    return { type: "chromaticAberration", intensity: 0.75 };
  }
  if (lower.includes("glitch") || lower.includes("jitter") || lower.includes("distortion") || lower.includes("static")) {
    return { type: "speedGlitch", intensity: 0.65 };
  }
  
  // 4. Creative Atmosphere Gradients
  if (lower.includes("atmosphere") || lower.includes("gradient") || lower.includes("ambient") || lower.includes("mist")) {
    return { type: "atmosphereGradient", intensity: 0.4, color: [0.5, 0.3, 0.8] };
  }
  
  // 5. Vignette fallback
  if (lower.includes("vignette")) {
    return { type: "vignette", intensity: 0.6 };
  }
  
  return null;
}

const V_PRIORITY = ["V3", "V2", "V1"] as const;
const FRAME = 1 / 30;

export default function PreviewPlayer({
  assets,
  clips,
  time,
  playing,
  contentEnd,
  gradeFilter,
  audibleTracks,
  onTogglePlay,
  onSeek,
  onOpenImport,
  hoveredEffectId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [activeEffects, setActiveEffects] = useState<EffectParams[]>([]);

  // topmost audible video clip under the playhead (respects mute/solo)
  const active = useMemo(() => {
    for (const track of V_PRIORITY) {
      if (!audibleTracks[track]) continue;
      const clip = clips.find(
        (c) => c.track === track && time >= c.start && time < c.start + c.duration
      );
      if (clip) {
        const asset = assets.find((a) => a.id === clip.assetId && a.kind === "video");
        if (asset) return { clip, asset };
      }
    }
    return null;
  }, [clips, assets, time, audibleTracks]);

  // Resolve custom styles for a hovered effect
  const hoveredPatch = useMemo(() => {
    if (!hoveredEffectId) return null;
    const item = findAssetItem(hoveredEffectId);
    if (!item) return null;

    if (item.tag === "LUT") {
      const luts: Record<string, any> = {
        "lut-midnight-cyber": { filter: "contrast(1.35) saturate(1.4) brightness(0.88) hue-rotate(-14deg)", overlay: "linear-gradient(180deg, rgba(124,58,237,0.18), rgba(34,211,238,0.14))", overlayBlend: "screen", overlayOpacity: 0.9 },
        "lut-teal-orange-car": { filter: "contrast(1.2) saturate(1.35) brightness(1.02) sepia(0.12) hue-rotate(-6deg)" },
        "lut-high-contrast-matte": { filter: "contrast(1.5) saturate(0.7) brightness(0.98)" },
        "lut-music-video": { filter: "contrast(1.3) saturate(1.55) brightness(1.05)", overlay: "linear-gradient(135deg, rgba(244,63,94,0.16), transparent 60%)", overlayBlend: "screen", overlayOpacity: 0.9 },
        "lut-warm-vintage": { filter: "sepia(0.35) contrast(1.1) saturate(0.9) brightness(1.02)" },
        "lut-blockbuster": { filter: "contrast(1.28) saturate(1.25) brightness(0.95)", overlay: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.35) 100%)", overlayBlend: "multiply", overlayOpacity: 1 },
        "lut-nordic-cool": { filter: "contrast(1.1) saturate(0.85) brightness(1.05) hue-rotate(-4deg)" },
        "lut-golden-commercial": { filter: "contrast(1.15) saturate(1.3) brightness(1.08) sepia(0.15)" },
        "lut-noir-street": { filter: "grayscale(1) contrast(1.4) brightness(0.95)" },
        "lut-fashion-bleach": { filter: "contrast(1.25) saturate(0.55) brightness(1.1)" },
      };
      return luts[item.id] ?? { filter: "contrast(1.15) saturate(1.15)", presetLabel: item.name };
    }
    if (item.tag === "MAGIC") {
      const magic: Record<string, any> = {
        "dl-anamorphic-halation": { filter: "brightness(1.06) saturate(1.2)", overlay: "radial-gradient(ellipse at 70% 40%, rgba(56,189,248,0.5), transparent 45%), linear-gradient(90deg, transparent 20%, rgba(56,189,248,0.35) 50%, transparent 80%)", overlayBlend: "screen", overlayOpacity: 0.85 },
        "dl-lens-streak": { overlay: "linear-gradient(90deg, transparent 30%, rgba(224,242,254,0.55) 50%, transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.75 },
        "dl-reactive-flare": { overlay: "radial-gradient(circle at 65% 35%, rgba(255,240,180,0.85), transparent 35%)", overlayBlend: "screen", overlayOpacity: 0.9, filter: "brightness(1.05)" },
        "dl-neon-halation": { filter: "saturate(1.4) brightness(1.05)", overlay: "radial-gradient(ellipse at 30% 50%, rgba(236,72,153,0.35), transparent 45%), radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.3), transparent 50%)", overlayBlend: "screen", overlayOpacity: 0.9 },
        "dl-golden-diffusion": { filter: "brightness(1.08) saturate(1.1) blur(0.4px)", overlay: "radial-gradient(ellipse at center, rgba(251,191,36,0.2), transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.85 },
        "dl-halogen-warm": { filter: "sepia(0.18) brightness(1.05) saturate(1.15)", overlay: "radial-gradient(ellipse at 20% 70%, rgba(251,191,36,0.32), transparent 55%)", overlayBlend: "screen", overlayOpacity: 0.85 },
        "dl-window-god-rays": { overlay: "linear-gradient(-60deg, transparent 40%, rgba(254,243,199,0.4) 55%, transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.9, filter: "brightness(1.05)" },
        "dl-magic-sparkle": { overlay: "radial-gradient(circle at 25% 30%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 70% 45%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.6) 0 1px, transparent 2px)", overlayBlend: "screen", overlayOpacity: 0.9 },
      };
      return magic[item.id] ?? { overlay: "radial-gradient(ellipse at 60% 40%, rgba(255,240,200,0.4), transparent 50%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: item.name };
    }
    if (item.tag === "GLITCH") {
      const shakePresets: Record<string, any> = {
        "gl-rgb-motion": { filter: "saturate(1.4) contrast(1.15) hue-rotate(6deg)", posX: 4, posY: -3 },
        "gl-chromatic-speed": { filter: "saturate(1.5) contrast(1.2) hue-rotate(-8deg)", posX: -5, posY: 2 },
        "gl-datamosh-burst": { filter: "contrast(1.3) saturate(1.35) hue-rotate(12deg)", overlay: "repeating-linear-gradient(0deg, rgba(220,38,38,0.12) 0 2px, transparent 2px 4px)", overlayBlend: "screen", overlayOpacity: 0.9 },
        "gl-signal-jitter": { filter: "saturate(1.3) contrast(1.2)", posX: 3 },
        "gl-pixel-shatter": { filter: "contrast(1.4) saturate(1.5)", overlay: "repeating-linear-gradient(90deg, rgba(168,85,247,0.15) 0 1px, transparent 1px 3px)", overlayBlend: "screen", overlayOpacity: 0.9 },
        "gl-tape-warp": { filter: "contrast(1.15) saturate(1.25) hue-rotate(-6deg)", overlay: "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0 1px, transparent 1px 4px)", overlayBlend: "multiply", overlayOpacity: 0.85 },
        "gl-vhs-bar": { filter: "contrast(1.2) saturate(1.35)", overlay: "linear-gradient(180deg, transparent 40%, rgba(34,197,94,0.35) 48%, transparent 56%)", overlayBlend: "screen", overlayOpacity: 0.9 },
      };
      return shakePresets[item.id] ?? { filter: "saturate(1.3) hue-rotate(8deg)", posX: 3, presetLabel: item.name };
    }
    if (item.tag === "ATMOS") {
      const atmos: Record<string, any> = {
        "atm-cyberpunk-shift": { filter: "contrast(1.15) saturate(1.3)", overlay: "linear-gradient(135deg, rgba(236,72,153,0.32), rgba(124,58,237,0.24), rgba(34,211,238,0.28))", overlayBlend: "screen", overlayOpacity: 0.85 },
        "atm-sunset-wash": { filter: "saturate(1.15) brightness(1.05)", overlay: "linear-gradient(180deg, rgba(245,158,11,0.3), rgba(244,114,182,0.22))", overlayBlend: "soft-light", overlayOpacity: 0.9 },
        "atm-teal-mist": { filter: "contrast(1.05) saturate(0.9)", overlay: "linear-gradient(180deg, rgba(14,116,144,0.35), rgba(226,232,240,0.15))", overlayBlend: "screen", overlayOpacity: 0.9 },
        "atm-magenta-drift": { overlay: "linear-gradient(135deg, rgba(236,72,153,0.35), rgba(253,242,248,0.15))", overlayBlend: "screen", overlayOpacity: 0.85, filter: "saturate(1.2)" },
        "atm-blue-hour": { filter: "hue-rotate(-6deg) saturate(1.15)", overlay: "linear-gradient(180deg, rgba(15,23,42,0.35), rgba(56,189,248,0.25))", overlayBlend: "screen", overlayOpacity: 0.85 },
        "atm-warm-window": { overlay: "radial-gradient(ellipse at 15% 60%, rgba(251,191,36,0.45), transparent 55%)", overlayBlend: "screen", overlayOpacity: 0.9, filter: "saturate(1.1)" },
        "atm-pastel-dream": { filter: "saturate(0.95) brightness(1.08)", overlay: "linear-gradient(135deg, rgba(253,164,175,0.3), rgba(165,243,252,0.25))", overlayBlend: "screen", overlayOpacity: 0.9 },
        "atm-red-hallway": { filter: "saturate(1.35) contrast(1.15)", overlay: "radial-gradient(ellipse at center, rgba(220,38,38,0.3), rgba(127,29,29,0.2))", overlayBlend: "multiply", overlayOpacity: 0.9 },
      };
      return atmos[item.id] ?? { overlay: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(34,211,238,0.2))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: item.name };
    }
    if (item.tag === "RAMP" || item.tag === "STYLE" || item.tag === "MOTION") {
      const ramp: Record<string, any> = {
        "sr-bass-drop": { speed: 200, filter: "contrast(1.15) saturate(1.25)" },
        "sr-slowmo-freeze": { speed: 30, filter: "contrast(1.1)" },
        "sr-punch-in-ramp": { speed: 180, scale: 118 },
        "sr-time-warp": { speed: 65, scale: 108, rotation: -3 },
        "sr-bpm-cut": { speed: 140 },
        "sr-ease-in-out": { speed: 85 },
        "sr-hyperlapse": { speed: 320 },
        "trending-drone-ascend": { scale: 115, rotation: 2 },
        "trending-fpv-smooth": { scale: 110, rotation: -3 },
        "trending-snap-zoom-out": { scale: 85 },
        "style-crane-lift": { scale: 118, posY: -20 },
        "style-explosion-pull": { scale: 75, filter: "contrast(1.25) saturate(1.3)" },
        "style-time-lapse": { speed: 300, filter: "brightness(1.05) saturate(1.2)" },
      };
      return ramp[item.id] ?? { speed: 150, presetLabel: item.name };
    }
    if (item.tag === "FILM") {
      const filmMap: Record<string, any> = {
        "vf-film-16k-grain": { filter: "contrast(1.08) saturate(0.95) brightness(1.02)", overlay: "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0 1px, transparent 1px 2px)", overlayBlend: "overlay", overlayOpacity: 0.9 },
        "vf-anamorphic-pro": { overlay: "linear-gradient(90deg, transparent 30%, rgba(56,189,248,0.5) 50%, transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.85, filter: "brightness(1.05) saturate(1.15)" },
        "vf-ultra-light-leaks": { overlay: "linear-gradient(135deg, rgba(245,158,11,0.5), transparent 60%)", overlayBlend: "screen", overlayOpacity: 0.9 },
        "vf-optical-blur-trans": { filter: "blur(0.6px) brightness(1.05)" },
        "vf-chroma-gradient": { overlay: "linear-gradient(135deg, rgba(34,211,238,0.28), rgba(244,63,94,0.24), rgba(249,115,22,0.22))", overlayBlend: "screen", overlayOpacity: 0.9 },
        "vf-shutter-30": { filter: "contrast(1.15) brightness(0.95)" },
        "vf-lens-breathing": { scale: 105, filter: "brightness(1.02)" },
        "vf-cin-print-3perf": { filter: "sepia(0.15) contrast(1.1) saturate(1.05)" },
        "vf-vignette-natural": { overlay: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)", overlayBlend: "multiply", overlayOpacity: 1 },
        "vf-lens-dirt": { overlay: "radial-gradient(circle at 30% 40%, rgba(251,191,36,0.15), transparent 12%), radial-gradient(circle at 65% 60%, rgba(251,191,36,0.12), transparent 15%)", overlayBlend: "screen", overlayOpacity: 0.85 },
      };
      return filmMap[item.id] ?? { filter: "contrast(1.1) saturate(1.05)", presetLabel: item.name };
    }
    if (item.isAiPro || item.tag === "AI" || item.tag === "AI_AUDIO") {
      const ai: Record<string, any> = {
        "smart-panda-16k": { filter: "contrast(1.12) saturate(1.15) brightness(1.03)" },
        "smart-neural-cutout": { filter: "contrast(1.05)", overlay: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.35))", overlayBlend: "multiply", overlayOpacity: 1 },
        "smart-portrait-glow": { filter: "brightness(1.08) saturate(1.15) blur(0.4px) contrast(0.98)" },
        "smart-cyberpunk-glitch": { filter: "saturate(1.5) contrast(1.25) hue-rotate(-14deg)", overlay: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(34,211,238,0.2))", overlayBlend: "screen", overlayOpacity: 0.9 },
        "smart-body-morph": { scale: 108, filter: "contrast(1.05)" },
        "smart-color-match": { filter: "contrast(1.2) saturate(1.25) brightness(1.02) sepia(0.08)" },
        "smart-face-relight": { filter: "brightness(1.12) contrast(1.05)", overlay: "radial-gradient(ellipse at 50% 40%, rgba(251,191,36,0.28), transparent 55%)", overlayBlend: "screen", overlayOpacity: 0.85 },
        "smart-scene-upscale": { filter: "contrast(1.15) saturate(1.15) brightness(1.05)" },
        "smart-sky-replace": { overlay: "linear-gradient(180deg, rgba(56,189,248,0.45), transparent 45%)", overlayBlend: "screen", overlayOpacity: 0.9 },
        "smart-lip-sync": { filter: "contrast(1.05) saturate(1.1)" },
        "smart-object-remove": { filter: "contrast(1.05)" },
        "smart-audio-separation": { filter: "saturate(1.1) brightness(1.05)", overlay: "linear-gradient(90deg, rgba(6,182,212,0.1), transparent)", overlayBlend: "screen", overlayOpacity: 0.5 },
      };
      const p = ai[item.id];
      if (p) return p;
    }

    // fallback
    const preview = previewStyleFor(item.glyph);
    const patch: any = {};
    if (preview.filter) patch.filter = preview.filter;
    if (preview.overlay) {
      patch.overlay = preview.overlay;
      patch.overlayBlend = preview.overlayMix;
      patch.overlayOpacity = preview.overlayOpacity;
    }
    patch.presetLabel = item.name;
    return patch;
  }, [hoveredEffectId]);

  const mergedEffects = useMemo(() => {
    if (!active) return null;
    if (hoveredPatch) {
      return {
        ...active.clip.effects,
        ...hoveredPatch,
      };
    }
    return active.clip.effects;
  }, [active, hoveredPatch]);

  // Initialize WebGL processor when video is ready
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.readyState) return;
    const supported = videoProcessor.init(canvas, video);
    setWebglSupported(supported);
    return () => videoProcessor.stop();
  }, [active?.clip.id]);

  // Update effects when active clip's preset changes
  useEffect(() => {
    if (!active) { setActiveEffects([]); return; }
    const effect = presetToEffect(mergedEffects?.presetLabel || active.clip.effects.presetLabel);
    setActiveEffects(effect ? [effect] : []);
  }, [active?.clip.effects.presetLabel, active?.clip.id, mergedEffects?.presetLabel]);

  // Apply effects to processor
  useEffect(() => {
    if (!webglSupported || activeEffects.length === 0) return;
    videoProcessor.setEffects(activeEffects);
  }, [activeEffects, webglSupported]);

  // Start/stop processing based on playback
  useEffect(() => {
    if (!webglSupported || activeEffects.length === 0) return;
    if (playing) videoProcessor.start(() => {});
    else videoProcessor.stop();
    return () => videoProcessor.stop();
  }, [playing, webglSupported, activeEffects.length]);

  // play / pause the element
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, active?.clip.id]);

  // apply Time Remapping (playbackRate) whenever the active clip's speed changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !active || !mergedEffects) return;
    const rate = Math.max(0.1, mergedEffects.speed / 100);
    try {
      v.playbackRate = rate;
    } catch {
      /* browser may reject extreme rates */
    }
  }, [active?.clip.id, mergedEffects?.speed]);

  // scrub sync + drift correction (source cursor scales by speed)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !active || !mergedEffects || v.readyState < 1) return;
    const rate = Math.max(0.1, mergedEffects.speed / 100);
    const target = Math.max(0, active.clip.offset + (time - active.clip.start) * rate);
    if (!playing || Math.abs(v.currentTime - target) > 0.35) {
      try {
        v.currentTime = target;
      } catch {
        /* metadata not ready */
      }
    }
  }, [
    time,
    playing,
    active?.clip.id,
    active?.clip.start,
    active?.clip.offset,
    mergedEffects?.speed,
  ]);

  const hasMedia = assets.length > 0;
  const hasClips = clips.length > 0;

  // Compute dynamic Film & CapCut style adjustments based on active clip sliders
  const cinematicStyles = useMemo(() => {
    if (!mergedEffects) return { filter: "", transform: "", grainOverlay: false, halationGlow: false, weaveTranslate: "" };

    const filters: string[] = [];
    let transform = "";

    // 1. Creative LUTs (scaled by intensity)
    if (mergedEffects.lutType && mergedEffects.lutType !== "none") {
      const intensity = (mergedEffects.lutIntensity ?? 100) / 100;
      if (mergedEffects.lutType === "tealOrange") {
        // Teal and Orange classic commercial look
        filters.push(`contrast(${1 + 0.25 * intensity}) saturate(${1 + 0.35 * intensity}) hue-rotate(${-10 * intensity}deg) sepia(${0.15 * intensity})`);
      } else if (mergedEffects.lutType === "vintageKodak") {
        // 1970s warm vintage look
        filters.push(`sepia(${0.4 * intensity}) contrast(${1 + 0.15 * intensity}) saturate(${1 - 0.2 * intensity})`);
      } else if (mergedEffects.lutType === "portra") {
        // Warm skintones and rich highlights
        filters.push(`saturate(${1 + 0.15 * intensity}) contrast(${1 + 0.08 * intensity}) brightness(${1 + 0.03 * intensity}) sepia(${0.08 * intensity})`);
      }
    }

    // 2. Chromatic Aberration & Edge blur
    if (mergedEffects.chromaticAberration && mergedEffects.chromaticAberration > 0) {
      const amount = mergedEffects.chromaticAberration / 100;
      filters.push(`blur(${0.3 * amount}px)`);
    }

    // 3. Light Flicker
    if (mergedEffects.flickerIntensity && mergedEffects.flickerIntensity > 0) {
      const amount = mergedEffects.flickerIntensity / 100;
      // Pulse brightness quickly during play, otherwise fixed offset
      const flicker = playing ? 1 + (Math.sin(time * 30) * 0.08 * amount) : 1;
      filters.push(`brightness(${flicker})`);
    }

    // 4. Camera Shake & Gate Weave Jitter
    let shakeX = 0;
    let shakeY = 0;
    if (mergedEffects.shakeIntensity && mergedEffects.shakeIntensity > 0) {
      const amount = mergedEffects.shakeIntensity / 100;
      if (playing) {
        shakeX = Math.sin(time * 24) * 8 * amount;
        shakeY = Math.cos(time * 18) * 6 * amount;
      }
    }
    let weaveX = 0;
    let weaveY = 0;
    if (mergedEffects.filmType && mergedEffects.filmType !== "none" && mergedEffects.gateWeaveAmount && mergedEffects.gateWeaveAmount > 0) {
      const amount = mergedEffects.gateWeaveAmount / 100;
      if (playing) {
        weaveX = Math.sin(time * 6) * 3 * amount;
        weaveY = Math.cos(time * 4) * 2 * amount;
      }
    }
    const finalX = (mergedEffects.posX ?? 0) + shakeX + weaveX;
    const finalY = (mergedEffects.posY ?? 0) + shakeY + weaveY;
    transform = `translate(${finalX}px, ${finalY}px) scale(${(mergedEffects.scale ?? 100) / 100}) rotate(${mergedEffects.rotation ?? 0}deg)`;

    return {
      filter: filters.filter(Boolean).join(" "),
      transform,
      grainOverlay: mergedEffects.filmType !== "none" && (mergedEffects.grainAmount ?? 0) > 0,
      halationGlow: (mergedEffects.halationAmount ?? 0) > 0,
      weaveTranslate: `translate(${weaveX}px, ${weaveY}px)`,
    };
  }, [mergedEffects, playing, time]);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[#0a0b10]">
      {/* Monitor header */}
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-300">Program Monitor</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">Main_Sequence</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5">Fit</span>
          <span
            className={
              playing
                ? "flex items-center gap-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-emerald-400"
                : "flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5"
            }
          >
            <span className={playing ? "h-1 w-1 animate-pulse rounded-full bg-emerald-400" : "h-1 w-1 rounded-full bg-zinc-600"} />
            {playing ? "Playing" : "Paused"}
          </span>
        </div>
      </div>

      {/* Video frame */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-4">
        <div className="relative aspect-video max-h-full w-full max-w-full overflow-hidden rounded-md bg-[#07080c] shadow-2xl shadow-black/60 ring-1 ring-white/[0.07]">
          {active && mergedEffects ? (
            <>
              {(() => {
                // Compile all non-destructive stackable sub-layer filters on this clip (playhead-sensitive)
                const stackedFilters: string[] = [];
                active.clip.appliedEffects?.forEach((ae) => {
                  if (ae.enabled && ae.filter) {
                    const startVal = active.clip.start + (ae.startOffset ?? 0);
                    const endVal = startVal + (ae.duration ?? active.clip.duration);
                    if (time >= startVal - 0.02 && time < endVal + 0.02) {
                      stackedFilters.push(ae.filter);
                    }
                  }
                });

                const combinedFilter = [gradeFilter, mergedEffects.filter, cinematicStyles.filter, ...stackedFilters].filter(Boolean).join(" ");

                return active.asset.url ? (
                  <video
                    key={active.clip.id}
                    ref={videoRef}
                    src={active.asset.url}
                    playsInline
                    preload="auto"
                    className="h-full w-full object-contain transition-transform duration-75"
                    style={{
                      filter: combinedFilter,
                      opacity: mergedEffects.opacity / 100,
                      transform: cinematicStyles.transform,
                      transformOrigin: "center center",
                    }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      const rate = Math.max(0.1, mergedEffects.speed / 100);
                      v.playbackRate = rate;
                      v.currentTime = Math.max(0, active.clip.offset + (time - active.clip.start) * rate);
                      if (playing) v.play().catch(() => {});
                    }}
                  />
                ) : (
                  <img
                    key={active.clip.id}
                    src={active.asset.thumb}
                    alt={active.asset.name}
                    className="h-full w-full object-contain transition-transform duration-75"
                    style={{
                      filter: combinedFilter,
                      opacity: mergedEffects.opacity / 100,
                      transform: cinematicStyles.transform,
                      transformOrigin: "center center",
                    }}
                  />
                );
              })()}

              {/* Cinematic Halation Glow Overlay */}
              {cinematicStyles.halationGlow && (
                <div
                  className="pointer-events-none absolute inset-0 bg-red-600 mix-blend-screen opacity-0 transition-opacity duration-200"
                  style={{
                    opacity: (mergedEffects.halationAmount ?? 0) / 350,
                    filter: "blur(20px)",
                  }}
                />
              )}

              {/* Moving 16mm/35mm Film Grain Overlay */}
              {cinematicStyles.grainOverlay && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200"
                  style={{
                    opacity: (mergedEffects.grainAmount ?? 0) / 280,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    mixBlendMode: "overlay",
                    animation: playing ? "nova-flicker 0.1s steps(4) infinite" : undefined,
                  }}
                />
              )}
              {/* WebGL effect processing canvas — overlays processed video */}
              <canvas
                ref={canvasRef}
                className={cn(
                  "pointer-events-none absolute inset-0 transition-opacity",
                  webglSupported && activeEffects.length > 0 ? "opacity-100" : "opacity-0"
                )}
                style={{ mixBlendMode: "normal" }}
              />
              {/* Preset overlay layer — light leaks, atmosphere gradients, halation glow */}
              {mergedEffects.overlay && (
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity"
                  style={{
                    backgroundImage: mergedEffects.overlay,
                    mixBlendMode: (mergedEffects.overlayBlend as React.CSSProperties["mixBlendMode"]) ?? "screen",
                    opacity: mergedEffects.overlayOpacity ?? 0.9,
                  }}
                />
              )}

              {/* Stacked Non-Destructive overlays (playhead-sensitive) */}
              {active.clip.appliedEffects?.map((ae) => {
                if (!ae.enabled || !ae.overlay) return null;
                const startVal = active.clip.start + (ae.startOffset ?? 0);
                const endVal = startVal + (ae.duration ?? active.clip.duration);
                if (time < startVal - 0.02 || time >= endVal + 0.02) return null;

                return (
                  <div
                    key={ae.id}
                    className="pointer-events-none absolute inset-0 transition-opacity"
                    style={{
                      backgroundImage: ae.overlay,
                      mixBlendMode: (ae.overlayBlend as React.CSSProperties["mixBlendMode"]) ?? "screen",
                      opacity: ae.intensity / 100,
                    }}
                  />
                );
              })}
              <div className="pointer-events-none absolute left-3 top-2.5 font-mono text-[10px] text-white/70 drop-shadow">
                {toTimecode(time)}
              </div>
              <div className="pointer-events-none absolute right-3 top-2.5 max-w-[45%] truncate rounded bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-white/70">
                {active.clip.track} · {active.asset.name}
                {Math.abs(mergedEffects.speed - 100) > 0.1 && (
                  <span className="ml-1 text-fuchsia-300">
                    · {(mergedEffects.speed / 100).toFixed(2)}×
                  </span>
                )}
              </div>
              {/* Live preset chip — shows the currently-applied effect's name */}
              {mergedEffects.presetLabel && (
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md border border-violet-400/40 bg-black/60 px-2 py-1 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_6px] shadow-violet-400/80" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-violet-100">
                    {hoveredEffectId ? "PREVIEW" : "FX"} · {mergedEffects.presetLabel}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
              {!hasMedia ? (
                <>
                  <svg className="h-10 w-10 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M10 9l5 3-5 3V9z" />
                  </svg>
                  <div className="text-[12px] text-zinc-600">No media in this project</div>
                  <div className="flex gap-2">
                    <button
                      onClick={onOpenImport}
                      className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110"
                    >
                      Import Media
                    </button>
                  </div>
                </>
              ) : !hasClips ? (
                <>
                  <svg className="h-10 w-10 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
                    <rect x="3" y="17" width="18" height="4" rx="1" />
                  </svg>
                  <div className="text-[12px] text-zinc-600">
                    Drag clips from the Project panel onto the timeline
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-zinc-700">No video clip at playhead</div>
              )}
            </div>
          )}

          {/* Safe margins */}
          {active && (
            <>
              <div className="pointer-events-none absolute inset-[5%] rounded border border-white/[0.06]" />
              <div className="pointer-events-none absolute inset-[10%] rounded border border-white/[0.04]" />
            </>
          )}
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-4 border-t border-white/[0.05] px-4 py-2">
        <div className="rounded-md bg-black/40 px-2.5 py-1 font-mono text-[13px] tracking-wider text-cyan-300">
          {toTimecode(time)}
        </div>

        <div className="flex flex-1 items-center justify-center gap-1.5">
          <TransportBtn title="Go to start (Home)" onClick={() => onSeek(0)}>
            <path d="M6 5v14M20 5l-10 7 10 7V5z" />
          </TransportBtn>
          <TransportBtn title="Previous frame" onClick={() => onSeek(Math.max(0, time - FRAME))}>
            <path d="M15 6l-6 6 6 6" />
          </TransportBtn>
          <TransportBtn title="Back 5s" onClick={() => onSeek(Math.max(0, time - 5))}>
            <path d="M11 5l-7 7 7 7M20 5l-7 7 7 7" />
          </TransportBtn>

          <button
            onClick={onTogglePlay}
            title="Play / Pause (Space)"
            className="mx-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110"
          >
            {playing ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>
            )}
          </button>

          <TransportBtn title="Forward 5s" onClick={() => onSeek(time + 5)}>
            <path d="M4 5l7 7-7 7M13 5l7 7-7 7" />
          </TransportBtn>
          <TransportBtn title="Next frame" onClick={() => onSeek(time + FRAME)}>
            <path d="M9 6l6 6-6 6" />
          </TransportBtn>
          <TransportBtn title="Go to end" onClick={() => onSeek(contentEnd)}>
            <path d="M18 5v14M4 5l10 7-10 7V5z" />
          </TransportBtn>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="hidden font-mono lg:inline">
            Out <span className="text-zinc-300">{toTimecode(contentEnd)}</span>
          </span>
          <span className="hidden rounded bg-white/[0.06] px-1.5 py-0.5 md:inline">Space = Play</span>
        </div>
      </div>
    </main>
  );
}

function TransportBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[0.07] hover:text-zinc-100"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
