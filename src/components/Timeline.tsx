import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Asset,
  Clip,
  AppliedEffect,
  Tool,
  TrackId,
  TrackState,
  fmtDuration,
  niceStep,
  toTimecode,
  waveformBars,
} from "../editor/types";
import { playhead, rafThrottle, usePlayheadValue } from "../editor/playhead";
import { EFFECT_DRAG_MIME } from "../editor/assetLibrary";
import { cn } from "../utils/cn";
import Tooltip from "./Tooltip";



const HEAD_W = 148;

type Props = {
  assets: Asset[];
  clips: Clip[];
  videoTracks: TrackId[];
  audioTracks: TrackId[];
  /** The live playhead is read from the clock store, not from props. */
  seqDur: number;
  contentEnd: number;
  tool: Tool;
  zoom: number;
  trackStates: Record<TrackId, TrackState>;
  onUpdateTrackState: (track: TrackId, patch: Partial<TrackState>) => void;
  onSetZoom: (fn: (z: number) => number) => void;
  onSetTool: (t: Tool) => void;
  selected: string[];
  onSelectClip: (id: string | null, forward?: boolean) => void;
  onSeek: (t: number) => void;
  onDropAsset: (assetId: string, track: TrackId, t: number, offset?: number, duration?: number) => void;
  onMoveClips: (ids: string[], anchorId: string, newAnchorStart: number, newAnchorTrack?: TrackId) => void;
  onRippleTrim: (clipId: string, newDuration: number) => void;
  onSlipClip: (clipId: string, newOffset: number) => void;
  onSlideClip: (clipId: string, deltaSec: number) => void;
  onSplitClip: (clipId: string, t: number) => void;
  onAddKeyframe: (clipId: string, rel: number) => void;
  onDeleteSelected: () => void;
  onApplyEffectPreset: (effectId: string, targetClipId: string) => void;
  onUpdateAppliedEffect?: (clipId: string, effectId: string, patch: Partial<AppliedEffect>) => void;
  selectedEffect?: { clipId: string; effectId: string } | null;
  onSelectEffect?: (clipId: string | null, effectId: string | null) => void;
  onDeleteAppliedEffect?: (clipId: string, effectId: string) => void;
  rampOpen?: boolean;
  onToggleRamp?: () => void;
};


/* ---------------- tool definitions ---------------- */
const TOOLS: { id: Tool; key: string; label: string; icon: string }[] = [
  { id: "select", key: "V", label: "Selection", icon: "M3 3l7 18 2.5-7.5L20 11 3 3z" },
  { id: "trackfwd", key: "A", label: "Track Select Forward", icon: "M3 5l8 7-8 7V5zM13 5l8 7-8 7V5z" },
  { id: "ripple", key: "B", label: "Ripple Edit — drag clip edge; downstream clips shift", icon: "M4 4v16M9 4v16M9 12h11M16 8l4 4-4 4" },
  { id: "razor", key: "C", label: "Razor / Blade — click to cut", icon: "M20 4L9 15M9 15a3 3 0 11-4 4 3 3 0 014-4zM15 15l5 5" },
  { id: "slip", key: "Y", label: "Slip — shift source in/out inside clip", icon: "M8 7l-5 5 5 5M16 7l5 5-5 5M12 4v16" },
  { id: "slide", key: "U", label: "Slide — move clip; neighbours absorb the delta", icon: "M4 12h16M8 7l-5 5 5 5M16 17l5-5-5-5" },
  { id: "pen", key: "P", label: "Pen — add keyframes", icon: "M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" },
  { id: "hand", key: "H", label: "Hand — pan timeline", icon: "M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 10.5V6a2 2 0 00-4 0v8M18 8a2 2 0 014 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L3.4 16.8c-.8-1.1-.6-2.6.5-3.4 1-.7 2.4-.5 3.1.5L8 15" },
  { id: "zoom", key: "Z", label: "Zoom — click in, Alt-click out", icon: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.35-4.35M11 8v6M8 11h6" },
];

const CURSOR: Record<Tool, string> = {
  select: "cursor-default",
  trackfwd: "cursor-e-resize",
  ripple: "cursor-col-resize",
  razor: "cursor-crosshair",
  slip: "cursor-ew-resize",
  slide: "cursor-ew-resize",
  pen: "cursor-copy",
  hand: "cursor-grab",
  zoom: "cursor-zoom-in",
};

function Timeline(props: Props) {
  const {
    clips, videoTracks, audioTracks, seqDur, contentEnd, tool, zoom,
    onSetZoom, onSetTool, selected, onSeek, onDeleteSelected, onSelectClip, onUpdateAppliedEffect,
    selectedEffect, onSelectEffect, onDeleteAppliedEffect, onApplyEffectPreset,
    rampOpen, onToggleRamp,

  } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [razorHoverX, setRazorHoverX] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const step = niceStep(seqDur / zoom);

  const tickCount = Math.floor(seqDur / step) + 1;

  /**
   * IMPORTANT: measure client → time relative to the LANE area only.
   * The scrollable inner container starts with a HEAD_W-wide track-head spacer,
   * so we must subtract HEAD_W from both offset and width. Without this, every
   * timeFromClientX call was shifted right by ~148px, causing the razor to
   * silently reject cuts (rel > duration - 0.1) and drops to land off-target.
   */
  const laneMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return { left: 0, width: 1 };
    const inner = el.firstElementChild as HTMLElement;
    const r = inner.getBoundingClientRect();
    return { left: r.left + HEAD_W, width: Math.max(1, r.width - HEAD_W) };
  }, []);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const { left, width } = laneMetrics();
      return Math.min(seqDur, Math.max(0, ((clientX - left) / width) * seqDur));
    },
    [laneMetrics, seqDur]
  );

  const pxPerSec = useCallback(() => laneMetrics().width / seqDur, [laneMetrics, seqDur]);

  /**
   * Pointer-based scrubbing. Used by BOTH the ruler and the playhead needle so
   * the cyan line can be grabbed and dragged anywhere across the sequence
   * without losing the pointer (pointer capture keeps events flowing even when
   * the cursor leaves the element or crosses the video tracks).
   *
   * Geometry is measured once at gesture start and pointer moves are coalesced
   * to one seek per animation frame, so dragging stays glued to the cursor
   * instead of thrashing layout on every event.
   */
  const beginScrub = useCallback(
    (e: React.PointerEvent, seekImmediately = true) => {
      e.preventDefault();
      e.stopPropagation();
      const { left, width } = laneMetrics();
      const at = (clientX: number) =>
        Math.min(seqDur, Math.max(0, ((clientX - left) / width) * seqDur));

      if (seekImmediately) onSeek(at(e.clientX));
      setScrubbing(true);
      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture unsupported — window listeners below still work */
      }
      const move = rafThrottle((clientX: number) => onSeek(at(clientX)));
      const onMove = (ev: PointerEvent) => move(ev.clientX);
      const up = () => {
        move.flush();
        setScrubbing(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [laneMetrics, onSeek, seqDur]
  );

  // Razor guide follows the pointer through a ref-driven rAF write, so moving
  // the mouse across the lanes never re-renders the whole timeline.
  const setRazorHover = useMemo(
    () => rafThrottle((x: number | null) => setRazorHoverX(x)),
    []
  );
  useEffect(() => () => setRazorHover.cancel(), [setRazorHover]);



  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* ============ TOOL RAIL ============ */}
      <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.06] bg-white/[0.02] px-2 py-1.5">

        {TOOLS.map((t) => (
          <Tooltip key={t.id} label={t.label.split(" — ")[0]} hint={`Shortcut ${t.key}${t.label.includes(" — ") ? ` · ${t.label.split(" — ")[1]}` : ""}`} side="bottom">
            <button
              type="button"
              aria-label={t.label}
              aria-pressed={tool === t.id}
              onClick={() => onSetTool(t.id)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-105 active:scale-95",
                tool === t.id
                  ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/40 ring-1 ring-white/20"
                  : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100"
              )}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
            </button>
          </Tooltip>
        ))}
        <Tooltip label="Speed Ramping & Curve Editor" hint="Draw velocity curves, bullet time, beat-drop ramps" side="bottom">
          <button
            type="button"
            aria-pressed={!!rampOpen}
            onClick={onToggleRamp}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-105 active:scale-95",
              rampOpen
                ? "bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white shadow-lg shadow-fuchsia-600/40 ring-1 ring-white/20"
                : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100"
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18C7 18 8 6 12 6s5 12 9 12" />
              <circle cx="12" cy="6" r="1.6" />
            </svg>
          </button>
        </Tooltip>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title="Zoom in (+)"
            onClick={() => onSetZoom((z) => Math.min(12, z * 1.4))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.07] hover:text-zinc-200 active:scale-95"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button
            type="button"
            title="Zoom out (-)"
            onClick={() => onSetZoom((z) => Math.max(1, z / 1.4))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.07] hover:text-zinc-200 active:scale-95"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* ============ TIMELINE ============ */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#131824]">
        {/* Header bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] px-3 py-1">
          <LiveTimecode />
          <span className="text-[10px] text-zinc-500">Main_Sequence</span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8.5px] text-zinc-500">
            {clips.length} clip{clips.length === 1 ? "" : "s"}
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8.5px] text-zinc-500">
            {zoom.toFixed(1)}×
          </span>
          <span
            className="flex items-center gap-1 rounded bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 px-2 py-0.5 text-[9px] font-medium text-violet-200 ring-1 ring-violet-400/30"
            title={TOOLS.find((t) => t.id === tool)?.label ?? tool}
          >
            <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_4px] shadow-violet-400" />
            {TOOLS.find((t) => t.id === tool)?.label ?? tool}
            <span className="rounded bg-black/40 px-1 font-mono text-[8px] text-zinc-400">
              {TOOLS.find((t) => t.id === tool)?.key}
            </span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            {selected.length > 0 && (
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1 rounded-md border border-fuchsia-500/40 px-1.5 py-0.5 text-[9px] text-fuchsia-300 transition hover:bg-fuchsia-500/10"
              >
                Delete {selected.length > 1 ? `${selected.length} clips` : "clip"} (Del)
              </button>
            )}
            <span className="font-mono text-[9px] text-zinc-500">
              Out <span className="text-zinc-300">{contentEnd > 0 ? toTimecode(contentEnd) : "--:--:--:--"}</span>
            </span>
          </div>
        </div>

        {/* Scrollable ruler + lanes */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full flex-col" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
            {/* Ruler */}
            <div className="flex h-6 shrink-0">
              <div className="shrink-0 border-b border-r border-white/[0.05] bg-[#171C29]" style={{ width: HEAD_W }} />
              <div
                className="relative flex-1 cursor-col-resize touch-none select-none border-b border-white/[0.05] bg-[#0e0f15]"
                onPointerDown={(e) => beginScrub(e)}
              >

                {Array.from({ length: tickCount }).map((_, i) => {
                  const sec = i * step;
                  const left = ((sec / seqDur) * 100 * seqDur) / seqDur; // simple
                  const leftPct = ((sec / seqDur) * 100);
                  return (
                    <div key={i} className="absolute top-0 h-full" style={{ left: `${leftPct}%` }}>
                      <div className="h-full w-px bg-white/[0.1]" />
                      <span className="absolute left-1 top-0.5 font-mono text-[8px] text-zinc-500">
                        {String(Math.floor(sec / 60)).padStart(2, "0")}:{String(Math.floor(sec % 60)).padStart(2, "0")}
                      </span>
                      <span className="hidden">{left}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lanes */}
            <div
              className="relative flex min-h-0 flex-1 flex-col"
              onMouseMove={(e) => {
                if (tool === "razor") setRazorHoverX(e.clientX);
              }}
              onMouseLeave={() => setRazorHoverX(null)}
            >
              {videoTracks.map((t) => {
                const trackHasFx = clips.some(
                  (c) => c.track === t && (c.appliedEffects?.length ?? 0) > 0
                );
                return (
                  <Fragment key={t}>
                    <TrackLane
                      track={t}
                      kind="video"
                      {...props}
                      timeFromClientX={timeFromClientX}
                      pxPerSec={pxPerSec}
                      scrollRef={scrollRef}
                    />
                    {trackHasFx && (
                      <EffectsSubTrack
                        track={t}
                        clips={clips}
                        seqDur={seqDur}
                        onSelectClip={onSelectClip}
                        selected={selected}
                        onUpdateAppliedEffect={onUpdateAppliedEffect}
                        selectedEffect={selectedEffect ?? null}
                        onSelectEffect={onSelectEffect}
                        onDeleteAppliedEffect={onDeleteAppliedEffect}
                        onApplyEffectPreset={onApplyEffectPreset}
                      />
                    )}
                  </Fragment>
                );
              })}
              <div className="flex h-1 shrink-0">
                <div className="shrink-0 bg-[#171C29]" style={{ width: HEAD_W }} />
                <div className="flex-1 bg-black/40" />
              </div>
              {audioTracks.map((t) => (
                <TrackLane
                  key={t}
                  track={t}
                  kind="audio"
                  {...props}
                  timeFromClientX={timeFromClientX}
                  pxPerSec={pxPerSec}
                  scrollRef={scrollRef}
                />
              ))}

              {/* Playhead — offset by HEAD_W, sits above every video/audio lane */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-[60]"
                style={{
                  left: `calc(${HEAD_W}px + (100% - ${HEAD_W}px) * ${Math.min(100, (time / seqDur) * 100) / 100})`,
                  willChange: "left",
                  transition: scrubbing ? "none" : "left 90ms linear",
                }}
              >
                <div
                  className={cn(
                    "h-full w-px bg-cyan-300",
                    scrubbing ? "shadow-[0_0_14px] shadow-cyan-300" : "shadow-[0_0_8px] shadow-cyan-400/70"
                  )}
                />
                {/* Wide invisible grab strip so the thin line is easy to catch */}
                <div
                  role="slider"
                  aria-label="Timeline playhead"
                  aria-valuemin={0}
                  aria-valuemax={seqDur}
                  aria-valuenow={time}
                  tabIndex={0}
                  onPointerDown={(e) => beginScrub(e, false)}
                  onKeyDown={(e) => {
                    const nudge = e.shiftKey ? 1 : 1 / 30;
                    if (e.key === "ArrowLeft") { e.preventDefault(); onSeek(Math.max(0, time - nudge)); }
                    if (e.key === "ArrowRight") { e.preventDefault(); onSeek(Math.min(seqDur, time + nudge)); }
                  }}
                  className="pointer-events-auto absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-ew-resize touch-none outline-none"
                />
                <div
                  onPointerDown={(e) => beginScrub(e, false)}
                  className={cn(
                    "pointer-events-auto absolute -top-6 left-1/2 flex h-6 w-4 -translate-x-1/2 cursor-ew-resize touch-none items-end justify-center rounded-b-[3px] bg-gradient-to-b from-cyan-200 to-cyan-500 shadow-[0_2px_10px] shadow-cyan-500/50 transition-transform duration-150 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-110",
                    scrubbing && "scale-110"
                  )}
                >
                  <span className="mb-0.5 h-2 w-px bg-cyan-900/60" />
                </div>
              </div>


              {/* Razor blade indicator — follows the mouse while razor tool is active */}
              {tool === "razor" && razorHoverX !== null && (() => {
                const { left, width } = laneMetrics();
                const t = Math.min(seqDur, Math.max(0, ((razorHoverX - left) / width) * seqDur));
                return (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-30"
                    style={{ left: `calc(${HEAD_W}px + (100% - ${HEAD_W}px) * ${(t / seqDur)})` }}
                  >
                    <div className="h-full w-px border-l border-dashed border-fuchsia-400" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-md bg-fuchsia-500 px-1 py-px font-mono text-[8px] text-white shadow-lg shadow-fuchsia-500/40">
                      ✂ cut
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- track head with M/S/Lock/Target ---------------- */
function TrackHead({
  track,
  kind,
  state,
  onUpdate,
  clipCount,
}: {
  track: TrackId;
  kind: "video" | "audio";
  state: TrackState;
  onUpdate: (patch: Partial<TrackState>) => void;
  clipCount: number;
}) {
  const anySolo = state.solo;
  return (
    <div
      className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-b border-r border-white/[0.05] bg-[#171C29] px-1.5"
      style={{ width: HEAD_W }}
    >
      {/* Track Targeting box (source-patching) */}
      <button
        onClick={() => onUpdate({ targeted: !state.targeted })}
        title={`Track targeting — ${state.targeted ? "ON" : "OFF"} (routes source patches here)`}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[8.5px] font-bold transition",
          state.targeted
            ? kind === "video"
              ? "border-violet-400/60 bg-violet-500/25 text-violet-200"
              : "border-emerald-400/60 bg-emerald-500/25 text-emerald-200"
            : "border-white/10 bg-black/30 text-zinc-600 hover:text-zinc-300"
        )}
      >
        {kind === "video" ? "V" : "A"}
      </button>

      {/* Track label */}
      <span
        className={cn(
          "w-6 shrink-0 text-[10px] font-bold",
          kind === "video" ? "text-violet-300" : "text-emerald-300"
        )}
      >
        {track}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {/* Toggle Track Output (video) / Mute (audio) */}
        <button
          onClick={() => onUpdate({ muted: !state.muted })}
          title={kind === "video" ? "Toggle Track Output" : "Mute (M)"}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded text-[7.5px] font-bold transition",
            state.muted
              ? "bg-fuchsia-500/80 text-white"
              : "bg-white/[0.07] text-zinc-500 hover:text-zinc-100"
          )}
        >
          M
        </button>
        {/* Solo */}
        <button
          onClick={() => onUpdate({ solo: !state.solo })}
          title="Solo (S)"
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded text-[7.5px] font-bold transition",
            anySolo
              ? "bg-amber-400/90 text-black"
              : "bg-white/[0.07] text-zinc-500 hover:text-zinc-100"
          )}
        >
          S
        </button>
        {/* Lock */}
        <button
          onClick={() => onUpdate({ locked: !state.locked })}
          title={`${state.locked ? "Unlock" : "Lock"} track`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded transition",
            state.locked
              ? "bg-cyan-400/25 text-cyan-200"
              : "bg-white/[0.07] text-zinc-500 hover:text-zinc-100"
          )}
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            {state.locked ? (
              <>
                <rect x="4" y="11" width="16" height="9" rx="1.5" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </>
            ) : (
              <>
                <rect x="4" y="11" width="16" height="9" rx="1.5" />
                <path d="M8 11V7a4 4 0 017-2.6" />
              </>
            )}
          </svg>
        </button>
      </div>

      <span className="ml-1 shrink-0 font-mono text-[8px] text-zinc-700">{clipCount || ""}</span>
    </div>
  );
}

/* ---------------- track lane ---------------- */
function TrackLane(
  props: Props & {
    track: TrackId;
    kind: "video" | "audio";
    timeFromClientX: (x: number) => number;
    pxPerSec: () => number;
    scrollRef: React.RefObject<HTMLDivElement | null>;
  }
) {
  const {
    track, kind, assets, clips, tool, selected, onSelectClip,
    onDropAsset, onSplitClip, timeFromClientX, scrollRef, onSetZoom,
    trackStates, onUpdateTrackState,
  } = props;
  const [dragOver, setDragOver] = useState(false);
  const trackClips = clips.filter((c) => c.track === track);
  const state = trackStates[track];

  const handleLaneMouseDown = (e: React.MouseEvent) => {
    if (state.locked) return;

    // Hand tool → click-drag to pan the horizontal scroll
    if (tool === "hand") {
      const el = scrollRef.current;
      if (!el) return;
      const startX = e.clientX;
      const startScroll = el.scrollLeft;
      const move = (ev: MouseEvent) => (el.scrollLeft = startScroll - (ev.clientX - startX));
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return;
    }

    // Zoom tool → click zooms in, Alt-click zooms out
    if (tool === "zoom") {
      onSetZoom((z) => (e.altKey ? Math.max(1, z / 1.5) : Math.min(12, z * 1.5)));
      return;
    }

    // Razor on the lane → cut ANY clip on this track sitting under the click column
    if (tool === "razor") {
      const t = timeFromClientX(e.clientX);
      const hit = trackClips.find((c) => t > c.start + 0.05 && t < c.start + c.duration - 0.05);
      if (hit) onSplitClip(hit.id, t);
      return;
    }

    // Any other tool: click on empty lane clears selection
    onSelectClip(null);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <TrackHead
        track={track}
        kind={kind}
        state={state}
        onUpdate={(patch) => onUpdateTrackState(track, patch)}
        clipCount={trackClips.length}
      />

      {/* lane */}
      <div
        data-track={track}
        className={cn(
          "relative min-w-0 flex-1 border-b border-white/[0.04] transition-colors",
          kind === "video" ? "bg-[#0e0f15]" : "bg-[#0d1210]",
          state.locked && "opacity-60",
          state.muted && "opacity-70",
          CURSOR[tool],
          dragOver && "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/40",
          state.locked && dragOver && "!bg-fuchsia-500/[0.08] !ring-fuchsia-500/40"
        )}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-nova-asset")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = state.locked ? "none" : "copy";
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false);
          if (state.locked) return;
          const raw =
            e.dataTransfer.getData("application/x-nova-asset") || e.dataTransfer.getData("text/plain");
          if (!raw) return;
          e.preventDefault();
          let id = raw;
          let offset: number | undefined;
          let duration: number | undefined;
          try {
            const p = JSON.parse(raw);
            if (p && typeof p === "object" && p.assetId) {
              id = p.assetId;
              offset = p.offset;
              duration = p.duration;
            }
          } catch {
            /* plain asset id */
          }
          onDropAsset(id, track, timeFromClientX(e.clientX), offset, duration);
        }}
        onMouseDown={handleLaneMouseDown}
      >
        {/* locked overlay pattern */}
        {state.locked && (
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.05) 6px 12px)",
            }}
          />
        )}

        {trackClips.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center px-3">
            <span className={cn("text-[8.5px]", dragOver ? "text-violet-300" : "text-zinc-800")}>
              {state.locked ? "Locked" : dragOver ? "Release to add clip" : "Drop media here"}
            </span>
          </div>
        )}

        {trackClips.map((clip) => {
          const asset = assets.find((a) => a.id === clip.assetId);
          if (!asset) return null;
          return (
            <ClipBlock
              key={clip.id}
              {...props}
              clip={clip}
              asset={asset}
              kind={kind}
              trackLocked={state.locked}
              isSelected={selected.includes(clip.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- clip block ---------------- */
function ClipBlock(
  props: Props & {
    clip: Clip;
    asset: Asset;
    kind: "video" | "audio";
    trackLocked: boolean;
    isSelected: boolean;
    timeFromClientX: (x: number) => number;
    pxPerSec: () => number;
  }
) {
  const {
    clip, asset, kind, isSelected, seqDur, tool, trackLocked,
    onSelectClip, onMoveClips, onRippleTrim, onSlipClip, onSlideClip, onSplitClip,
    onAddKeyframe, onApplyEffectPreset, timeFromClientX, pxPerSec,
  } = props;
  const bars = waveformBars(clip.id, Math.max(16, Math.round(clip.duration * 2)));
  const [slipping, setSlipping] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [fxHover, setFxHover] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trackLocked) return;

    if (tool === "razor") {
      onSplitClip(clip.id, timeFromClientX(e.clientX));
      return;
    }
    if (tool === "pen") {
      const rel = timeFromClientX(e.clientX) - clip.start;
      onAddKeyframe(clip.id, Math.max(0, Math.min(clip.duration, rel)));
      onSelectClip(clip.id);
      return;
    }
    if (tool === "trackfwd") {
      onSelectClip(clip.id, true);
      const ids = props.clips
        .filter((c) => c.track === clip.track && c.start >= clip.start - 0.001)
        .map((c) => c.id);
      startDragMove(e, ids);
      return;
    }
    if (tool === "slip") {
      onSelectClip(clip.id);
      setSlipping(true);
      const startX = e.clientX;
      const origOffset = clip.offset;
      const pps = pxPerSec();
      const move = (ev: MouseEvent) => onSlipClip(clip.id, origOffset - (ev.clientX - startX) / pps);
      const up = () => {
        setSlipping(false);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return;
    }
    if (tool === "slide") {
      onSelectClip(clip.id);
      setSliding(true);
      const startX = e.clientX;
      const pps = pxPerSec();
      let lastDelta = 0;
      const move = (ev: MouseEvent) => {
        const total = (ev.clientX - startX) / pps;
        const step = total - lastDelta;
        if (Math.abs(step) > 0.001) {
          onSlideClip(clip.id, step);
          lastDelta = total;
        }
      };
      const up = () => {
        setSliding(false);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return;
    }
    if (tool === "select") {
      onSelectClip(clip.id);
      startDragMove(e, [clip.id]);
    }
  };

  const startDragMove = (e: React.MouseEvent, ids: string[]) => {
    const startX = e.clientX;
    const origStart = clip.start;
    const pps = pxPerSec();

    // Discover the target track by hit-testing the element under the pointer for a
    // data-track attribute (set on every TrackLane below).
    const trackAtPoint = (clientX: number, clientY: number): TrackId | undefined => {
      // Temporarily hide the dragged block so elementFromPoint returns the lane behind it.
      const els = document.elementsFromPoint(clientX, clientY);
      for (const el of els) {
        const t = (el as HTMLElement).dataset?.track as TrackId | undefined;
        if (t) return t;
      }
      return undefined;
    };

    const move = (ev: MouseEvent) => {
      const newStart = origStart + (ev.clientX - startX) / pps;
      const target = trackAtPoint(ev.clientX, ev.clientY);
      onMoveClips(ids, clip.id, newStart, target);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const handleRippleEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trackLocked) return;
    onSelectClip(clip.id);
    const startX = e.clientX;
    const origDur = clip.duration;
    const pps = pxPerSec();
    const move = (ev: MouseEvent) => onRippleTrim(clip.id, origDur + (ev.clientX - startX) / pps);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const fx = clip.effects;
  const hasFx =
    fx.posX !== 0 ||
    fx.posY !== 0 ||
    Math.abs(fx.scale - 100) > 0.1 ||
    fx.rotation !== 0 ||
    Math.abs(fx.opacity - 100) > 0.1 ||
    Math.abs(fx.speed - 100) > 0.1;

  // Chips that summarize which parameters differ from default
  const chips: { key: string; label: string }[] = [];
  if (Math.abs(fx.scale - 100) > 0.1) chips.push({ key: "s", label: `${Math.round(fx.scale)}%` });
  if (fx.rotation !== 0) chips.push({ key: "r", label: `${Math.round(fx.rotation)}°` });
  if (fx.posX !== 0 || fx.posY !== 0)
    chips.push({ key: "p", label: `${Math.round(fx.posX)},${Math.round(fx.posY)}` });
  if (Math.abs(fx.speed - 100) > 0.1)
    chips.push({ key: "v", label: `${(fx.speed / 100).toFixed(2)}×` });

  return (
    <div
      onMouseDown={handleMouseDown}
      onDragOver={(e) => {
        // Accept effect drops from the Asset Library
        if (e.dataTransfer.types.includes(EFFECT_DRAG_MIME)) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          setFxHover(true);
        }
      }}
      onDragLeave={() => setFxHover(false)}
      onDrop={(e) => {
        setFxHover(false);
        const effectId = e.dataTransfer.getData(EFFECT_DRAG_MIME);
        if (!effectId) return;
        e.preventDefault();
        e.stopPropagation();
        onApplyEffectPreset(effectId, clip.id);
      }}
      className={cn(
        "absolute top-0.5 bottom-0.5 overflow-hidden rounded-md border bg-gradient-to-b transition-colors",
        kind === "video" ? "from-violet-600/45 to-indigo-800/30" : "from-emerald-600/40 to-emerald-800/25",
        isSelected
          ? "z-10 border-cyan-300 ring-1 ring-cyan-300/60"
          : kind === "video"
          ? "border-white/20 hover:border-white/50"
          : "border-emerald-400/25 hover:border-emerald-300/60",
        slipping && "border-amber-300",
        sliding && "border-fuchsia-300 ring-1 ring-fuchsia-300/60",
        fxHover && "z-20 border-fuchsia-400 ring-2 ring-fuchsia-400/70 shadow-lg shadow-fuchsia-500/40",
        trackLocked && "pointer-events-none"
      )}
      style={{
        left: `${(clip.start / seqDur) * 100}%`,
        width: `${Math.max(0.3, (clip.duration / seqDur) * 100)}%`,
        // real-time opacity feedback: clip block dims as the Opacity slider drops
        opacity: 0.35 + (fx.opacity / 100) * 0.65,
      }}
      title={`${asset.name} · ${fmtDuration(clip.duration)}${hasFx ? " · fx applied" : ""}`}
    >
      {kind === "video" && asset.thumb && (
        <div
          className="absolute inset-0 opacity-40 transition-transform duration-100"
          style={{
            backgroundImage: `url(${asset.thumb})`,
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
            backgroundPositionX: `${-clip.offset * 8}px`,
            // let scale/rotation subtly warp the filmstrip so timeline "feels" the change
            transform: `scale(${Math.min(1.4, Math.max(0.7, fx.scale / 100))}) rotate(${
              Math.max(-8, Math.min(8, fx.rotation / 20))
            }deg)`,
            transformOrigin: "center center",
          }}
        />
      )}
      {kind === "audio" && (
        <div className="absolute inset-0 flex items-center gap-px px-1 pt-2.5">
          {bars.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-emerald-300"
              // audio "opacity" reads as level so the waveform gets shorter as it drops
              style={{ height: `${v * 70 * (fx.opacity / 100)}%`, opacity: 0.4 + 0.6 * (fx.opacity / 100) }}
            />
          ))}
        </div>
      )}

      {/* name strip */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-1 bg-black/45 px-1.5 py-px">
        {fx.presetLabel ? (
          <span
            className="rounded bg-gradient-to-r from-fuchsia-500 via-fuchsia-600 to-violet-600 px-1 py-px text-[7.5px] font-extrabold tracking-widest text-white shadow-[0_0_8px_rgba(217,70,239,0.7)]"
            title={`Active Effect applied: ${fx.presetLabel} · click to adjust`}
          >
            FX
          </span>
        ) : hasFx ? (
          <span
            className="rounded-sm bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 py-px text-[7px] font-bold text-white shadow shadow-fuchsia-500/40"
            title="Effects modified — click to open Effect Controls"
          >
            fx
          </span>
        ) : null}
        <span className={cn("block flex-1 truncate text-[8px] font-medium", kind === "video" ? "text-white/90" : "text-emerald-100/90")}>
          {asset.name}
        </span>
        {slipping && <span className="text-[8px] text-amber-300">in {clip.offset.toFixed(1)}s</span>}
        {sliding && <span className="text-[8px] text-fuchsia-300">↔</span>}
      </div>

      {/* Direct Timeline Multi-Effects Mapping: Visual row of independent, stackable adjustment badges */}
      {clip.appliedEffects && clip.appliedEffects.length > 0 && (
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
          {clip.appliedEffects.map((ae) => (
            <div
              key={ae.id}
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-[7px] font-bold transition-opacity shadow backdrop-blur-sm",
                ae.enabled
                  ? "bg-violet-500/90 text-white shadow-violet-500/20"
                  : "bg-zinc-800/80 text-zinc-500 opacity-60"
              )}
            >
              {/* Green active dot / grey bypassed dot */}
              <span className={cn("h-1 w-1 rounded-full", ae.enabled ? "bg-emerald-400" : "bg-zinc-600")} />
              {ae.name}
            </div>
          ))}
        </div>
      )}

      {/* live parameter chips row (bottom, only when selected + has fx) */}
      {isSelected && chips.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-0.5 bg-black/55 px-1 py-px">
          {chips.map((c) => (
            <span
              key={c.key}
              className="rounded bg-white/[0.09] px-1 py-px font-mono text-[7.5px] text-cyan-200"
            >
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* opacity band along the top edge — visual level meter of the Opacity slider */}
      {Math.abs(fx.opacity - 100) > 0.1 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
            style={{ width: `${fx.opacity}%` }}
          />
        </div>
      )}

      {/* keyframe rubber band */}
      {clip.keyframes.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-[55%] h-px bg-white/30">
          {clip.keyframes.map((k, i) => (
            <div
              key={i}
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-fuchsia-400 shadow-[0_0_4px] shadow-fuchsia-400/70"
              style={{ left: `${(k / clip.duration) * 100}%` }}
            />
          ))}
        </div>
      )}

       {/* ripple edit handle (right edge) */}
      <div
        onMouseDown={tool === "ripple" || tool === "select" ? handleRippleEdge : undefined}
        className={cn(
          "absolute right-0 top-0 h-full w-1.5 cursor-col-resize transition",
          tool === "ripple" ? "bg-fuchsia-400/60" : "bg-white/25 opacity-0 hover:opacity-100"
        )}
      />
    </div>
  );
}

/* ---------------- Per-track effects lane: "V1 - Effects" ---------------- */
interface EffectsSubTrackProps {
  track: TrackId;
  clips: Clip[];
  seqDur: number;
  onSelectClip: (id: string | null) => void;
  selected: string[];
  onUpdateAppliedEffect?: (clipId: string, effectId: string, patch: Partial<AppliedEffect>) => void;
  selectedEffect: { clipId: string; effectId: string } | null;
  onSelectEffect?: (clipId: string | null, effectId: string | null) => void;
  onDeleteAppliedEffect?: (clipId: string, effectId: string) => void;
  onApplyEffectPreset: (effectId: string, targetClipId: string) => void;
}

function EffectsSubTrack({
  track,
  clips,
  seqDur,
  onSelectClip,
  onUpdateAppliedEffect,
  selectedEffect,
  onSelectEffect,
  onDeleteAppliedEffect,
  onApplyEffectPreset,
}: EffectsSubTrackProps) {
  const trackClips = clips.filter((c) => c.track === track);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  return (
    <div className="flex h-9 shrink-0 border-b border-white/[0.04] bg-[#111621]/70">
      {/* Lane header */}
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-white/[0.05] bg-[#131824] px-2 text-[9.5px] font-bold text-fuchsia-300"
        style={{ width: HEAD_W }}
      >
        <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 tracking-wider ring-1 ring-fuchsia-500/30">
          {track} · Effects
        </span>
      </div>

      {/* Lane */}
      <div className="relative flex-1 bg-black/25">
        {trackClips.map((clip) => {
          const hasFx = (clip.appliedEffects?.length ?? 0) > 0;
          return (
            <div
              key={`fx-lane-${clip.id}`}
              className={cn(
                "absolute inset-y-0 rounded-sm transition",
                dropTarget === clip.id && "ring-2 ring-fuchsia-400/70",
                !hasFx && "border border-dashed border-white/[0.06]"
              )}
              style={{
                left: `${(clip.start / seqDur) * 100}%`,
                width: `${(clip.duration / seqDur) * 100}%`,
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(EFFECT_DRAG_MIME)) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "copy";
                  setDropTarget(clip.id);
                }
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => {
                setDropTarget(null);
                const effectId = e.dataTransfer.getData(EFFECT_DRAG_MIME);
                if (!effectId) return;
                e.preventDefault();
                e.stopPropagation();
                onApplyEffectPreset(effectId, clip.id);
              }}
              title={hasFx ? undefined : `Drop an effect here to attach it to ${clip.id}`}
            >
              {clip.appliedEffects?.map((ae) => {
                const isSelected =
                  selectedEffect?.clipId === clip.id && selectedEffect?.effectId === ae.id;

                const laneWidth = (el: HTMLElement | null) =>
                  (el?.parentElement?.getBoundingClientRect().width ?? 1) / clip.duration;

                const handleMouseDown = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  onSelectClip(clip.id);
                  onSelectEffect?.(clip.id, ae.id);

                  const startX = e.clientX;
                  const origOffset = ae.startOffset ?? 0;
                  const origDuration = ae.duration ?? clip.duration;
                  const pps = laneWidth(e.currentTarget as HTMLElement);

                  const move = (ev: MouseEvent) => {
                    const deltaSec = (ev.clientX - startX) / pps;
                    const maxOffset = clip.duration - origDuration;
                    const nextOffset = Math.max(0, Math.min(Math.max(0, maxOffset), origOffset + deltaSec));
                    onUpdateAppliedEffect?.(clip.id, ae.id, { startOffset: nextOffset });
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                };

                const handleTrimRight = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const startX = e.clientX;
                  const origDuration = ae.duration ?? clip.duration;
                  const maxDur = clip.duration - (ae.startOffset ?? 0);
                  const pps = laneWidth((e.currentTarget as HTMLElement).parentElement);
                  const move = (ev: MouseEvent) => {
                    const deltaSec = (ev.clientX - startX) / pps;
                    const nextDuration = Math.max(0.3, Math.min(maxDur, origDuration + deltaSec));
                    onUpdateAppliedEffect?.(clip.id, ae.id, { duration: nextDuration });
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                };

                const handleTrimLeft = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const startX = e.clientX;
                  const origOffset = ae.startOffset ?? 0;
                  const origDuration = ae.duration ?? clip.duration;
                  const pps = laneWidth((e.currentTarget as HTMLElement).parentElement);
                  const move = (ev: MouseEvent) => {
                    const deltaSec = (ev.clientX - startX) / pps;
                    const nextOffset = Math.max(0, Math.min(origOffset + origDuration - 0.3, origOffset + deltaSec));
                    const nextDuration = Math.max(0.3, origDuration - (nextOffset - origOffset));
                    onUpdateAppliedEffect?.(clip.id, ae.id, { startOffset: nextOffset, duration: nextDuration });
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                };

                const leftPct = ((ae.startOffset ?? 0) / clip.duration) * 100;
                const widthPct = ((ae.duration ?? clip.duration) / clip.duration) * 100;

                return (
                  <div
                    key={ae.id}
                    onMouseDown={handleMouseDown}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onSelectEffect?.(clip.id, ae.id);
                    }}
                    className={cn(
                      "group absolute top-0.5 bottom-0.5 flex cursor-grab items-center overflow-hidden rounded border px-1.5 shadow transition-all duration-150 active:cursor-grabbing",
                      ae.enabled
                        ? "border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-600/35 to-violet-700/25 text-white shadow-fuchsia-500/10"
                        : "border-zinc-700/30 bg-gradient-to-br from-zinc-800/50 to-zinc-900/30 text-zinc-400 opacity-60",
                      isSelected && "border-cyan-300 ring-2 ring-cyan-300/60"
                    )}
                    style={{ left: `${leftPct}%`, width: `${Math.max(4, widthPct)}%` }}
                    title={`${ae.name} — click to open Effect Controls · drag to move · drag edges to resize`}
                  >
                    <div
                      onMouseDown={handleTrimLeft}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/25 opacity-0 transition group-hover:opacity-100"
                      title="Trim left"
                    />

                    <div className="pointer-events-none flex min-w-0 flex-1 select-none items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1 w-1 shrink-0 rounded-full",
                          ae.enabled ? "bg-emerald-400 shadow-[0_0_4px_#34d399]" : "bg-zinc-600"
                        )}
                      />
                      <span className="truncate text-[8.5px] font-bold tracking-wide">{ae.name}</span>
                    </div>

                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateAppliedEffect?.(clip.id, ae.id, { enabled: !ae.enabled });
                      }}
                      className="relative z-10 mr-1 hidden shrink-0 rounded px-1 text-[7.5px] font-bold text-zinc-200 transition hover:bg-white/15 group-hover:block"
                      title={ae.enabled ? "Bypass effect" : "Enable effect"}
                    >
                      {ae.enabled ? "FX" : "OFF"}
                    </button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAppliedEffect?.(clip.id, ae.id);
                      }}
                      className="relative z-10 hidden shrink-0 rounded p-0.5 text-rose-200 transition hover:bg-rose-500/25 group-hover:block"
                      title="Delete effect"
                    >
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                      </svg>
                    </button>

                    <div
                      onMouseDown={handleTrimRight}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/25 opacity-0 transition group-hover:opacity-100"
                      title="Trim right"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
