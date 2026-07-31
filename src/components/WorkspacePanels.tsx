import { useState } from "react";
import { DragSlider } from "./LumetriPanel";
import { cn } from "../utils/cn";

/* ================= Audio workspace: mixer ================= */
export function AudioMixerPanel() {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-white/[0.06] bg-[#111218]">
      <div className="border-b border-white/[0.05] px-3 py-2 text-[11px] font-semibold text-zinc-200">
        Audio Track Mixer
      </div>
      <div className="flex flex-1 items-stretch justify-center gap-3 overflow-y-auto p-4">
        {["A1", "A2", "A3", "Mix"].map((ch, i) => (
          <ChannelStrip key={ch} name={ch} master={i === 3} />
        ))}
      </div>
      <div className="border-t border-white/[0.05] p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Pan</div>
        <PanKnobs />
      </div>
    </aside>
  );
}

function ChannelStrip({ name, master }: { name: string; master?: boolean }) {
  const [gain, setGain] = useState(0.75); // 0..1 fader position
  const [muted, setMuted] = useState(false);
  const db = gain <= 0.001 ? -Infinity : (gain - 0.75) * 24;

  return (
    <div className="flex w-12 flex-col items-center gap-2">
      <span className={cn("text-[9px] font-bold", master ? "text-fuchsia-400" : "text-emerald-400")}>
        {name}
      </span>
      {/* fader */}
      <div
        className="relative w-8 flex-1 cursor-ns-resize rounded-md bg-black/40 ring-1 ring-white/[0.05]"
        onMouseDown={(e) => {
          const el = e.currentTarget;
          const set = (clientY: number) => {
            const r = el.getBoundingClientRect();
            setGain(Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height)));
          };
          set(e.clientY);
          const move = (ev: MouseEvent) => set(ev.clientY);
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      >
        {/* level fill */}
        <div
          className={cn(
            "absolute bottom-0 w-full rounded-md bg-gradient-to-t",
            muted ? "from-zinc-700 to-zinc-600" : master ? "from-fuchsia-600/60 to-violet-500/50" : "from-emerald-600/50 to-emerald-400/40"
          )}
          style={{ height: `${gain * 100}%` }}
        />
        {/* fader cap */}
        <div
          className="absolute left-1/2 h-2.5 w-9 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/30 bg-zinc-300 shadow"
          style={{ top: `${(1 - gain) * 100}%` }}
        />
      </div>
      <span className="font-mono text-[8px] text-zinc-500">
        {db === -Infinity ? "-∞" : `${db >= 0 ? "+" : ""}${db.toFixed(1)}`}
      </span>
      <button
        onClick={() => setMuted((m) => !m)}
        className={cn(
          "flex h-5 w-8 items-center justify-center rounded text-[8px] font-bold transition",
          muted ? "bg-fuchsia-500/80 text-white" : "bg-white/[0.07] text-zinc-500 hover:text-zinc-200"
        )}
      >
        M
      </button>
    </div>
  );
}

function PanKnobs() {
  return (
    <div className="flex justify-between px-1">
      {["A1", "A2", "A3"].map((ch) => (
        <Knob key={ch} label={ch} />
      ))}
    </div>
  );
}

function Knob({ label }: { label: string }) {
  const [v, setV] = useState(0); // -1..1
  const angle = v * 135;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative h-9 w-9 cursor-ns-resize rounded-full bg-[#1a1c26] ring-1 ring-white/10"
        onMouseDown={(e) => {
          const startY = e.clientY;
          const orig = v;
          const move = (ev: MouseEvent) =>
            setV(Math.min(1, Math.max(-1, orig - (ev.clientY - startY) / 60)));
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
        onDoubleClick={() => setV(0)}
        title={`${label} pan — drag vertically, double-click to center`}
      >
        <div
          className="absolute left-1/2 top-1/2 h-3.5 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded bg-cyan-400"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: "50% 100%" }}
        />
      </div>
      <span className="font-mono text-[8px] text-zinc-600">
        {label} {v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`}
      </span>
    </div>
  );
}

/* ================= Graphics workspace ================= */
type TextLayer = { id: number; text: string; size: number; color: string };

export function GraphicsPanel() {
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [nextId, setNextId] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  const sel = layers.find((l) => l.id === selected) ?? null;
  const update = (patch: Partial<TextLayer>) =>
    setLayers((prev) => prev.map((l) => (l.id === selected ? { ...l, ...patch } : l)));

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-white/[0.06] bg-[#111218]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <span className="text-[11px] font-semibold text-zinc-200">Essential Graphics</span>
        <button
          onClick={() => {
            const l = { id: nextId, text: "New Title", size: 48, color: "#ffffff" };
            setLayers((p) => [...p, l]);
            setSelected(nextId);
            setNextId((n) => n + 1);
          }}
          className="flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1 text-[9.5px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
        >
          + Text
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* layers */}
        <div className="rounded-xl border border-white/[0.07] bg-[#14151d] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Layers</div>
          {layers.length === 0 ? (
            <div className="text-[10px] text-zinc-600">No graphic layers. Click “+ Text” to add a title.</div>
          ) : (
            <div className="space-y-1">
              {layers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelected(l.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10.5px] transition",
                    selected === l.id
                      ? "bg-violet-500/15 text-violet-200"
                      : "text-zinc-400 hover:bg-white/[0.04]"
                  )}
                >
                  <span className="font-mono text-[9px] text-zinc-600">T</span>
                  <span className="truncate">{l.text}</span>
                  <span
                    className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: l.color }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* edit */}
        {sel && (
          <div className="rounded-xl border border-white/[0.07] bg-[#14151d] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Edit Text</div>
            <input
              value={sel.text}
              onChange={(e) => update({ text: e.target.value })}
              className="mb-2.5 w-full rounded-md bg-black/30 px-2 py-1.5 text-[11px] text-zinc-200 outline-none ring-1 ring-white/[0.06] focus:ring-violet-500/50"
            />
            <div className="space-y-2.5">
              <DragSlider
                label="Font size"
                value={sel.size}
                display={`${Math.round(sel.size)}px`}
                min={12}
                max={144}
                onChange={(v) => update({ size: v })}
              />
              <div>
                <div className="mb-1.5 text-[10px] text-zinc-500">Fill color</div>
                <div className="flex gap-1.5">
                  {["#ffffff", "#22d3ee", "#a78bfa", "#e879f9", "#fbbf24", "#34d399"].map((c) => (
                    <button
                      key={c}
                      onClick={() => update({ color: c })}
                      className={cn(
                        "h-5 w-5 rounded-full ring-2 transition",
                        sel.color === c ? "ring-white" : "ring-transparent hover:ring-white/40"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* preview */}
            <div className="mt-3 flex h-16 items-center justify-center overflow-hidden rounded-md bg-black/50">
              <span
                className="max-w-full truncate px-2 font-semibold"
                style={{ color: sel.color, fontSize: Math.min(28, sel.size / 3 + 8) }}
              >
                {sel.text || "Title"}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
