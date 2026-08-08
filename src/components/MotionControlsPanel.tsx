import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { cubicBezier, cssEase, type EasingId } from "../editor/motionEngine";

/**
 * NOVA Studio — Motion Controls.
 *
 * A Premiere/Filmora-grade keyframe surface: Position X/Y, Scale, Rotation and
 * Opacity, each with its own keyframe lane, diamond indicators and an easing
 * preset assigned per property. Curves are rendered with the real cubic-bezier
 * solver from the motion engine so the graph matches what the renderer plays.
 */

export type MotionPropId = "posX" | "posY" | "scale" | "rotation" | "opacity";

type Keyframe = { id: string; t: number; value: number };

type PropDef = {
  id: MotionPropId;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  base: number;
  accent: string;
  icon: string;
};

const PROPS: PropDef[] = [
  { id: "posX", label: "Position X", unit: "px", min: -400, max: 400, step: 1, base: 0, accent: "#22d3ee", icon: "M4 12h16M14 6l6 6-6 6" },
  { id: "posY", label: "Position Y", unit: "px", min: -400, max: 400, step: 1, base: 0, accent: "#818cf8", icon: "M12 4v16M6 14l6 6 6-6" },
  { id: "scale", label: "Scale", unit: "%", min: 10, max: 400, step: 1, base: 100, accent: "#a78bfa", icon: "M4 9V4h5M20 15v5h-5M4 15v5h5M20 9V4h-5" },
  { id: "rotation", label: "Rotation", unit: "°", min: -360, max: 360, step: 1, base: 0, accent: "#f472b6", icon: "M21 12a9 9 0 11-3-6.7M21 3v5h-5" },
  { id: "opacity", label: "Opacity", unit: "%", min: 0, max: 100, step: 1, base: 100, accent: "#fbbf24", icon: "M12 3a9 9 0 000 18z M12 3a9 9 0 010 18" },
];

const EASINGS: { id: EasingId; label: string; short: string }[] = [
  { id: "driftEase", label: "Linear", short: "LIN" },
  { id: "filmicSlowIn", label: "Ease In", short: "IN" },
  { id: "easeOutExpo", label: "Ease Out", short: "OUT" },
  { id: "elasticSoft", label: "Elastic", short: "ELA" },
  { id: "easeOutBack", label: "Bounce", short: "BNC" },
];

const CURVE_POINTS: Record<EasingId, [number, number, number, number]> = {
  driftEase: [0, 0, 1, 1],
  filmicSlowIn: [0.33, 0, 0.12, 1],
  easeOutExpo: [0.16, 1, 0.3, 1],
  elasticSoft: [0.22, 1.4, 0.36, 1],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  cinematicEase: [0.65, 0.02, 0.15, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  anticipate: [0.68, -0.55, 0.27, 1.55],
  snapCut: [0.9, 0, 0.1, 1],
  whipEase: [0.95, 0.05, 0.05, 0.95],
};

type PropState = { enabled: boolean; value: number; easing: EasingId; keys: Keyframe[] };

const initialState = (): Record<MotionPropId, PropState> =>
  PROPS.reduce((acc, p) => {
    acc[p.id] = { enabled: false, value: p.base, easing: "filmicSlowIn", keys: [] };
    return acc;
  }, {} as Record<MotionPropId, PropState>);

export default function MotionControlsPanel({ shutter = 180 }: { shutter?: number }) {
  const [state, setState] = useState<Record<MotionPropId, PropState>>(initialState);
  const [active, setActive] = useState<MotionPropId>("scale");
  const [playhead, setPlayhead] = useState(0.35);
  const [blur, setBlur] = useState(Math.round(shutter));

  const patch = (id: MotionPropId, next: Partial<PropState>) =>
    setState((s) => ({ ...s, [id]: { ...s[id], ...next } }));

  const toggleKey = (id: MotionPropId) => {
    const p = state[id];
    const existing = p.keys.find((k) => Math.abs(k.t - playhead) < 0.02);
    if (existing) {
      patch(id, { keys: p.keys.filter((k) => k.id !== existing.id) });
    } else {
      patch(id, {
        enabled: true,
        keys: [...p.keys, { id: `${id}-${Date.now()}`, t: playhead, value: p.value }].sort((a, b) => a.t - b.t),
      });
    }
  };

  const activeDef = PROPS.find((p) => p.id === active)!;
  const activeState = state[active];

  const curvePath = useMemo(() => {
    const [x1, y1, x2, y2] = CURVE_POINTS[activeState.easing] ?? CURVE_POINTS.filmicSlowIn;
    const solve = cubicBezier(x1, y1, x2, y2);
    const pts: string[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const x = i / 48;
      const y = solve(x);
      pts.push(`${(6 + x * 188).toFixed(2)},${(74 - y * 62).toFixed(2)}`);
    }
    return `M ${pts.join(" L ")}`;
  }, [activeState.easing]);

  const previewStyle = {
    transform: `translate(${state.posX.value * 0.12}px, ${state.posY.value * 0.12}px) scale(${state.scale.value / 100}) rotate(${state.rotation.value}deg)`,
    opacity: state.opacity.value / 100,
    transitionTimingFunction: cssEase(activeState.easing),
    filter: `blur(${(blur / 360) * 1.6}px)`,
  } as const;

  return (
    <div className="space-y-3.5 p-4">
      {/* Motion viewport */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[radial-gradient(120%_120%_at_50%_0%,rgba(139,92,246,0.14),transparent_65%)] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Motion Controls</span>
          <button
            onClick={() => setState(initialState())}
            className="rounded-md border border-white/[0.08] px-2 py-0.5 text-[9.5px] text-zinc-400 transition hover:border-fuchsia-400/40 hover:text-fuchsia-200"
          >
            Reset all
          </button>
        </div>
        <div className="mt-3 flex h-[86px] items-center justify-center rounded-lg bg-black/45 ring-1 ring-white/[0.05]">
          <div
            className="h-12 w-20 rounded-md bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-[0_10px_30px_-8px_rgba(139,92,246,0.8)] transition-all duration-500"
            style={previewStyle}
          />
        </div>
      </div>

      {/* Property rows with keyframe lanes */}
      <div className="space-y-2">
        {PROPS.map((p) => {
          const st = state[p.id];
          const isActive = active === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setActive(p.id)}
              className={cn(
                "cursor-pointer rounded-xl border p-2.5 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                isActive
                  ? "border-white/[0.14] bg-white/[0.045] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.9)]"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.11] hover:bg-white/[0.03]"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                  style={{ background: `${p.accent}22`, color: p.accent }}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={p.icon} />
                  </svg>
                </span>
                <span className="flex-1 truncate text-[11px] font-medium text-zinc-200">{p.label}</span>
                <span className="font-mono text-[10.5px] text-zinc-100">
                  {Math.round(st.value)}
                  {p.unit}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleKey(p.id);
                  }}
                  title="Toggle keyframe at playhead"
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md transition-all duration-200 hover:scale-110",
                    st.keys.some((k) => Math.abs(k.t - playhead) < 0.02)
                      ? "bg-white/[0.12]"
                      : "bg-white/[0.04] hover:bg-white/[0.09]"
                  )}
                >
                  <span
                    className="block h-2 w-2 rotate-45 rounded-[1px]"
                    style={{
                      background: st.keys.some((k) => Math.abs(k.t - playhead) < 0.02) ? p.accent : "transparent",
                      boxShadow: st.keys.some((k) => Math.abs(k.t - playhead) < 0.02) ? `0 0 8px ${p.accent}` : "none",
                      border: `1px solid ${p.accent}`,
                    }}
                  />
                </button>
              </div>

              {/* Glowing slider */}
              <div className="relative mt-2 h-4">
                <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/[0.07]" />
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full transition-[width] duration-100"
                  style={{
                    width: `${((st.value - p.min) / (p.max - p.min)) * 100}%`,
                    background: `linear-gradient(90deg, ${p.accent}55, ${p.accent})`,
                    boxShadow: `0 0 12px ${p.accent}66`,
                  }}
                />
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={st.value}
                  onChange={(e) => patch(p.id, { value: Number(e.target.value), enabled: true })}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent"
                />
              </div>

              {/* Keyframe lane */}
              <div className="relative mt-2 h-4 rounded-md bg-black/40 ring-1 ring-white/[0.05]">
                <div
                  className="absolute inset-y-0 w-px bg-cyan-300/80 shadow-[0_0_6px] shadow-cyan-300/70"
                  style={{ left: `${playhead * 100}%` }}
                />
                {st.keys.map((k) => (
                  <button
                    key={k.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayhead(k.t);
                      setActive(p.id);
                    }}
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-[1.35]"
                    style={{ left: `${k.t * 100}%`, background: p.accent, boxShadow: `0 0 8px ${p.accent}` }}
                    title={`${p.label} keyframe · ${Math.round(k.value)}${p.unit}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Playhead scrubber for the keyframe lanes */}
      <div>
        <div className="mb-1.5 flex justify-between text-[10px]">
          <span className="uppercase tracking-widest text-zinc-500">Keyframe playhead</span>
          <span className="font-mono text-zinc-300">{(playhead * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={playhead}
          onChange={(e) => setPlayhead(Number(e.target.value))}
          className="h-1.5 w-full cursor-ew-resize appearance-none rounded-full bg-white/[0.08]"
        />
      </div>

      {/* Easing presets + curve graph */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Easing · {activeDef.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EASINGS.map((e) => (
            <button
              key={e.id}
              onClick={() => patch(active, { easing: e.id })}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition-all duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-px",
                activeState.easing === e.id
                  ? "border-violet-400/50 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 text-white shadow-[0_6px_18px_-8px_rgba(167,139,250,0.9)]"
                  : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-violet-400/30 hover:text-zinc-100"
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 200 80" className="mt-3 h-24 w-full rounded-lg bg-black/45 ring-1 ring-white/[0.05]">
          <defs>
            <linearGradient id="mc-curve" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={6 + i * 47} y1={8} x2={6 + i * 47} y2={74} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
          <path d={curvePath} fill="none" stroke="url(#mc-curve)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx={6} cy={74} r="3" fill="#22d3ee" />
          <circle cx={194} cy={12} r="3" fill="#e879f9" />
        </svg>
      </div>

      {/* Motion blur / shutter */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="text-zinc-300">Motion Blur · Shutter</span>
          <span className="font-mono text-zinc-100">{blur}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={blur}
          onChange={(e) => setBlur(Number(e.target.value))}
          className="h-1.5 w-full cursor-ew-resize appearance-none rounded-full bg-gradient-to-r from-violet-500/40 to-fuchsia-500/70"
        />
        <div className="mt-1.5 text-[9.5px] text-zinc-600">
          Higher shutter angles smear fast keyframe travel for a natural cinema-grade trail.
        </div>
      </div>
    </div>
  );
}
