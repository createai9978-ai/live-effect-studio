import type { AssetItem } from "./assetLibrary";
import { motionSignatureFor, type MotionFlavor, type MotionSignature } from "./motionEngine";
import type { AppliedEffect } from "./types";
import type { EffectParams, EffectType } from "./VideoProcessor";

export type EffectEngine = "gpu" | "local-ai";

export type RenderProgram = {
  logicId: string;
  engine: EffectEngine;
  type: EffectType;
  seed: number;
  intensity: number;
  motion: number;
  warp: number;
  trail: number;
  color: [number, number, number];
  /** Unique keyframe/easing/motion-blur signature for this preset. */
  motionSig: MotionSignature;
};


function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(h: number, shift: number) {
  return ((h >>> shift) & 255) / 255;
}

export function compileRenderProgram(item: Pick<AssetItem, "id" | "name" | "tag" | "glyph">): RenderProgram {
  const h = hash(`${item.id}:${item.name}`);
  const text = `${item.name} ${item.tag ?? ""} ${item.glyph}`.toLowerCase();
  let type: EffectType = "procedural";
  let engine: EffectEngine = "gpu";

  if (/rotoscope|cutout|silhouette|segment|mask|object remove|green screen/.test(text)) {
    type = "rotoscope";
    engine = "local-ai";
  } else if (/depth|parallax|background blur|fog/.test(text)) {
    type = "depthMap";
    engine = "local-ai";
  } else if (/body|pose|skeleton|face landmark|gaze|tracker|tracking|reframe/.test(text)) {
    type = "bodyTrack";
    engine = "local-ai";
  } else if (/voice-to-fx|voice emotion|speech-driven|audio reactive/.test(text)) {
    type = "voiceSync";
    engine = "local-ai";
  } else if (/interpolat|frame blend|slow-mo|time remap|lip sync|beat detect/.test(text)) {
    type = "motionVectors";
    engine = "local-ai";
  } else if (/trail|echo|clone|ghost/.test(text)) type = "motionTrail";
  else if (/glitch|vhs|crt|scan|datamosh|signal|pixel|cyber|retro/.test(text)) type = "glitchWarp";
  else if (/transition|wipe|slit|dissolve|push|slide|zoom|whip|burst|morph/.test(text)) type = "transitionWarp";
  else if (/flare|leak|burn|dust|scratch|bokeh|fog|smoke|rain|snow|spark|overlay|halation/.test(text)) type = "opticalOverlay";
  else if (/split|grid|panel|mosaic|picture-in-picture/.test(text)) type = "splitLayout";
  else if (/caption|text|title|word|headline|lower third/.test(text)) type = "textMotion";
  else if (/lut|grade|filter|tone|kodak|portra|noir|warmth|aesthetic/.test(text)) type = "colorGrade";
  else if (/speed|ramp|velocity|freeze|hyperlapse/.test(text)) type = "speedWarp";

  return {
    logicId: `nova-fx/${type}/${h.toString(16)}`,
    engine,
    type,
    seed: (h % 100000) / 100000,
    intensity: 0.42 + unit(h, 0) * 0.42,
    motion: 0.18 + unit(h, 8) * 0.78,
    warp: 0.08 + unit(h, 16) * 0.72,
    trail: unit(h, 24) * 0.9,
    color: [0.35 + unit(h, 0) * 0.65, 0.35 + unit(h, 8) * 0.65, 0.35 + unit(h, 16) * 0.65],
  };
}

function value(params: AppliedEffect["params"], key: string, fallback: number) {
  const candidate = params?.[key];
  return typeof candidate === "number" ? candidate : fallback;
}

export function appliedEffectToGpu(effect: AppliedEffect, item: AssetItem | null): EffectParams | null {
  if (!item || !effect.enabled || effect.processingState === "failed") return null;
  const program = item.renderProgram ?? compileRenderProgram(item);
  if (program.engine === "local-ai" && effect.processingState !== "ready") return null;
  const intensity = Math.max(0, Math.min(1, effect.intensity / 100));
  return {
    type: program.type,
    intensity: intensity * program.intensity,
    color: program.color,
    seed: program.seed,
    motion: Math.max(0, Math.min(1, value(effect.params, "stabilize", value(effect.params, "speed", program.motion * 100)) / 100)),
    warp: Math.max(0, Math.min(1, value(effect.params, "depth", value(effect.params, "rgbSplit", program.warp * 100)) / 100)),
    trail: Math.max(0, Math.min(1, value(effect.params, "motionBlur", value(effect.params, "feather", program.trail * 100)) / 100)),
    audio: Math.max(0, Math.min(1, value(effect.params, "audioSensitivity", 72) / 100)),
  };
}

export function requiresLocalAnalysis(item: AssetItem) {
  return (item.renderProgram ?? compileRenderProgram(item)).engine === "local-ai";
}