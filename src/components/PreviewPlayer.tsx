import { useEffect, useMemo, useRef, useState } from "react";
import { Asset, Clip, toTimecode } from "../editor/types";
import { videoProcessor, EffectParams } from "../editor/VideoProcessor";
import { cn } from "../utils/cn";
import { findAssetItem } from "../editor/assetLibrary";
import { composeFilters } from "../editor/effectParams";
import { appliedEffectToGpu, compileRenderProgram } from "../editor/effectRuntime";

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
  audioLevel?: number;
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
  audioLevel = 0,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [gpuFrameReady, setGpuFrameReady] = useState(false);
  const [activeEffects, setActiveEffects] = useState<EffectParams[]>([]);
  // Intrinsic aspect of the current source. Overlays are constrained to this
  // letterboxed content box so a "screen" blend can never light up the black
  // surround (that was the blue/white wash around the frame).
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  // topmost audible video clip under the playhead (respects mute/solo)
  const active = useMemo(() => {
    for (const track of V_PRIORITY) {
      if (!audibleTracks[track]) continue;
      const clip = clips.find(
        (c) => c.track === track && time >= c.start && time < c.start + c.duration
      );
      if (clip) {
        const asset = assets.find((a) => a.id === clip.assetId && a.kind !== "audio");
        if (asset) return { clip, asset };
      }

    }
    return null;
  }, [clips, assets, time, audibleTracks]);

  const mergedEffects = useMemo(() => active?.clip.effects ?? null, [active]);

  // Initialize WebGL processor when video is ready
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    setGpuFrameReady(false);
    if (!video || !canvas || !video.readyState) return;
    const supported = videoProcessor.init(canvas, video);
    setWebglSupported(supported);
    // If the GPU path dies at runtime (context loss, tainted frame, driver bug)
    // we hide the canvas and keep the CSS-filter path as the visible result
    // instead of leaving an unintended blur/glitch frame on screen.
    videoProcessor.setFailureHandler(() => {
      setWebglSupported(false);
      setGpuFrameReady(false);
    });
    return () => {
      videoProcessor.setFailureHandler(null);
      videoProcessor.stop();
    };
  }, [active?.clip.id]);

  // Compile every playhead-active timeline instance into its own GPU program.
  // AI programs remain disabled until their explicit local-analysis state is ready.
  useEffect(() => {
    if (!active) { setActiveEffects([]); return; }
    const stack = (active.clip.appliedEffects ?? []).flatMap((effect) => {
      const start = active.clip.start + effect.startOffset;
      if (time < start || time >= start + effect.duration) return [];
      const asset = effect.sourceItemId ? findAssetItem(effect.sourceItemId) : null;
      const compiled = appliedEffectToGpu(effect, asset);
      return compiled ? [compiled] : [];
    });
    if (hoveredEffectId) {
      const item = findAssetItem(hoveredEffectId);
      if (item) {
        const program = item.renderProgram ?? compileRenderProgram(item);
        if (program.engine === "gpu") stack.push({ type: program.type, intensity: program.intensity, color: program.color, seed: program.seed, motion: program.motion, warp: program.warp, trail: program.trail });
      }
    }
    // Legacy clip-level presets remain supported, but no longer replace timeline programs.
    const legacy = presetToEffect(mergedEffects?.presetLabel || active.clip.effects.presetLabel);
    if (stack.length === 0 && legacy) stack.push(legacy);
    setActiveEffects(stack);
  }, [active, hoveredEffectId, mergedEffects?.presetLabel, time]);

  // Apply effects to processor
  useEffect(() => {
    if (!webglSupported) return;
    videoProcessor.setAudioLevel(audioLevel);
    videoProcessor.setEffects(activeEffects);
    if (activeEffects.length === 0) setGpuFrameReady(false);
  }, [activeEffects, webglSupported, audioLevel]);

  // Start/stop processing based on playback
  useEffect(() => {
    if (!webglSupported || activeEffects.length === 0) {
      videoProcessor.stop();
      setGpuFrameReady(false);
      return;
    }
    videoProcessor.start(() => setGpuFrameReady(true));
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
        filters.push(`contrast(${1 + 0.25 * intensity}) saturate(${1 + 0.35 * intensity}) sepia(${0.12 * intensity})`);
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

  // Single, de-duplicated CSS grade for this frame. It is applied to BOTH the
  // source element and the GPU canvas so switching pipelines never changes the
  // look, and the clamped composer keeps brightness from blowing out to white.
  const combinedFilter = useMemo(() => {
    if (!active || !mergedEffects) return "";
    const stacked: string[] = [];
    active.clip.appliedEffects?.forEach((ae) => {
      if (!ae.enabled || !ae.filter) return;
      const startVal = active.clip.start + (ae.startOffset ?? 0);
      const endVal = startVal + (ae.duration ?? active.clip.duration);
      if (time >= startVal - 0.02 && time < endVal + 0.02) stacked.push(ae.filter);
    });
    return composeFilters([gradeFilter, mergedEffects.filter, cinematicStyles.filter, ...stacked]);
  }, [active, mergedEffects, cinematicStyles.filter, gradeFilter, time]);

  // Letterboxed content box: overlays live inside it so blend modes only touch
  // the picture, never the black surround around it.
  const contentBoxStyle: React.CSSProperties = videoAspect
    ? { aspectRatio: String(videoAspect), maxWidth: "100%", maxHeight: "100%", width: "100%" }
    : { width: "100%", height: "100%" };

  return (
    <main className="nova-program-monitor nova-panel-card flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Monitor header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">

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
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-black p-2.5">
        <div className="relative h-full max-h-full w-full max-w-full overflow-hidden rounded-md bg-[#000000] shadow-2xl shadow-black/60 ring-1 ring-white/[0.07]">
          {active && mergedEffects ? (
            <>
              {(() => {
                return active.asset.kind === "video" && active.asset.url ? (
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
                      if (v.videoWidth && v.videoHeight) setVideoAspect(v.videoWidth / v.videoHeight);
                      const rate = Math.max(0.1, mergedEffects.speed / 100);
                      v.playbackRate = rate;
                      v.currentTime = Math.max(0, active.clip.offset + (time - active.clip.start) * rate);
                      const canvas = canvasRef.current;
                      if (canvas) {
                        const supported = videoProcessor.init(canvas, v);
                        setWebglSupported(supported);
                        videoProcessor.setFailureHandler(() => {
                          setWebglSupported(false);
                          setGpuFrameReady(false);
                        });
                      }
                      if (playing) v.play().catch(() => {});
                    }}
                  />
                ) : (
                  <img
                    key={active.clip.id}
                    src={active.asset.kind === "image" ? active.asset.url : active.asset.thumb}
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
                    opacity: Math.min(0.3, (mergedEffects.halationAmount ?? 0) / 500),
                    filter: "blur(20px)",
                  }}
                />
              )}

              {/* Moving 16mm/35mm Film Grain Overlay */}
              {cinematicStyles.grainOverlay && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200"
                  style={{
                    opacity: Math.min(0.25, (mergedEffects.grainAmount ?? 0) / 400),
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    mixBlendMode: "overlay",
                    animation: playing ? "nova-flicker 0.1s steps(4) infinite" : undefined,
                  }}
                />
              )}
              {/*
                GPU effect canvas. It is only revealed once the pipeline has
                actually produced a frame — otherwise the empty/stale drawing
                buffer covered the video and looked like a corrupted frame.
                object-contain matches the <video> letterboxing exactly, so the
                processed frame can never be stretched or edge-smeared.
              */}
              <canvas
                ref={canvasRef}
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-200",
                  gpuFrameReady && webglSupported && activeEffects.length > 0 ? "opacity-100" : "opacity-0"
                )}
                style={{ mixBlendMode: "normal", filter: combinedFilter, isolation: "isolate" }}
              />
              {/* Overlay stack — constrained to the picture area only */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative overflow-hidden" style={contentBoxStyle}>
                  {mergedEffects.overlay && (
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                      style={{
                        backgroundImage: mergedEffects.overlay,
                        mixBlendMode:
                          (mergedEffects.overlayBlend as React.CSSProperties["mixBlendMode"]) ?? "soft-light",
                        opacity: Math.min(0.6, mergedEffects.overlayOpacity ?? 0.5),
                      }}
                    />
                  )}
                  {active.clip.appliedEffects?.map((ae) => {
                    if (!ae.enabled || !ae.overlay) return null;
                    const startVal = active.clip.start + (ae.startOffset ?? 0);
                    const endVal = startVal + (ae.duration ?? active.clip.duration);
                    if (time < startVal - 0.02 || time >= endVal + 0.02) return null;
                    return (
                      <div
                        key={ae.id}
                        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                        style={{
                          backgroundImage: ae.overlay,
                          mixBlendMode:
                            (ae.overlayBlend as React.CSSProperties["mixBlendMode"]) ?? "soft-light",
                          opacity: Math.min(0.55, ae.intensity / 100),
                        }}
                      />
                    );
                  })}
                </div>
              </div>
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
              {/* Live preset chip — hovered library preset wins over the applied one */}
              {(() => {
                const hoveredItem = hoveredEffectId ? findAssetItem(hoveredEffectId) : null;
                const label = hoveredItem?.name ?? mergedEffects.presetLabel;
                if (!label) return null;
                return (
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md border bg-black/60 px-2 py-1 backdrop-blur transition-colors duration-200",
                      hoveredItem ? "border-cyan-400/50" : "border-violet-400/40"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 animate-pulse rounded-full shadow-[0_0_6px]",
                        hoveredItem ? "bg-cyan-300 shadow-cyan-300/80" : "bg-violet-400 shadow-violet-400/80"
                      )}
                    />
                    <span
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-widest",
                        hoveredItem ? "text-cyan-100" : "text-violet-100"
                      )}
                    >
                      {hoveredItem ? "PREVIEW" : "FX"} · {label}
                    </span>
                  </div>
                );
              })()}

              {active.clip.appliedEffects?.some((effect) => effect.processingState === "queued" || effect.processingState === "analyzing") && (() => {
                const processing = active.clip.appliedEffects?.find((effect) => effect.processingState === "queued" || effect.processingState === "analyzing");
                if (!processing) return null;
                return (
                  <div className="pointer-events-none absolute bottom-3 right-3 w-[min(280px,52%)] rounded-md border border-cyan-400/35 bg-black/75 px-3 py-2 backdrop-blur">
                    <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-cyan-100">
                      <span>Local AI analysis</span><span>{processing.processingProgress ?? 0}%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-400 transition-[width] duration-150" style={{ width: `${processing.processingProgress ?? 0}%` }} /></div>
                    <div className="mt-1 truncate text-[9px] text-zinc-400">{processing.processingMessage}</div>
                  </div>
                );
              })()}
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
