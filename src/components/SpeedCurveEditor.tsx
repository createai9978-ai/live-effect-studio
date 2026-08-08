import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import Tooltip from "./Tooltip";

export type RampPoint = { t: number; s: number }; // t: 0..1 position, s: speed multiplier

const MIN_S = 0.1;
const MAX_S = 4;

const PRESETS: { id: string; label: string; hint: string; points: RampPoint[] }[] = [
  { id: "linear", label: "Linear", hint: "Constant speed, no ramp", points: [{ t: 0, s: 1 }, { t: 1, s: 1 }] },
  { id: "bullet", label: "Bullet Time", hint: "Fast in, extreme slow-mo, fast out", points: [{ t: 0, s: 2.4 }, { t: 0.38, s: 0.2 }, { t: 0.62, s: 0.2 }, { t: 1, s: 2.4 }] },
  { id: "beatdrop", label: "Beat Drop", hint: "Slow build then punch on the drop", points: [{ t: 0, s: 0.4 }, { t: 0.55, s: 0.6 }, { t: 0.62, s: 3.2 }, { t: 1, s: 1.6 }] },
  { id: "whip", label: "Whip Ramp", hint: "Blur-fast transition through the middle", points: [{ t: 0, s: 1 }, { t: 0.45, s: 3.6 }, { t: 0.55, s: 3.6 }, { t: 1, s: 1 }] },
  { id: "easein", label: "Ease In", hint: "Glide up from slow-mo to real time", points: [{ t: 0, s: 0.35 }, { t: 0.5, s: 0.7 }, { t: 1, s: 1 }] },
  { id: "easeout", label: "Ease Out", hint: "Settle from real time into slow-mo", points: [{ t: 0, s: 1 }, { t: 0.5, s: 0.7 }, { t: 1, s: 0.3 }] },
  { id: "freeze", label: "Freeze Hold", hint: "Near-still hold, then release", points: [{ t: 0, s: 1.2 }, { t: 0.35, s: 0.12 }, { t: 0.7, s: 0.12 }, { t: 1, s: 1.8 }] },
  { id: "montage", label: "Montage Pulse", hint: "Repeating fast/slow pulses", points: [{ t: 0, s: 2 }, { t: 0.25, s: 0.5 }, { t: 0.5, s: 2 }, { t: 0.75, s: 0.5 }, { t: 1, s: 2 }] },
];

const W = 100; // viewBox units
const H = 100;

const xOf = (t: number) => t * W;
const yOf = (s: number) => H - ((Math.log(s) - Math.log(MIN_S)) / (Math.log(MAX_S) - Math.log(MIN_S))) * H;
const sOf = (y: number) =>
  Math.exp(Math.log(MIN_S) + ((H - y) / H) * (Math.log(MAX_S) - Math.log(MIN_S)));

/** Smooth Catmull-Rom → cubic bezier path through the points. */
function curvePath(pts: RampPoint[]) {
  const p = pts.map((q) => ({ x: xOf(q.t), y: yOf(q.s) }));
  if (p.length < 2) return "";
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function SpeedCurveEditor({
  clipName,
  clipDuration,
  onApply,
  onClose,
}: {
  clipName: string | null;
  clipDuration: number;
  onApply: (avgSpeedPercent: number, points: RampPoint[]) => void;
  onClose: () => void;
}) {
  const [points, setPoints] = useState<RampPoint[]>(PRESETS[1].points);
  const [presetId, setPresetId] = useState("bullet");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const avgSpeed = useMemo(() => {
    // time-weighted harmonic mean → real playback duration
    let dur = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dt = points[i + 1].t - points[i].t;
      const s = (points[i].s + points[i + 1].s) / 2;
      dur += dt / s;
    }
    return dur > 0 ? 1 / dur : 1;
  }, [points]);

  const newDur = clipDuration > 0 ? clipDuration / avgSpeed : 0;

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(W, ((clientX - r.left) / r.width) * W)),
      y: Math.max(0, Math.min(H, ((clientY - r.top) / r.height) * H)),
    };
  }, []);

  const startDrag = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragIdx(i);
    setPresetId("custom");
    const move = (ev: PointerEvent) => {
      const { x, y } = toLocal(ev.clientX, ev.clientY);
      setPoints((prev) => {
        const next = prev.map((p) => ({ ...p }));
        const lo = i === 0 ? 0 : next[i - 1].t + 0.04;
        const hi = i === next.length - 1 ? 1 : next[i + 1].t - 0.04;
        next[i].t = i === 0 ? 0 : i === next.length - 1 ? 1 : Math.max(lo, Math.min(hi, x / W));
        next[i].s = Math.round(sOf(y) * 100) / 100;
        return next;
      });
    };
    const up = () => {
      setDragIdx(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addPoint = (e: React.MouseEvent) => {
    if (dragIdx !== null) return;
    const { x, y } = toLocal(e.clientX, e.clientY);
    const t = x / W;
    const s = Math.round(sOf(y) * 100) / 100;
    setPoints((prev) => {
      const next = [...prev, { t, s }].sort((a, b) => a.t - b.t);
      return next;
    });
    setPresetId("custom");
  };

  const removePoint = (i: number) => {
    if (i === 0 || i === points.length - 1 || points.length <= 2) return;
    setPoints((prev) => prev.filter((_, k) => k !== i));
    setPresetId("custom");
  };

  const path = curvePath(points);

  return (
    <div className="flex h-full w-[330px] shrink-0 flex-col border-l border-white/[0.06] bg-[#12131b] animate-[nova-panel_.28s_cubic-bezier(.22,1,.36,1)]">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 shadow-[0_0_6px] shadow-fuchsia-500/70" />
        <span className="text-[11px] font-semibold tracking-wide text-zinc-200">Speed Ramping</span>
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-zinc-500">
          Curve Editor
        </span>
        <Tooltip label="Close curve editor" side="left">
          <button
            onClick={onClose}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.07] hover:text-zinc-200 active:scale-95"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-lg bg-black/30 px-2.5 py-1.5 text-[10px] text-zinc-500">
          Target ·{" "}
          <span className="text-zinc-200">{clipName ?? "No clip selected"}</span>
        </div>

        {/* curve canvas */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-black/50 to-black/20 p-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            onDoubleClick={addPoint}
            className="h-[150px] w-full cursor-crosshair touch-none select-none"
          >
            <defs>
              <linearGradient id="rampFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(217 70 239)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="rampLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(167 139 250)" />
                <stop offset="100%" stopColor="rgb(232 121 249)" />
              </linearGradient>
            </defs>

            {/* grid */}
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={`v${g}`} x1={g * W} y1={0} x2={g * W} y2={H} stroke="rgba(255,255,255,.05)" strokeWidth={0.4} />
            ))}
            {[0.25, 1, 2].map((s) => (
              <g key={`h${s}`}>
                <line x1={0} y1={yOf(s)} x2={W} y2={yOf(s)} stroke={s === 1 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.05)"} strokeWidth={0.4} strokeDasharray={s === 1 ? "2 2" : undefined} />
                <text x={1} y={yOf(s) - 1.5} fill="rgba(255,255,255,.28)" fontSize={4}>{s}×</text>
              </g>
            ))}

            <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#rampFill)" />
            <path d={path} fill="none" stroke="url(#rampLine)" strokeWidth={1.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={xOf(p.t)}
                  cy={yOf(p.s)}
                  r={dragIdx === i || hoverIdx === i ? 3.4 : 2.4}
                  fill={dragIdx === i ? "rgb(232 121 249)" : "#10141F"}
                  stroke="rgb(216 180 254)"
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-grab transition-[r] duration-150 active:cursor-grabbing"
                  onPointerDown={startDrag(i)}
                  onPointerEnter={() => setHoverIdx(i)}
                  onPointerLeave={() => setHoverIdx(null)}
                  onDoubleClick={(e) => { e.stopPropagation(); removePoint(i); }}
                />
              </g>
            ))}
          </svg>
          <div className="mt-1 flex items-center justify-between px-1 text-[8.5px] text-zinc-600">
            <span>Drag points · double-click canvas to add · double-click point to remove</span>
            {hoverIdx !== null && (
              <span className="font-mono text-fuchsia-300">
                {(points[hoverIdx].t * 100).toFixed(0)}% · {points[hoverIdx].s.toFixed(2)}×
              </span>
            )}
          </div>
        </div>

        {/* presets */}
        <div>
          <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Ramp Presets</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <Tooltip key={p.id} label={p.label} hint={p.hint} side="top">
                <button
                  onClick={() => { setPoints(p.points.map((q) => ({ ...q }))); setPresetId(p.id); }}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-left text-[10.5px] transition-all duration-200 active:scale-[.97]",
                    presetId === p.id
                      ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_14px_-4px] shadow-fuchsia-500/60"
                      : "border-white/[0.06] bg-black/25 text-zinc-400 hover:border-violet-400/40 hover:text-zinc-100"
                  )}
                >
                  {p.label}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* readout */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ["Avg speed", `${(avgSpeed * 100).toFixed(0)}%`],
            ["Keys", `${points.length}`],
            ["New length", clipDuration > 0 ? `${newDur.toFixed(2)}s` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-black/30 px-2 py-1.5">
              <div className="text-[8.5px] uppercase tracking-wider text-zinc-600">{k}</div>
              <div className="font-mono text-[11px] text-zinc-200">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-white/[0.06] p-2.5">
        <button
          onClick={() => { setPoints(PRESETS[0].points.map((q) => ({ ...q }))); setPresetId("linear"); }}
          className="rounded-md border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.05] active:scale-[.97]"
        >
          Reset
        </button>
        <button
          disabled={!clipName}
          onClick={() => onApply(Math.round(avgSpeed * 100), points)}
          className="flex-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110 active:scale-[.98] disabled:opacity-40"
        >
          Apply Ramp
        </button>
      </div>
    </div>
  );
}
