import { useState } from "react";
import { Clip, ClipEffects, Grade, WheelVal } from "../editor/types";
import { cn } from "../utils/cn";

type Tab = "video" | "audio" | "color" | "animation";

type Props = {
  clip: Clip | null;
  clipName: string | null;
  grade: Grade;
  onGradeChange: (g: Grade) => void;
  onUpdateEffects: (clipId: string, patch: Partial<ClipEffects>) => void;
  onClose?: () => void;
};

export default function InspectorPanel({
  clip,
  clipName,
  grade,
  onGradeChange,
  onUpdateEffects,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("video");
  const [transformOpen, setTransformOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [ai, setAi] = useState({ enhance: true, denoise: true, stabilize: false });

  const fx = clip?.effects;
  const patch = (p: Partial<ClipEffects>) => clip && onUpdateEffects(clip.id, p);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0B0F19]">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-zinc-100">Inspector</span>
          <svg className="h-3 w-3 text-[#00F0FF]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l1.6 4L18 8.6l-3.7 2.6.6 4.4-2.9-2-2.9 2 .6-4.4L6 8.6 10.4 7 12 3z" />
          </svg>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-600 transition hover:text-zinc-200" title="Hide inspector">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2.5">
        {(["video", "audio", "color", "animation"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full px-2 py-1.5 text-[10.5px] font-medium capitalize transition-all duration-300",
              tab === t
                ? "bg-[#00F0FF]/15 text-[#00F0FF] shadow-[0_0_16px_-6px_#00F0FF] ring-1 ring-[#00F0FF]/40"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <div className="mb-2.5 truncate rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-zinc-400">
          {clipName ?? "No clip selected — select a timeline clip"}
        </div>

        {tab === "video" && (
          <>
            <Section title="Transform" open={transformOpen} onToggle={() => setTransformOpen((v) => !v)} enabled>
              <Row label="Position">
                <NumField
                  prefix="X"
                  value={fx?.posX ?? 0}
                  onChange={(v) => patch({ posX: v })}
                />
                <NumField
                  prefix="Y"
                  value={fx?.posY ?? 0}
                  onChange={(v) => patch({ posY: v })}
                />
              </Row>
              <Slider label="Scale" value={fx?.scale ?? 100} min={10} max={400} suffix="%" onChange={(v) => patch({ scale: v })} />
              <Slider label="Rotation" value={fx?.rotation ?? 0} min={-180} max={180} suffix="°" onChange={(v) => patch({ rotation: v })} />
              <Slider label="Opacity" value={fx?.opacity ?? 100} min={0} max={100} suffix="%" onChange={(v) => patch({ opacity: v })} />
            </Section>

            <Section title="AI Enhancements" badge="NEW" open={aiOpen} onToggle={() => setAiOpen((v) => !v)}>
              <Toggle label="Auto Enhance" on={ai.enhance} onChange={(v) => setAi((s) => ({ ...s, enhance: v }))} />
              <Toggle label="Noise Reduction" on={ai.denoise} onChange={(v) => setAi((s) => ({ ...s, denoise: v }))} />
              <Toggle label="Stabilization" on={ai.stabilize} onChange={(v) => setAi((s) => ({ ...s, stabilize: v }))} />
            </Section>
          </>
        )}

        {tab === "audio" && (
          <Section title="Audio Levels" open onToggle={() => {}} enabled>
            <Slider label="Clip Volume" value={fx?.opacity ?? 100} min={0} max={100} suffix="%" onChange={(v) => patch({ opacity: v })} />
            <Slider label="Speed" value={fx?.speed ?? 100} min={25} max={400} suffix="%" onChange={(v) => patch({ speed: v })} />
          </Section>
        )}

        {tab === "color" && (
          <Section title="Color Grading" open={colorOpen} onToggle={() => setColorOpen((v) => !v)} enabled>
            <div className="grid grid-cols-4 gap-2 py-1">
              <Wheel label="Lift" value={grade.lift} onChange={(v) => onGradeChange({ ...grade, lift: v })} />
              <Wheel label="Gamma" value={grade.gamma} onChange={(v) => onGradeChange({ ...grade, gamma: v })} />
              <Wheel label="Gain" value={grade.gain} onChange={(v) => onGradeChange({ ...grade, gain: v })} />
              <Wheel label="Offset" value={{ x: grade.temp, y: grade.tint }} onChange={(v) => onGradeChange({ ...grade, temp: v.x, tint: v.y })} />
            </div>
            <Slider label="Exposure" value={grade.exposure} min={-1} max={1} step={0.01} onChange={(v) => onGradeChange({ ...grade, exposure: v })} />
            <Slider label="Contrast" value={grade.contrast} min={0.5} max={1.5} step={0.01} onChange={(v) => onGradeChange({ ...grade, contrast: v })} />
            <Slider label="Saturation" value={grade.saturation} min={0} max={2} step={0.01} onChange={(v) => onGradeChange({ ...grade, saturation: v })} />
          </Section>
        )}

        {tab === "animation" && (
          <Section title="Motion" open onToggle={() => {}} enabled>
            <Slider label="Speed" value={fx?.speed ?? 100} min={25} max={400} suffix="%" onChange={(v) => patch({ speed: v })} />
            <Slider label="Shake" value={fx?.shakeIntensity ?? 0} min={0} max={100} suffix="%" onChange={(v) => patch({ shakeIntensity: v })} />
            <Slider label="Blur Transition" value={fx?.blurTransition ?? 0} min={0} max={100} suffix="%" onChange={(v) => patch({ blurTransition: v })} />
            <div className="mt-2 text-[9.5px] leading-relaxed text-zinc-600">
              {clip?.keyframes.length ?? 0} keyframe{(clip?.keyframes.length ?? 0) === 1 ? "" : "s"} on this clip.
            </div>
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  badge,
  open,
  onToggle,
  enabled,
  children,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-2.5 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 transition hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-1.5">
          <svg
            className={cn("h-3 w-3 text-zinc-500 transition-transform duration-300", open ? "rotate-0" : "-rotate-90")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-[11px] font-semibold text-zinc-200">{title}</span>
          {badge && (
            <span className="rounded bg-fuchsia-500 px-1 py-px text-[7px] font-bold text-white">{badge}</span>
          )}
        </span>
        {enabled && (
          <span className="flex h-3.5 w-7 items-center rounded-full bg-[#00F0FF]/70 px-0.5">
            <span className="ml-auto h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        )}
      </button>
      <div
        className="grid transition-all duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 px-3 pb-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] text-zinc-500">{label}</span>
      <div className="flex flex-1 gap-1.5">{children}</div>
    </div>
  );
}

function NumField({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-1 rounded-md bg-black/40 px-1.5 py-1 ring-1 ring-white/[0.06] focus-within:ring-[#00F0FF]/60">
      <span className="text-[9px] text-zinc-600">{prefix}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-transparent text-right font-mono text-[10.5px] text-zinc-200 outline-none"
      />
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] text-zinc-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nova-range h-1 flex-1 cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(90deg,#00F0FF ${pct}%, rgba(255,255,255,.08) ${pct}%)`,
        }}
      />
      <span className="w-14 shrink-0 rounded-md bg-black/40 py-0.5 text-center font-mono text-[10px] text-zinc-300 ring-1 ring-white/[0.06]">
        {step < 1 ? value.toFixed(2) : Math.round(value)}
        {suffix}
      </span>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10.5px] text-zinc-400">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={cn(
          "flex h-4 w-8 items-center rounded-full px-0.5 transition-all duration-300",
          on ? "bg-[#00F0FF] shadow-[0_0_12px_-2px_#00F0FF]" : "bg-white/[0.12]"
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full bg-white transition-transform duration-300",
            on ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function Wheel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: WheelVal;
  onChange: (v: WheelVal) => void;
}) {
  const drag = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const move = (ev: MouseEvent | React.MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      const y = ((ev.clientY - r.top) / r.height) * 2 - 1;
      const m = Math.max(1, Math.hypot(x, y));
      onChange({ x: +(x / m).toFixed(3), y: +(y / m).toFixed(3) });
    };
    move(e);
    const up = () => {
      window.removeEventListener("mousemove", move as (e: MouseEvent) => void);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move as (e: MouseEvent) => void);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        onMouseDown={drag}
        className="relative h-[54px] w-[54px] cursor-crosshair rounded-full ring-1 ring-white/[0.1] transition duration-300 hover:ring-[#00F0FF]/50"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #10141f 42%, transparent 43%), conic-gradient(#ff4d6d,#ffd166,#7CFF6B,#00F0FF,#5B7CFF,#C86BFF,#ff4d6d)",
        }}
      >
        <span
          className="absolute h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#00F0FF]"
          style={{
            left: `calc(50% + ${value.x * 20}px - 4px)`,
            top: `calc(50% + ${value.y * 20}px - 4px)`,
          }}
        />
      </div>
      <span className="text-[9px] text-zinc-500">{label}</span>
    </div>
  );
}
