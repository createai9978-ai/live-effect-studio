import { useCallback, useRef } from "react";
import { DEFAULT_GRADE, Grade, WheelVal } from "../editor/types";
import { cn } from "../utils/cn";

/* ---------- generic drag slider (shared) ---------- */
export function DragSlider({
  label,
  value,
  display,
  min,
  max,
  onChange,
  accent = "from-violet-500 to-cyan-400",
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const setFromX = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      onChange(min + p * (max - min));
    },
    [min, max, onChange]
  );

  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-zinc-500">{label}</span>
        <span className="font-mono text-zinc-300">{display}</span>
      </div>
      <div
        ref={ref}
        className="group relative h-3 cursor-ew-resize"
        onMouseDown={(e) => {
          setFromX(e.clientX);
          const move = (ev: MouseEvent) => setFromX(ev.clientX);
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      >
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/[0.07]">
          <div className={cn("h-full rounded-full bg-gradient-to-r", accent)} style={{ width: `${pct}%` }} />
        </div>
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-zinc-200 opacity-0 shadow transition group-hover:opacity-100"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- draggable color wheel ---------- */
function ColorWheel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: WheelVal;
  onChange: (v: WheelVal) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const setFrom = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let x = ((clientX - r.left) / r.width) * 2 - 1;
      let y = ((clientY - r.top) / r.height) * 2 - 1;
      const mag = Math.hypot(x, y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      onChange({ x, y });
    },
    [onChange]
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        className="relative h-[70px] w-[70px] cursor-crosshair rounded-full ring-1 ring-white/10"
        style={{
          background:
            "conic-gradient(#f43f5e, #f59e0b, #a3e635, #22d3ee, #818cf8, #e879f9, #f43f5e)",
        }}
        onMouseDown={(e) => {
          setFrom(e.clientX, e.clientY);
          const move = (ev: MouseEvent) => setFrom(ev.clientX, ev.clientY);
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
        onDoubleClick={() => onChange({ x: 0, y: 0 })}
        title={`${label} — drag to adjust, double-click to reset`}
      >
        <div className="pointer-events-none absolute inset-[16%] rounded-full bg-[#171C29]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/20 shadow"
          style={{ left: `${50 + value.x * 42}%`, top: `${50 + value.y * 42}%` }}
        />
      </div>
      <span className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</span>
    </div>
  );
}

/* ---------- interactive master curve ---------- */
function MasterCurve({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cy = 100 - value * 100;

  const setFrom = useCallback(
    (clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onChange(Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height)));
    },
    [onChange]
  );

  return (
    <div
      ref={ref}
      className="relative h-32 w-full cursor-ns-resize overflow-hidden rounded-lg bg-black/50 ring-1 ring-white/[0.06]"
      onMouseDown={(e) => {
        setFrom(e.clientY);
        const move = (ev: MouseEvent) => setFrom(ev.clientY);
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      onDoubleClick={() => onChange(0.5)}
      title="Master curve — drag the midpoint, double-click to reset"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {[25, 50, 75].map((p) => (
          <g key={p}>
            <line x1={p} y1="0" x2={p} y2="100" stroke="#ffffff0d" />
            <line x1="0" y1={p} x2="100" y2={p} stroke="#ffffff0d" />
          </g>
        ))}
        <line x1="0" y1="100" x2="100" y2="0" stroke="#ffffff14" strokeDasharray="3 3" />
        <path
          d={`M 0 100 Q 25 ${(100 + cy) / 2 - 8} 50 ${cy} Q 75 ${cy / 2 + 4} 100 0`}
          fill="none"
          stroke="url(#curveGrad)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow"
        style={{ left: "50%", top: `${cy}%` }}
      />
    </div>
  );
}

/* ---------- Lumetri scope: derived histogram from grade ---------- */
function HistogramScope({ grade }: { grade: Grade }) {
  // Build a synthetic 64-bin histogram that reacts to exposure/contrast/curve.
  const bars: number[] = [];
  const shift = grade.exposure * 16 + (grade.curve - 0.5) * 24 + grade.gain.y * -6;
  const contrast = grade.contrast;
  for (let i = 0; i < 64; i++) {
    const centered = (i - 32) / 32; // -1..1
    // Base envelope with a soft midtones hump + shadow lift
    const base = Math.exp(-Math.pow((centered - 0.05) * 1.6, 2)) + 0.25;
    // Contrast pushes bins toward extremes
    const cent = centered * contrast;
    const shifted = Math.min(63, Math.max(0, i + shift));
    const w = base * (1 - Math.abs(cent) * 0.25);
    bars[Math.floor(shifted)] = (bars[Math.floor(shifted)] || 0) + w;
  }
  const max = Math.max(...bars, 0.001);
  return (
    <svg viewBox="0 0 64 24" preserveAspectRatio="none" className="h-16 w-full rounded-md bg-black/50 ring-1 ring-white/[0.05]">
      {bars.map((b, i) => {
        const h = (b / max) * 22;
        const isShadow = i < 21;
        const isHi = i > 42;
        return (
          <rect
            key={i}
            x={i}
            y={24 - h}
            width={0.9}
            height={h}
            fill={isShadow ? "#22d3ee" : isHi ? "#f0abfc" : "#a78bfa"}
            opacity={0.85}
          />
        );
      })}
      {/* midline */}
      <line x1="32" y1="0" x2="32" y2="24" stroke="#ffffff10" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

/* ---------- Lumetri Color panel (Color workspace) ---------- */
export default function LumetriPanel({
  grade,
  onGradeChange,
}: {
  grade: Grade;
  onGradeChange: (g: Grade) => void;
}) {
  const set = (patch: Partial<Grade>) => onGradeChange({ ...grade, ...patch });
  const isDefault = JSON.stringify(grade) === JSON.stringify(DEFAULT_GRADE);

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-white/[0.06] bg-[#141824]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <span className="text-[11px] font-semibold text-zinc-200">Lumetri Color</span>
        <button
          onClick={() => onGradeChange(DEFAULT_GRADE)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px] transition",
            isDefault ? "text-zinc-700" : "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25"
          )}
        >
          Reset All
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Scope */}
        <div className="rounded-xl border border-white/[0.07] bg-[#171C29] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Histogram</span>
            <span className="font-mono text-[9px] text-zinc-600">RGB · Rec.709</span>
          </div>
          <HistogramScope grade={grade} />
        </div>

        <div className="text-[9px] text-zinc-600">Applied to Program output</div>

        <div className="rounded-xl border border-white/[0.07] bg-[#171C29] p-3">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Basic Correction
          </div>
          <div className="space-y-2.5">
            <DragSlider
              label="Exposure"
              value={grade.exposure}
              display={grade.exposure >= 0 ? `+${grade.exposure.toFixed(2)}` : grade.exposure.toFixed(2)}
              min={-1}
              max={1}
              onChange={(v) => set({ exposure: v })}
            />
            <DragSlider label="Contrast" value={grade.contrast} display={grade.contrast.toFixed(2)} min={0.5} max={1.5} onChange={(v) => set({ contrast: v })} />
            <DragSlider label="Saturation" value={grade.saturation} display={grade.saturation.toFixed(2)} min={0} max={2} onChange={(v) => set({ saturation: v })} />
            <DragSlider
              label="Temperature"
              value={grade.temp}
              display={`${grade.temp >= 0 ? "+" : ""}${Math.round(grade.temp * 100)}`}
              min={-1}
              max={1}
              accent="from-cyan-400 to-orange-400"
              onChange={(v) => set({ temp: v })}
            />
            <DragSlider
              label="Tint"
              value={grade.tint}
              display={`${grade.tint >= 0 ? "+" : ""}${Math.round(grade.tint * 100)}`}
              min={-1}
              max={1}
              accent="from-emerald-400 to-fuchsia-500"
              onChange={(v) => set({ tint: v })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#171C29] p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Color Wheels</span>
            <button
              onClick={() => set({ lift: { x: 0, y: 0 }, gamma: { x: 0, y: 0 }, gain: { x: 0, y: 0 } })}
              className="text-[9px] text-zinc-600 transition hover:text-zinc-300"
            >
              Reset
            </button>
          </div>
          <div className="flex justify-between">
            <ColorWheel label="Lift" value={grade.lift} onChange={(v) => set({ lift: v })} />
            <ColorWheel label="Gamma" value={grade.gamma} onChange={(v) => set({ gamma: v })} />
            <ColorWheel label="Gain" value={grade.gain} onChange={(v) => set({ gain: v })} />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#171C29] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">RGB Curves · Master</span>
            <span className="font-mono text-[9px] text-zinc-600">mid {Math.round(grade.curve * 100)}%</span>
          </div>
          <MasterCurve value={grade.curve} onChange={(v) => set({ curve: v })} />
        </div>
      </div>
    </aside>
  );
}
