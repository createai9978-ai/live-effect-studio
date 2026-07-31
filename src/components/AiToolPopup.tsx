import { useEffect, useState } from "react";
import { AssetItem, previewStyleFor } from "../editor/assetLibrary";
import { cn } from "../utils/cn";

type Props = {
  item: AssetItem | null;
  referenceImageUrl: string | null;
  onClose: () => void;
  onApply: (item: AssetItem) => void;
  onToggleFavorite: (id: string) => void;
  favorited: boolean;
};

/**
 * Rich popup that opens when a user clicks an AI Effect card.
 * Shows a large before/after preview, presets, and per-tool sliders
 * whose values recompute the CSS filter in real time.
 */
export default function AiToolPopup({
  item,
  referenceImageUrl,
  onClose,
  onApply,
  onToggleFavorite,
  favorited,
}: Props) {
  const [intensity, setIntensity] = useState(75);
  const [smoothing, setSmoothing] = useState(50);
  const [warmth, setWarmth] = useState(0);
  const [preset, setPreset] = useState("Balanced");
  const [comparing, setComparing] = useState(50); // slider position for before/after wipe

  useEffect(() => {
    if (!item) return;
    setIntensity(75);
    setSmoothing(item.glyph === "beauty" ? 60 : 40);
    setWarmth(0);
    setPreset("Balanced");
    setComparing(50);
  }, [item?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const base = previewStyleFor(item.glyph);
  const scale = 1 + (intensity / 100) * 0.35; // physical zoom
  const bright = 1 + (warmth / 100) * 0.12 - (intensity / 100) * 0.04;
  const sat = 1 + (intensity / 100) * 0.4;
  const smooth = smoothing / 100;
  const combinedFilter = [
    base.filter,
    `saturate(${sat.toFixed(2)})`,
    `brightness(${bright.toFixed(2)})`,
    smooth > 0.05 ? `blur(${(smooth * 0.9).toFixed(2)}px) contrast(${(1 - smooth * 0.1).toFixed(2)})` : "",
    warmth > 0 ? `sepia(${(warmth / 200).toFixed(2)})` : "",
    warmth < 0 ? `hue-rotate(${(warmth * 0.3).toFixed(1)}deg)` : "",
  ].filter(Boolean).join(" ");
  const transform = `scale(${scale.toFixed(2)})`;

  const previewImg = referenceImageUrl ?? item.preview ?? null;

  const presetLabels =
    item.glyph === "beauty" ? ["Natural", "Balanced", "Studio", "Dramatic"]
    : item.glyph === "orbit" || item.glyph === "arc" ? ["Slow", "Balanced", "Cinematic", "Epic"]
    : item.glyph === "zoomin" || item.glyph === "dolly" ? ["Subtle", "Balanced", "Punch", "Extreme"]
    : item.glyph === "flare" || item.glyph === "leak" || item.glyph === "bokeh" ? ["Soft", "Balanced", "Cinematic", "Blown Out"]
    : ["Subtle", "Balanced", "Cinematic", "Extreme"];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="nova-modal-in relative flex max-h-[92vh] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12131b] to-[#0b0c12] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-20px_rgba(139,92,246,0.35)]"
      >
        {/* ================ Header ================ */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-violet-500/40"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3M16 3v3M8 18v3M16 18v3M3 8h3M3 16h3M18 8h3M18 16h3M6 6h12v12H6V6zM10 10h4v4h-4z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {item.tag && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-px font-mono text-[9px] font-bold text-cyan-200">
                  {item.tag}
                </span>
              )}
              {item.isNew && (
                <span className="rounded bg-gradient-to-r from-fuchsia-500 to-orange-400 px-1.5 py-px text-[9px] font-bold text-white">
                  NEW
                </span>
              )}
              {item.is16K && (
                <span
                  className="rounded bg-gradient-to-r from-cyan-400 to-violet-500 px-1.5 py-px text-[9px] font-black text-white"
                  style={{ boxShadow: "0 0 10px -2px rgba(34,211,238,0.7)" }}
                >
                  16K
                </span>
              )}
              {item.isAiPro && (
                <span
                  className="rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-px text-[9px] font-black text-white"
                  style={{ boxShadow: "0 0 10px -2px rgba(217,70,239,0.7)" }}
                >
                  AI PRO
                </span>
              )}
              {item.isExclusive && (
                <span
                  className="rounded bg-gradient-to-r from-amber-400 to-rose-500 px-1.5 py-px text-[9px] font-black text-black"
                  style={{ boxShadow: "0 0 10px -2px rgba(251,191,36,0.7)" }}
                >
                  EXCLUSIVE
                </span>
              )}
              {item.isPro && !item.isAiPro && (
                <span className="rounded bg-black/60 px-1.5 py-px text-[9px] font-bold text-amber-300 ring-1 ring-amber-300/40">
                  PRO
                </span>
              )}
              <span className="ml-1 text-[10px] uppercase tracking-widest text-zinc-500">
                AI Tool
              </span>
            </div>
            <h2 className="mt-0.5 truncate text-[16px] font-semibold text-zinc-100">
              {item.name}
            </h2>
          </div>
          <button
            onClick={() => onToggleFavorite(item.id)}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] transition",
              favorited
                ? "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200"
                : "border-white/[0.08] text-zinc-400 hover:border-fuchsia-500/40 hover:text-fuchsia-300"
            )}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
            {favorited ? "Saved" : "Save"}
          </button>
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

        {/* ================ Body ================ */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_320px]">
          {/* Preview column */}
          <div className="relative min-h-[280px] overflow-hidden bg-black p-5">
            <div className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-white/[0.08]">
              {previewImg ? (
                <>
                  {/* BEFORE (unmodified poster) — clipped to the left of the slider */}
                  <img
                    src={previewImg}
                    alt="Before"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ clipPath: `inset(0 ${100 - comparing}% 0 0)` }}
                  />
                  {/* AFTER (with all effect + slider parameters applied) */}
                  <img
                    src={previewImg}
                    alt="After"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      clipPath: `inset(0 0 0 ${comparing}%)`,
                      filter: combinedFilter,
                      transform,
                      transformOrigin: "center center",
                    }}
                  />
                  {base.overlay && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        clipPath: `inset(0 0 0 ${comparing}%)`,
                        backgroundImage: base.overlay,
                        mixBlendMode: (base.overlayMix as React.CSSProperties["mixBlendMode"]) ?? undefined,
                        opacity: (base.overlayOpacity ?? 1) * (intensity / 100),
                      }}
                    />
                  )}
                  {/* Split handle */}
                  <div
                    className="pointer-events-none absolute top-0 h-full w-px bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.65)]"
                    style={{ left: `${comparing}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                  <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] tracking-widest text-zinc-300">
                    BEFORE
                  </span>
                  <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-md bg-fuchsia-500/25 px-2 py-1 font-mono text-[9px] tracking-widest text-fuchsia-100 ring-1 ring-fuchsia-400/50">
                    AFTER · {preset.toUpperCase()}
                  </span>
                </>
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: item.gradient }}
                />
              )}
            </div>

            {/* Compare slider */}
            <input
              type="range"
              min={0}
              max={100}
              value={comparing}
              onChange={(e) => setComparing(Number(e.target.value))}
              className="mt-4 w-full"
              aria-label="Before/After comparison"
            />
            <div className="mt-1 flex justify-between text-[9px] font-mono uppercase tracking-widest text-zinc-500">
              <span>Before</span>
              <span>Drag to compare</span>
              <span>After</span>
            </div>
          </div>

          {/* Controls column */}
          <div className="flex min-h-0 flex-col overflow-y-auto border-t border-white/[0.05] bg-[#0e0f14] lg:border-t-0 lg:border-l">
            {/* Presets */}
            <div className="border-b border-white/[0.05] p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Presets
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {presetLabels.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPreset(p);
                      // Preset drives the sliders
                      const factor = (i + 1) / presetLabels.length;
                      setIntensity(Math.round(30 + factor * 65));
                      setSmoothing(Math.round(20 + factor * 60));
                      setWarmth(Math.round((factor - 0.5) * 80));
                    }}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition",
                      preset === p
                        ? "border-fuchsia-400/50 bg-gradient-to-br from-fuchsia-500/20 to-violet-500/15 text-white shadow-md shadow-fuchsia-500/20"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-violet-400/30 hover:text-zinc-100"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 p-4">
              <SliderControl
                label="Intensity"
                display={`${intensity}%`}
                value={intensity}
                min={0}
                max={100}
                onChange={setIntensity}
                accent="from-violet-500 to-fuchsia-500"
              />
              <SliderControl
                label={item.glyph === "beauty" ? "Skin Smoothing" : "Softness"}
                display={`${smoothing}%`}
                value={smoothing}
                min={0}
                max={100}
                onChange={setSmoothing}
                accent="from-cyan-400 to-violet-500"
              />
              <SliderControl
                label="Warmth"
                display={warmth === 0 ? "Neutral" : warmth > 0 ? `+${warmth}` : `${warmth}`}
                value={warmth}
                min={-100}
                max={100}
                onChange={setWarmth}
                accent="from-sky-400 to-orange-400"
              />

              <div className="rounded-lg bg-black/40 p-3 ring-1 ring-white/[0.05]">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
                  Live parameters
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                  <Metric label="Scale" value={`${(scale * 100).toFixed(0)}%`} />
                  <Metric label="Sat" value={sat.toFixed(2)} />
                  <Metric label="Bright" value={bright.toFixed(2)} />
                </div>
              </div>

              <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2 text-[10px] leading-relaxed text-cyan-200">
                Adjust the split handle above to compare the effect against the original frame.
                Sliders and presets update the preview in real time.
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-auto flex items-center gap-2 border-t border-white/[0.05] p-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onApply(item);
                  onClose();
                }}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/30 transition hover:brightness-110"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Apply to selected clip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- helpers -------- */
function SliderControl({
  label,
  display,
  value,
  min,
  max,
  onChange,
  accent,
}: {
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accent: string;
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
          className={cn("absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r", accent)}
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent"
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-2 py-1.5">
      <div className="text-[8px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 font-mono text-[10.5px] text-zinc-100">{value}</div>
    </div>
  );
}
