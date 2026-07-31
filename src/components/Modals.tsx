import { useEffect, useState } from "react";
import { Clip, fmtDuration } from "../editor/types";
import { cn } from "../utils/cn";

/* ============================ Shell ============================ */
function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#14161f] shadow-2xl shadow-black/70",
          wide ? "max-w-3xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <span className="text-[12px] font-semibold text-zinc-200">{title}</span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================ Confirm ============================ */
export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <div className="space-y-4 p-4">
        <p className="text-[12px] leading-relaxed text-zinc-400">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] font-medium text-white shadow-md transition hover:brightness-110",
              destructive
                ? "bg-gradient-to-r from-rose-500 to-fuchsia-600 shadow-fuchsia-600/25"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-600/25"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================ Speed / Duration ============================ */
export function SpeedDialog({
  clip,
  onCancel,
  onApply,
}: {
  clip: Clip;
  onCancel: () => void;
  onApply: (speed: number) => void;
}) {
  const [speed, setSpeed] = useState(clip.effects.speed);
  const newDur = clip.duration * (clip.effects.speed / speed);

  return (
    <ModalShell title="Clip Speed / Duration" onClose={onCancel}>
      <div className="space-y-4 p-4">
        <div className="rounded-lg bg-black/30 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-600">Selected clip</div>
          <div className="mt-0.5 text-[11px] text-zinc-200">{clip.id.slice(0, 6)}…</div>
          <div className="mt-1 flex gap-3 text-[10px] text-zinc-500">
            <span>Current speed <span className="font-mono text-zinc-300">{clip.effects.speed.toFixed(1)}%</span></span>
            <span>Duration <span className="font-mono text-zinc-300">{fmtDuration(clip.duration)}</span></span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">
            Speed (%)
          </label>
          <input
            type="number"
            min={10}
            max={400}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Math.max(10, Math.min(400, Number(e.target.value) || 100)))}
            className="w-full rounded-md bg-black/40 px-2 py-1.5 font-mono text-[13px] text-zinc-100 outline-none ring-1 ring-white/[0.06] focus:ring-violet-500/50"
          />
          <input
            type="range"
            min={10}
            max={400}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="mt-2 w-full accent-violet-500"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {[25, 50, 100, 150, 200, 400].map((p) => (
              <button
                key={p}
                onClick={() => setSpeed(p)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-mono transition",
                  Math.abs(speed - p) < 0.5
                    ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200"
                    : "border-white/[0.06] bg-black/30 text-zinc-500 hover:text-zinc-200"
                )}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[10.5px] text-violet-200">
          New timeline duration: <span className="font-mono">{fmtDuration(newDur)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(speed)}
            className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
          >
            Apply
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============================ Export ============================ */
export function ExportModal({
  contentEnd,
  onCancel,
  onExport,
}: {
  contentEnd: number;
  onCancel: () => void;
  onExport: (opts: { preset: string; format: string; resolution: string }) => void;
}) {
  const [preset, setPreset] = useState("YouTube 4K");
  const [format, setFormat] = useState("H.264 (MP4)");
  const [resolution, setResolution] = useState("3840×2160");
  const [progress, setProgress] = useState<number | null>(null);

  const start = () => {
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p === null) return null;
        const next = p + 4 + Math.random() * 6;
        if (next >= 100) {
          clearInterval(id);
          setTimeout(() => onExport({ preset, format, resolution }), 400);
          return 100;
        }
        return next;
      });
    }, 120);
  };

  return (
    <ModalShell title="Export Sequence" onClose={onCancel}>
      <div className="space-y-4 p-4">
        {progress === null ? (
          <>
            <Field label="Preset">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full rounded-md bg-black/40 px-2 py-1.5 text-[11px] text-zinc-100 outline-none ring-1 ring-white/[0.06] focus:ring-violet-500/50"
              >
                {["YouTube 4K", "YouTube 1080p", "Vimeo 4K", "Instagram Reels", "Broadcast ProRes", "Match Source"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Format">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-md bg-black/40 px-2 py-1.5 text-[11px] text-zinc-100 outline-none ring-1 ring-white/[0.06]"
                >
                  {["H.264 (MP4)", "H.265 (HEVC)", "ProRes 422", "DNxHR", "WebM"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Resolution">
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full rounded-md bg-black/40 px-2 py-1.5 text-[11px] text-zinc-100 outline-none ring-1 ring-white/[0.06]"
                >
                  {["3840×2160", "1920×1080", "1280×720", "1080×1920", "2560×1440"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="rounded-lg bg-black/30 px-3 py-2 text-[10.5px] text-zinc-400">
              Sequence duration: <span className="font-mono text-zinc-200">{fmtDuration(contentEnd)}</span>
              {contentEnd < 0.1 && (
                <div className="mt-1 text-fuchsia-300">
                  Nothing to export — add clips to the timeline first.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                onClick={start}
                disabled={contentEnd < 0.1}
                className="rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110 disabled:opacity-40"
              >
                Start Export
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 py-6 text-center">
            <div className="text-[11px] text-zinc-400">
              Encoding <span className="text-zinc-200">{preset}</span> · {format}
            </div>
            <div className="mx-auto h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-zinc-500">{progress.toFixed(0)}%</div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

/* ============================ Effects browser ============================ */
const EFFECTS = [
  { cat: "Video Effects", items: ["Gaussian Blur", "Directional Blur", "Sharpen", "Chromatic Aberration", "Glitch RGB", "VHS Retro", "Film Grain 35mm", "Vignette", "Feather Edge"] },
  { cat: "Video Transitions", items: ["Cross Dissolve", "Dip to Black", "Dip to White", "Wipe", "Slide", "Push", "Cross Zoom"] },
  { cat: "Color", items: ["Lumetri Color", "Teal & Orange", "Cinematic", "Bleach Bypass", "Bleach Cool", "S-Log Restore"] },
  { cat: "Audio Effects", items: ["EQ", "Compressor", "DeEsser", "Reverb Hall", "Delay", "Noise Reduction"] },
  { cat: "Distort", items: ["Warp", "Twirl", "Ripple", "Corner Pin", "Mirror"] },
];

export function EffectsBrowser({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = EFFECTS.map((g) => ({
    ...g,
    items: g.items.filter((n) => n.toLowerCase().includes(q.toLowerCase())),
  })).filter((g) => g.items.length);

  return (
    <ModalShell title="Effects Browser" onClose={onClose} wide>
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex items-center gap-2 rounded-md bg-black/30 px-2 py-1.5 ring-1 ring-white/[0.06] focus-within:ring-violet-500/50">
          <svg className="h-3.5 w-3.5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search effects…"
            className="w-full bg-transparent text-[12px] text-zinc-100 outline-none placeholder-zinc-600"
          />
        </div>
      </div>
      <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-zinc-600">No effects match "{q}"</div>
        ) : (
          filtered.map((g) => (
            <div key={g.cat}>
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
                {g.cat}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {g.items.map((n) => (
                  <button
                    key={n}
                    className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5 text-left text-[10.5px] text-zinc-300 transition hover:border-violet-500/40 hover:text-white"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                    <span className="truncate">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}

/* ============================ Shortcuts / Help ============================ */
const SHORTCUTS: [string, [string, string][]][] = [
  [
    "Playback",
    [
      ["Space", "Play / Pause"],
      ["Home", "Go to sequence start"],
      ["←  →", "Step 1 frame"],
      ["J K L", "Reverse / Pause / Forward"],
    ],
  ],
  [
    "Tools",
    [
      ["V", "Selection"],
      ["A", "Track Select Forward"],
      ["B", "Ripple Edit"],
      ["C", "Razor / Blade"],
      ["Y", "Slip"],
      ["U", "Slide"],
      ["P", "Pen (keyframes)"],
      ["H", "Hand"],
      ["Z", "Zoom"],
    ],
  ],
  [
    "Edit",
    [
      ["Ctrl+Z", "Undo"],
      ["Ctrl+Shift+Z", "Redo"],
      ["Ctrl+X / C / V", "Cut / Copy / Paste"],
      ["Ctrl+A", "Select All"],
      ["Ctrl+K", "Split at Playhead"],
      ["Ctrl+G / Shift+Ctrl+G", "Group / Ungroup"],
      ["Del / Backspace", "Delete selected"],
    ],
  ],
  [
    "File / Project",
    [
      ["Ctrl+Alt+N", "New Project"],
      ["Ctrl+O", "Open Project"],
      ["Ctrl+S", "Save Project"],
      ["Ctrl+I", "Import Media"],
      ["Ctrl+M", "Export Media"],
    ],
  ],
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Keyboard Shortcuts" onClose={onClose} wide>
      <div className="grid max-h-[480px] grid-cols-2 gap-4 overflow-y-auto p-4">
        {SHORTCUTS.map(([group, rows]) => (
          <div key={group}>
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
              {group}
            </div>
            <div className="space-y-1">
              {rows.map(([k, desc]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-2 py-1.5">
                  <span className="text-[10.5px] text-zinc-300">{desc}</span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
                    {k}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

/* ============================ About ============================ */
export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="About NOVA Studio" onClose={onClose}>
      <div className="space-y-3 p-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-xl shadow-violet-500/40">
          <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 9h20M7 5v4M12 5v4M17 5v4M7 15h4" />
          </svg>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-zinc-100">NOVA Studio · Edit</div>
          <div className="text-[10px] text-zinc-500">Non-linear editor · v1.0</div>
        </div>
        <p className="mx-auto max-w-xs text-[10.5px] leading-relaxed text-zinc-500">
          A premium browser-based video editor with Premiere Pro-style workflow,
          dual monitors, Lumetri color grading and per-clip motion controls.
        </p>
      </div>
    </ModalShell>
  );
}

/* ============================ Toast ============================ */
export function Toast({ message, tone = "info" }: { message: string; tone?: "info" | "success" | "error" }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] shadow-2xl shadow-black/50 backdrop-blur",
          tone === "success" && "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
          tone === "error" && "border-rose-500/30 bg-rose-500/15 text-rose-200",
          tone === "info" && "border-violet-500/30 bg-violet-500/15 text-violet-200"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "success" && "bg-emerald-400",
            tone === "error" && "bg-rose-400",
            tone === "info" && "bg-violet-400"
          )}
        />
        {message}
      </div>
    </div>
  );
}
