import { useEffect, useRef, useState } from "react";
import {
  CustomPreset,
  EffectFamily,
  ParamValues,
  deleteCustomPreset,
  loadCustomPresets,
  saveCustomPreset,
  schemaFor,
} from "../editor/effectParams";
import { cn } from "../utils/cn";
import { VideoProcessor, type EffectParams } from "../editor/VideoProcessor";
import { curveMeta } from "../editor/motionEngine";


type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  tag?: string;
  family: EffectFamily;
  values: ParamValues;
  onChange: (v: ParamValues) => void;
  /** Source of the currently selected project clip — the real footage the effect is previewed on. */
  videoSrc?: string | null;
  posterUrl?: string | null;
  clipLabel?: string | null;
  /** Library demo clip used when the project has no media yet. */
  fallbackClip?: string | null;
  presetName?: string;
  onPresetChange?: (name: string) => void;
  onClose: () => void;
  onApply?: () => void;
  applyLabel?: string;
  onDelete?: () => void;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  processingState?: "queued" | "analyzing" | "ready" | "failed";
  processingProgress?: number;
  processingMessage?: string;
  effect?: EffectParams | null;
};

/**
 * Context-aware Effect Control Panel.
 * Shows the real project footage with the effect applied live (no fake before/after
 * waterfall) plus the parameters that actually belong to this class of effect.
 */
export default function EffectControlPanel({
  open,
  title,
  subtitle,
  tag,
  family,
  values,
  onChange,
  videoSrc,
  posterUrl,
  clipLabel,
  fallbackClip,
  presetName,
  onPresetChange,
  onClose,
  onApply,
  applyLabel = "Apply to selected clip",
  onDelete,
  favorited,
  onToggleFavorite,
  processingState,
  processingProgress = 0,
  processingMessage,
  effect,
}: Props) {
  const schema = schemaFor(family);
  const [customs, setCustoms] = useState<CustomPreset[]>([]);
  const [savingName, setSavingName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [bypass, setBypass] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<VideoProcessor | null>(null);
  const [gpuReady, setGpuReady] = useState(false);

  useEffect(() => setCustoms(loadCustomPresets()), [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const src = videoSrc || fallbackClip || null;
  const familyCustoms = customs.filter((c) => c.family === family);

  if (!open) return null;

  const set = (key: string, v: number | string) => onChange({ ...values, [key]: v });

  const startGpuPreview = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    processorRef.current?.dispose();
    processorRef.current = null;
    setGpuReady(false);
    if (!video || !canvas || !effect || bypass || video.readyState < 2) return;
    const processor = new VideoProcessor();
    if (!processor.init(canvas, video)) return;
    processor.setEffects([effect]);
    processor.start(() => setGpuReady(true));
    processorRef.current = processor;
  };

  useEffect(() => {
    startGpuPreview();
    return () => {
      processorRef.current?.dispose();
      processorRef.current = null;
    };
  }, [effect, bypass, src]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="nova-modal-in relative flex max-h-[92vh] w-[min(1120px,96vw)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12131b] to-[#0b0c12] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-violet-500/40">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h10M4 18h6M18 10v8M15 14h6" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {tag && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-px font-mono text-[9px] font-bold text-cyan-200">{tag}</span>
              )}
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Effect Controls · {schema.familyLabel}
              </span>
            </div>
            <h2 className="mt-0.5 truncate text-[16px] font-semibold text-zinc-100">{title}</h2>
          </div>
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={cn(
                "flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] transition",
                favorited
                  ? "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200"
                  : "border-white/[0.08] text-zinc-400 hover:border-fuchsia-500/40 hover:text-fuchsia-300"
              )}
            >
              {favorited ? "Saved" : "Save"}
            </button>
          )}
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_330px]">
          {/* Live program preview */}
          <div className="relative flex min-h-[300px] flex-col bg-black p-5">
            <div className="relative flex-1 overflow-hidden rounded-xl bg-[#000000] ring-1 ring-white/[0.08]">
              {src ? (
                <video
                  ref={videoRef}
                  key={src}
                  src={src}
                  poster={posterUrl ?? undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover"
                  onLoadedData={startGpuPreview}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-600">
                  Import media to preview this effect on your footage
                </div>
              )}

              <canvas
                ref={canvasRef}
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-150",
                  !bypass && gpuReady ? "opacity-100" : "opacity-0"
                )}
              />

              <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] tracking-widest text-zinc-300">
                {clipLabel ? `PROGRAM · ${clipLabel.toUpperCase()}` : "PROGRAM PREVIEW"}
              </span>
              <span
                className={cn(
                  "pointer-events-none absolute right-2.5 top-2.5 rounded-md px-2 py-1 font-mono text-[9px] tracking-widest ring-1",
                  bypass
                    ? "bg-zinc-800/80 text-zinc-400 ring-white/10"
                    : "bg-fuchsia-500/25 text-fuchsia-100 ring-fuchsia-400/50"
                )}
              >
                {bypass ? "FX BYPASSED" : `FX LIVE${presetName ? ` · ${presetName.toUpperCase()}` : ""}`}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onMouseDown={() => setBypass(true)}
                onMouseUp={() => setBypass(false)}
                onMouseLeave={() => setBypass(false)}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.05]"
                title="Hold to temporarily bypass the effect"
              >
                Hold to compare
              </button>
              <span className="text-[10px] text-zinc-600">
                Real-time render on {videoSrc ? "your selected clip" : "demo footage"} — all parameters update live.
              </span>
            </div>
          </div>

          {/* Parameters */}
          <div className="flex min-h-0 flex-col overflow-y-auto border-t border-white/[0.05] bg-[#0e0f14] lg:border-t-0 lg:border-l">
            {/* Tabs */}
            <div className="sticky top-0 z-10 flex shrink-0 gap-1 border-b border-white/[0.05] bg-[#0e0f14]/95 p-2 backdrop-blur">
              {(["params", "motion"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-250 ease-[cubic-bezier(.22,1,.36,1)]",
                    tab === t
                      ? "bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 text-white shadow-[0_6px_18px_-10px_rgba(167,139,250,0.9)] ring-1 ring-violet-400/40"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                  )}
                >
                  {t === "params" ? "Parameters" : "Motion Controls"}
                </button>
              ))}
            </div>

            {tab === "motion" ? (
              <div className="nova-fade-in">
                <MotionControlsPanel shutter={effect?.motionSig?.shutter ?? 180} />
              </div>
            ) : (
            <>
            {/* Presets */}
            <div className="border-b border-white/[0.05] p-4">

              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Presets</span>
                <button
                  onClick={() => setShowSave((s) => !s)}
                  className="rounded-md border border-violet-400/30 px-2 py-0.5 text-[9.5px] text-violet-200 transition hover:bg-violet-500/10"
                >
                  + Save as Custom Preset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {schema.presets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      onChange({ ...values, ...p.values });
                      onPresetChange?.(p.name);
                    }}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition",
                      presetName === p.name
                        ? "border-fuchsia-400/50 bg-gradient-to-br from-fuchsia-500/20 to-violet-500/15 text-white shadow-md shadow-fuchsia-500/20"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-violet-400/30 hover:text-zinc-100"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {familyCustoms.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600">My presets</div>
                  {familyCustoms.map((p) => (
                    <div key={p.id} className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onChange({ ...values, ...p.values });
                          onPresetChange?.(p.name);
                        }}
                        className={cn(
                          "flex-1 truncate rounded-md border px-2 py-1 text-left text-[10.5px] transition",
                          presetName === p.name
                            ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
                            : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-zinc-100"
                        )}
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => setCustoms(deleteCustomPreset(p.id))}
                        title="Delete preset"
                        className="rounded-md px-1.5 py-1 text-[10px] text-zinc-600 transition hover:bg-white/[0.05] hover:text-rose-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showSave && (
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    placeholder="Preset name"
                    className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/40 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-violet-400/50"
                  />
                  <button
                    onClick={() => {
                      const name = savingName.trim();
                      if (!name) return;
                      setCustoms(
                        saveCustomPreset({
                          id: `${family}-${name}-${Date.now()}`,
                          family,
                          name,
                          values: { ...values },
                        })
                      );
                      onPresetChange?.(name);
                      setSavingName("");
                      setShowSave(false);
                    }}
                    className="rounded-md bg-violet-600 px-2.5 py-1 text-[11px] text-white transition hover:brightness-110"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Motion signature — the preset's unique keyframe/easing/shutter recipe */}
            {effect?.motionSig && (() => { const mCurve = curveMeta(effect.motionSig.curve); return (
              <div className="border-b border-white/[0.05] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Motion Signature</span>
                  <span className="font-mono text-[9px] text-zinc-600">{Math.round(effect.motionSig.shutter)}° shutter</span>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-black/30 p-2.5">
                  <div className="flex items-center gap-2.5">
                    <svg viewBox="0 0 100 60" className="h-12 w-20 shrink-0 rounded bg-black/50 ring-1 ring-white/[0.06]">
                      <path
                        d={`M 4 54 C ${4 + mCurve.bezier[0] * 92} ${54 - mCurve.bezier[1] * 48}, ${4 + mCurve.bezier[2] * 92} ${54 - mCurve.bezier[3] * 48}, 96 6`}
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                      />
                    </svg>
                    <div className="min-w-0 space-y-0.5">
                      <div className="truncate text-[11px] font-medium text-zinc-200">{mCurve.label}</div>
                      <div className="truncate font-mono text-[9px] text-zinc-500">{effect.motionSig.trajectory}</div>
                      <div className="font-mono text-[9px] text-zinc-600">
                        {effect.motionSig.period.toFixed(2)}s cycle · {effect.motionSig.pingPong ? "ping-pong" : "loop"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ); })()}


            {/* Params */}

            <div className="space-y-4 p-4">
              {(processingState === "queued" || processingState === "analyzing") && (
                <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.05] p-3">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-cyan-100">
                    <span>Local AI analysis</span><span>{processingProgress}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full bg-cyan-400 transition-[width] duration-150" style={{ width: `${processingProgress}%` }} />
                  </div>
                  <div className="mt-1.5 text-[9.5px] text-zinc-500">{processingMessage ?? "Preparing model"}</div>
                </div>
              )}
              {schema.params.map((p) =>
                p.type === "slider" ? (
                  <SliderControl
                    key={p.key}
                    label={p.label}
                    hint={p.hint}
                    display={`${Math.round(Number(values[p.key] ?? p.default))}${p.unit ?? ""}`}
                    value={Number(values[p.key] ?? p.default)}
                    min={p.min}
                    max={p.max}
                    step={p.step ?? 1}
                    onChange={(v) => set(p.key, v)}
                  />
                ) : (
                  <div key={p.key}>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span className="text-zinc-300">{p.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.options.map((o) => (
                        <button
                          key={o}
                          onClick={() => set(p.key, o)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[10.5px] transition",
                            String(values[p.key] ?? p.default) === o
                              ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
                              : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-zinc-100"
                          )}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    {p.hint && <div className="mt-1 text-[9.5px] text-zinc-600">{p.hint}</div>}
                  </div>
                )
              )}

              {subtitle && (
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] px-3 py-2 text-[10px] leading-relaxed text-cyan-200">
                  {subtitle}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center gap-2 border-t border-white/[0.05] p-3">
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-[11px] text-rose-300 transition hover:bg-rose-500/10"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                  Remove
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.04]"
              >
                Close
              </button>
              {onApply && (
                <button
                  onClick={onApply}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/30 transition hover:brightness-110"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {applyLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderControl({
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11px]">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-100">{display}</span>
      </div>
      <div className="relative h-4">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/[0.07]" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent"
        />
      </div>
      {hint && <div className="mt-1 text-[9.5px] text-zinc-600">{hint}</div>}
    </div>
  );
}
