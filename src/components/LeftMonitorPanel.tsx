import { useEffect, useState } from "react";
import SourceMonitor from "./SourceMonitor";
import { DragSlider } from "./LumetriPanel";
import { Asset, Clip, ClipEffects, DEFAULT_EFFECTS, fmtDuration, toTimecode } from "../editor/types";
import { cn } from "../utils/cn";

type Props = {
  sourceAsset: Asset | null;
  selectedClip: Clip | null;
  selectedAsset: Asset | null;
  onInsert: (assetId: string, offset: number, duration: number) => void;
  onUpdateClipEffects: (clipId: string, patch: Partial<ClipEffects>) => void;
};

/** Top-left dual-monitor panel: tabbed Source Monitor / Effect Controls, like Premiere. */
export default function LeftMonitorPanel({
  sourceAsset,
  selectedClip,
  selectedAsset,
  onInsert,
  onUpdateClipEffects,
}: Props) {
  const [tab, setTab] = useState<"source" | "fx">("source");

  // Opening a new clip in source jumps to Source tab; selecting a clip in the timeline
  // jumps to Effect Controls so the user immediately sees its parameters.
  useEffect(() => {
    if (sourceAsset) setTab("source");
  }, [sourceAsset?.id]);
  useEffect(() => {
    if (selectedClip) setTab("fx");
  }, [selectedClip?.id]);

  return (
    <section className="flex w-[44%] min-w-[360px] max-w-[560px] shrink-0 flex-col border-r border-white/[0.06] bg-[#181B24]">
      {/* Tabs */}
      <div className="flex items-center border-b border-white/[0.05]">
        {(
          [
            ["source", "Source Monitor"],
            ["fx", "Effect Controls"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "border-b-2 px-3 py-2 text-[11px] transition",
              tab === id
                ? "border-violet-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto truncate pr-3 text-[9px] text-zinc-600">
          {tab === "source"
            ? sourceAsset
              ? sourceAsset.name
              : "no clip"
            : selectedAsset
            ? selectedAsset.name
            : "no selection"}
        </span>
      </div>

      {tab === "source" ? (
        <SourceMonitor asset={sourceAsset} onInsert={onInsert} />
      ) : (
        <EffectControlsTab
          clip={selectedClip}
          asset={selectedAsset}
          onUpdate={onUpdateClipEffects}
        />
      )}
    </section>
  );
}

/* ---------------- Effect Controls tab ---------------- */
function EffectControlsTab({
  clip,
  asset,
  onUpdate,
}: {
  clip: Clip | null;
  asset: Asset | null;
  onUpdate: (clipId: string, patch: Partial<ClipEffects>) => void;
}) {
  if (!clip || !asset) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <svg
          className="h-9 w-9 text-zinc-800"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
        </svg>
        <div className="text-[11px] text-zinc-500">No clip selected</div>
        <div className="max-w-[240px] text-[9.5px] leading-relaxed text-zinc-700">
          Select a clip in the timeline to edit its Motion, Opacity, Time Remapping, and keyframes
        </div>
      </div>
    );
  }

  const fx = clip.effects;
  const set = (patch: Partial<ClipEffects>) => onUpdate(clip.id, patch);
  const kind = asset.kind === "video" ? "Video" : asset.kind === "image" ? "Image" : "Audio";

  // Effective source duration consumed at current speed
  const sourceUsed = clip.duration * (fx.speed / 100);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {/* Clip header */}
      <div className="rounded-xl border border-white/[0.07] bg-[#171C29] p-3">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={cn(
              "rounded px-1 py-px text-[8px] font-bold",
              asset.kind === "video" ? "bg-violet-500/80 text-white" : "bg-emerald-500/80 text-white"
            )}
          >
            {kind}
          </span>
          <span className="truncate text-[11px] font-medium text-zinc-200">{asset.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-zinc-600">
          <span className="rounded bg-white/[0.05] px-1.5 py-0.5">{clip.track}</span>
          <span>in {fmtDuration(clip.offset)}</span>
          <span>·</span>
          <span>dur {fmtDuration(clip.duration)}</span>
          <span>·</span>
          <span>src {fmtDuration(sourceUsed)}</span>
        </div>
      </div>

      {/* APPLIED CREATOR EFFECTS STACK (Non-Destructive Sub-Layers) */}
      {clip.appliedEffects && clip.appliedEffects.length > 0 && (
        <ParamGroup
          title="Applied Video Effects"
          onReset={() => onUpdate(clip.id, { ...fx, presetLabel: undefined })}
        >
          <div className="space-y-4">
            {clip.appliedEffects.map((ae) => {
              const handleToggle = () => {
                const next = clip.appliedEffects?.map((item) =>
                  item.id === ae.id ? { ...item, enabled: !item.enabled } : item
                );
                onUpdate(clip.id, { ...fx }); // Trigger standard save ref
                // update parent clips state manually
                clip.appliedEffects = next;
              };

              const handleIntensityChange = (val: number) => {
                const next = clip.appliedEffects?.map((item) =>
                  item.id === ae.id ? { ...item, intensity: val } : item
                );
                clip.appliedEffects = next;
                onUpdate(clip.id, { ...fx }); // Trigger save ref
              };

              const handleRemove = () => {
                const next = clip.appliedEffects?.filter((item) => item.id !== ae.id);
                clip.appliedEffects = next;
                onUpdate(clip.id, { ...fx }); // Trigger save ref
              };

              return (
                <div key={ae.id} className="space-y-2 rounded-lg bg-black/25 p-2.5 ring-1 ring-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10.5px] font-bold text-violet-200">{ae.name}</div>
                      <div className="text-[8px] text-zinc-500">Status: <span className={ae.enabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>{ae.enabled ? "Active" : "Bypassed"}</span></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleToggle}
                        className={cn(
                          "rounded px-2 py-0.5 text-[9px] font-medium transition",
                          ae.enabled
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        )}
                      >
                        {ae.enabled ? "Bypass" : "Enable"}
                      </button>
                      <button
                        onClick={handleRemove}
                        className="rounded bg-red-500/10 p-1 text-[10px] text-red-400 hover:bg-red-500/20 transition"
                        title="Delete this effect"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {ae.enabled && (
                    <DragSlider
                      label="Mix Intensity"
                      value={ae.intensity}
                      display={`${Math.round(ae.intensity)}%`}
                      min={0}
                      max={100}
                      onChange={handleIntensityChange}
                      accent="from-violet-500 to-fuchsia-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ParamGroup>
      )}

      {/* MOTION */}
      <ParamGroup
        title="Motion"
        onReset={() =>
          set({ posX: 0, posY: 0, scale: 100, rotation: 0 })
        }
      >
        <div className="grid grid-cols-2 gap-2.5">
          <DragSlider
            label="Position X"
            value={fx.posX}
            display={`${Math.round(fx.posX)} px`}
            min={-500}
            max={500}
            onChange={(v) => set({ posX: v })}
          />
          <DragSlider
            label="Position Y"
            value={fx.posY}
            display={`${Math.round(fx.posY)} px`}
            min={-500}
            max={500}
            onChange={(v) => set({ posY: v })}
          />
        </div>
        <DragSlider
          label="Scale"
          value={fx.scale}
          display={`${fx.scale.toFixed(1)}%`}
          min={5}
          max={400}
          onChange={(v) => set({ scale: v })}
          accent="from-violet-500 to-fuchsia-500"
        />
        <DragSlider
          label="Rotation"
          value={fx.rotation}
          display={`${fx.rotation >= 0 ? "+" : ""}${fx.rotation.toFixed(1)}°`}
          min={-360}
          max={360}
          onChange={(v) => set({ rotation: v })}
          accent="from-cyan-400 to-violet-500"
        />
        {/* mini position pad */}
        <PositionPad
          x={fx.posX}
          y={fx.posY}
          onChange={(x, y) => set({ posX: x, posY: y })}
        />
      </ParamGroup>

      {/* OPACITY */}
      <ParamGroup title="Opacity" onReset={() => set({ opacity: 100 })}>
        <DragSlider
          label="Opacity"
          value={fx.opacity}
          display={`${fx.opacity.toFixed(1)}%`}
          min={0}
          max={100}
          onChange={(v) => set({ opacity: v })}
          accent="from-zinc-500 to-white"
        />
        {/* opacity preview strip */}
        <div className="relative h-4 overflow-hidden rounded-md ring-1 ring-white/[0.05]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#2a2a35 0% 25%, #171C29 0% 50%)",
              backgroundSize: "10px 10px",
            }}
          />
          <div
            className="absolute inset-0 bg-white"
            style={{ opacity: fx.opacity / 100 }}
          />
        </div>
      </ParamGroup>

      {/* TIME REMAPPING */}
      <ParamGroup title="Time Remapping" onReset={() => set({ speed: 100 })}>
        <DragSlider
          label="Speed"
          value={fx.speed}
          display={`${fx.speed.toFixed(1)}%`}
          min={10}
          max={400}
          onChange={(v) => set({ speed: v })}
          accent="from-orange-400 to-fuchsia-500"
        />
        {/* speed presets */}
        <div className="flex flex-wrap gap-1">
          {[25, 50, 100, 150, 200, 400].map((p) => (
            <button
              key={p}
              onClick={() => set({ speed: p })}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[9px] font-mono transition",
                Math.abs(fx.speed - p) < 0.5
                  ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200"
                  : "border-white/[0.06] bg-black/30 text-zinc-500 hover:text-zinc-200"
              )}
            >
              {p}%
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px]">
          <div className="rounded-md bg-black/30 px-2 py-1.5">
            <div className="text-zinc-600">Timeline dur</div>
            <div className="font-mono text-zinc-300">{toTimecode(clip.duration)}</div>
          </div>
          <div className="rounded-md bg-black/30 px-2 py-1.5">
            <div className="text-zinc-600">Source consumed</div>
            <div className="font-mono text-zinc-300">{toTimecode(sourceUsed)}</div>
          </div>
        </div>
        {Math.abs(fx.speed - 100) > 0.1 && (
          <div className="rounded-md border border-fuchsia-400/25 bg-fuchsia-500/10 px-2 py-1.5 text-[9.5px] leading-relaxed text-fuchsia-200">
            {fx.speed > 100
              ? `Playing ${(fx.speed / 100).toFixed(2)}× — fast motion`
              : `Playing ${(fx.speed / 100).toFixed(2)}× — slow motion`}
          </div>
        )}
      </ParamGroup>

      {/* CINEMATIC FILM & CREATIVE LUTS */}
      <ParamGroup
        title="Cinematic Film & Creative LUTs"
        onReset={() =>
          set({
            filmType: "none",
            grainAmount: 0,
            halationAmount: 0,
            gateWeaveAmount: 0,
            lutType: "none",
            lutIntensity: 0,
            chromaticAberration: 0,
            shakeIntensity: 0,
            blurTransition: 0,
            flickerIntensity: 0,
          })
        }
      >
        <div className="space-y-3">
          {/* Film Emulation Selector */}
          <div>
            <div className="mb-1 text-[10px] text-zinc-500">Film Emulation Profile</div>
            <div className="flex gap-1.5">
              {(["none", "16mm", "35mm"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => set({ filmType: type })}
                  className={cn(
                    "flex-1 rounded-md border py-1 text-center text-[9.5px] font-medium uppercase tracking-wider transition",
                    (fx.filmType || "none") === type
                      ? "border-violet-400 bg-violet-500/15 text-violet-200"
                      : "border-white/[0.06] bg-black/30 text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {(fx.filmType || "none") !== "none" && (
            <div className="space-y-2.5 rounded-lg bg-black/25 p-2.5">
              <DragSlider
                label="Grain Amount"
                value={fx.grainAmount ?? 0}
                display={`${Math.round(fx.grainAmount ?? 0)}%`}
                min={0}
                max={100}
                onChange={(v) => set({ grainAmount: v })}
                accent="from-amber-600 to-rose-500"
              />
              <DragSlider
                label="Halation Glow"
                value={fx.halationAmount ?? 0}
                display={`${Math.round(fx.halationAmount ?? 0)}%`}
                min={0}
                max={100}
                onChange={(v) => set({ halationAmount: v })}
                accent="from-rose-500 to-violet-500"
              />
              <DragSlider
                label="Gate Weave Jitter"
                value={fx.gateWeaveAmount ?? 0}
                display={`${Math.round(fx.gateWeaveAmount ?? 0)}%`}
                min={0}
                max={100}
                onChange={(v) => set({ gateWeaveAmount: v })}
                accent="from-cyan-400 to-violet-500"
              />
            </div>
          )}

          {/* Creative LUTs Selector */}
          <div className="border-t border-white/[0.04] pt-2.5">
            <div className="mb-1 text-[10px] text-zinc-500">Creative Look / LUT</div>
            <select
              value={fx.lutType || "none"}
              onChange={(e) => set({ lutType: e.target.value as any })}
              className="w-full rounded-md border border-white/[0.06] bg-black/40 px-2 py-1.5 text-[10.5px] text-zinc-300 outline-none focus:border-violet-500/50"
            >
              <option value="none">None (Rec. 709)</option>
              <option value="tealOrange">Teal & Orange (Cinematic)</option>
              <option value="vintageKodak">Vintage Kodak (Analog 1970s)</option>
              <option value="portra">Kodak Portra (Warm Skintones)</option>
            </select>
          </div>

          {(fx.lutType || "none") !== "none" && (
            <DragSlider
              label="LUT Intensity"
              value={fx.lutIntensity ?? 0}
              display={`${Math.round(fx.lutIntensity ?? 0)}%`}
              min={0}
              max={100}
              onChange={(v) => set({ lutIntensity: v })}
              accent="from-violet-500 to-cyan-400"
            />
          )}

          {/* Dynamic Effects */}
          <div className="border-t border-white/[0.04] pt-2.5 space-y-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Dynamic Effects</div>
            <DragSlider
              label="Chromatic Aberration"
              value={fx.chromaticAberration ?? 0}
              display={`${Math.round(fx.chromaticAberration ?? 0)}%`}
              min={0}
              max={100}
              onChange={(v) => set({ chromaticAberration: v })}
              accent="from-red-500 to-cyan-400"
            />
            <DragSlider
              label="Active Camera Shake"
              value={fx.shakeIntensity ?? 0}
              display={`${Math.round(fx.shakeIntensity ?? 0)}%`}
              min={0}
              max={100}
              onChange={(v) => set({ shakeIntensity: v })}
              accent="from-amber-500 to-rose-500"
            />
            <DragSlider
              label="Light Flicker"
              value={fx.flickerIntensity ?? 0}
              display={`${Math.round(fx.flickerIntensity ?? 0)}%`}
              min={0}
              max={100}
              onChange={(v) => set({ flickerIntensity: v })}
              accent="from-violet-500 to-fuchsia-500"
            />
          </div>
        </div>
      </ParamGroup>

      {/* KEYFRAMES */}
      <ParamGroup title="Keyframes" onReset={undefined}>
        {clip.keyframes.length ? (
          <div className="flex flex-wrap gap-1.5">
            {clip.keyframes.map((k, i) => (
              <span
                key={i}
                className="rounded bg-violet-500/15 px-1.5 py-0.5 font-mono text-[9px] text-violet-300"
              >
                ◆ +{k.toFixed(2)}s
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[9.5px] leading-relaxed text-zinc-600">
            Use the Pen tool (P) and click this clip in the timeline to add motion/opacity keyframes.
          </div>
        )}
      </ParamGroup>

      {/* Reset all */}
      <button
        onClick={() => set({ ...DEFAULT_EFFECTS })}
        className="w-full rounded-md border border-white/[0.08] py-1.5 text-[10px] text-zinc-400 transition hover:border-fuchsia-500/40 hover:text-fuchsia-300"
      >
        Reset all effects on this clip
      </button>
    </div>
  );
}

/* ---------------- helpers ---------------- */
function ParamGroup({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#171C29] p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </span>
        {onReset && (
          <button
            onClick={onReset}
            className="text-[9px] text-zinc-600 transition hover:text-zinc-300"
          >
            Reset
          </button>
        )}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function PositionPad({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  // constrain a joystick-like target within ±500 (matching sliders)
  const cx = 50 + (x / 500) * 45;
  const cy = 50 + (y / 500) * 45;
  return (
    <div
      className="relative h-24 w-full cursor-crosshair overflow-hidden rounded-md bg-black/50 ring-1 ring-white/[0.06]"
      onMouseDown={(e) => {
        const el = e.currentTarget;
        const set = (clientX: number, clientY: number) => {
          const r = el.getBoundingClientRect();
          const nx = ((clientX - r.left) / r.width - 0.5) * 2; // -1..1
          const ny = ((clientY - r.top) / r.height - 0.5) * 2;
          onChange(
            Math.max(-500, Math.min(500, nx * 500)),
            Math.max(-500, Math.min(500, ny * 500))
          );
        };
        set(e.clientX, e.clientY);
        const move = (ev: MouseEvent) => set(ev.clientX, ev.clientY);
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      onDoubleClick={() => onChange(0, 0)}
      title="Drag to reposition · double-click to center"
    >
      {/* grid */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <line x1="50" y1="0" x2="50" y2="100" stroke="#ffffff10" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff10" />
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ffffff10" strokeDasharray="2 3" />
      </svg>
      {/* handle */}
      <div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow-lg shadow-violet-500/40"
        style={{ left: `${cx}%`, top: `${cy}%` }}
      />
      <span className="pointer-events-none absolute bottom-1 right-2 font-mono text-[8px] text-zinc-600">
        pad
      </span>
    </div>
  );
}
