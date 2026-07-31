import { useEffect, useRef, useState } from "react";
import { Asset, fmtDuration, toTimecode, waveformBars } from "../editor/types";
import { cn } from "../utils/cn";

type Props = {
  asset: Asset | null;
  onInsert: (assetId: string, offset: number, duration: number) => void;
};

/** Premiere-style Source Monitor: preview raw clips, mark In/Out, insert or drag the trimmed range. */
export default function SourceMonitor({ asset, onInsert }: Props) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [inPt, setInPt] = useState(0);
  const [outPt, setOutPt] = useState(0);

  const dur = asset?.duration ?? 0;

  // reset on new asset
  useEffect(() => {
    setT(0);
    setPlaying(false);
    setInPt(0);
    setOutPt(asset?.duration ?? 0);
  }, [asset?.id]);

  // stop at Out point during playback
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing, asset?.id]);

  const seekTo = (nt: number) => {
    const clamped = Math.min(dur, Math.max(0, nt));
    setT(clamped);
    const el = mediaRef.current;
    if (el && el.readyState >= 1) {
      try {
        el.currentTime = clamped;
      } catch {
        /* ignore */
      }
    }
  };

  const scrub = (e: React.MouseEvent) => {
    const el = barRef.current;
    if (!el || !dur) return;
    const set = (clientX: number) => {
      const r = el.getBoundingClientRect();
      seekTo(((clientX - r.left) / r.width) * dur);
    };
    set(e.clientX);
    const move = (ev: MouseEvent) => set(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const trimDur = Math.max(0.1, outPt - inPt);

  if (!asset) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 bg-black p-6 text-center">
        <svg className="h-10 w-10 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M10 9l5 3-5 3V9z" />
        </svg>
        <div className="text-[12px] text-zinc-600">No clip open in Source</div>
        <div className="max-w-[220px] text-[10px] leading-relaxed text-zinc-700">
          Double-click a clip in the Project panel to open it here for previewing and trimming
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Viewer */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-3">
        <div className="relative aspect-video max-h-full w-full overflow-hidden rounded-md bg-[#07080c] ring-1 ring-white/[0.07]">
          {asset.kind === "video" ? (
            <video
              key={asset.id}
              ref={mediaRef}
              src={asset.url}
              playsInline
              preload="auto"
              className="h-full w-full object-contain"
              onTimeUpdate={(e) => {
                const ct = e.currentTarget.currentTime;
                setT(ct);
                if (playing && ct >= outPt - 0.03) {
                  e.currentTarget.pause();
                  setPlaying(false);
                }
              }}
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
              <div className="flex h-16 w-full items-end gap-px">
                {waveformBars(asset.id, 64).map((v, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-sm",
                      (i / 64) * dur >= inPt && (i / 64) * dur <= outPt
                        ? "bg-emerald-400/70"
                        : "bg-emerald-400/20"
                    )}
                    style={{ height: `${v * 100}%` }}
                  />
                ))}
              </div>
              {/* hidden audio element reusing the same ref shape */}
              <video
                key={asset.id}
                ref={mediaRef}
                src={asset.url}
                preload="auto"
                className="hidden"
                onTimeUpdate={(e) => {
                  const ct = e.currentTarget.currentTime;
                  setT(ct);
                  if (playing && ct >= outPt - 0.03) {
                    e.currentTarget.pause();
                    setPlaying(false);
                  }
                }}
                onEnded={() => setPlaying(false)}
              />
              <div className="font-mono text-[10px] text-emerald-300/70">AUDIO SOURCE</div>
            </div>
          )}

          <div className="pointer-events-none absolute left-2.5 top-2 font-mono text-[9.5px] text-white/70 drop-shadow">
            {toTimecode(t)}
          </div>
          <div className="pointer-events-none absolute right-2.5 top-2 max-w-[50%] truncate rounded bg-black/50 px-1.5 py-0.5 font-mono text-[8.5px] text-white/70">
            {asset.name}
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2.5 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[8.5px] text-violet-300">
            I/O {fmtDuration(trimDur)}
          </div>
        </div>
      </div>

      {/* Trim bar */}
      <div className="px-3 pb-1">
        <div ref={barRef} className="group relative h-6 cursor-col-resize" onMouseDown={scrub}>
          {/* base track */}
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/[0.07]" />
          {/* in/out range */}
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80"
            style={{
              left: `${(inPt / dur) * 100}%`,
              width: `${((outPt - inPt) / dur) * 100}%`,
            }}
          />
          {/* in marker */}
          <div
            className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-sm bg-violet-300"
            style={{ left: `calc(${(inPt / dur) * 100}% - 2px)` }}
            title={`In: ${toTimecode(inPt)}`}
          />
          {/* out marker */}
          <div
            className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-sm bg-fuchsia-300"
            style={{ left: `calc(${(outPt / dur) * 100}% - 2px)` }}
            title={`Out: ${toTimecode(outPt)}`}
          />
          {/* playhead */}
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400/70"
            style={{ left: `${(t / dur) * 100}%` }}
          >
            <div className="absolute top-0 left-1/2 h-1.5 w-2.5 -translate-x-1/2 rounded-b-sm bg-cyan-400" />
          </div>
        </div>
      </div>

      {/* Transport + trim controls */}
      <div className="flex items-center gap-1 border-t border-white/[0.05] px-3 py-1.5">
        <span className="mr-1 font-mono text-[10px] text-cyan-300">{toTimecode(t)}</span>

        <button
          title="Mark In (at playhead)"
          onClick={() => setInPt(Math.min(t, outPt - 0.1))}
          className="flex h-6 items-center rounded-md bg-violet-500/15 px-1.5 font-mono text-[10px] font-bold text-violet-300 transition hover:bg-violet-500/30"
        >
          {"{"}
        </button>
        <button
          title="Mark Out (at playhead)"
          onClick={() => setOutPt(Math.max(t, inPt + 0.1))}
          className="flex h-6 items-center rounded-md bg-fuchsia-500/15 px-1.5 font-mono text-[10px] font-bold text-fuchsia-300 transition hover:bg-fuchsia-500/30"
        >
          {"}"}
        </button>

        <div className="mx-auto flex items-center gap-0.5">
          <MiniBtn title="Go to In" onClick={() => seekTo(inPt)}>
            <path d="M6 5v14M20 5l-10 7 10 7V5z" />
          </MiniBtn>
          <MiniBtn title="Step back" onClick={() => seekTo(t - 1 / 30)}>
            <path d="M15 6l-6 6 6 6" />
          </MiniBtn>
          <button
            onClick={() => {
              if (!playing && t >= outPt - 0.05) seekTo(inPt);
              setPlaying((p) => !p);
            }}
            className="mx-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30 transition hover:brightness-110"
            title="Play In→Out"
          >
            {playing ? (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg className="ml-0.5 h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>
            )}
          </button>
          <MiniBtn title="Step forward" onClick={() => seekTo(t + 1 / 30)}>
            <path d="M9 6l6 6-6 6" />
          </MiniBtn>
          <MiniBtn title="Go to Out" onClick={() => seekTo(outPt)}>
            <path d="M18 5v14M4 5l10 7-10 7V5z" />
          </MiniBtn>
        </div>

        {/* Insert + drag */}
        <button
          onClick={() => onInsert(asset.id, inPt, trimDur)}
          title={`Insert trimmed clip (${fmtDuration(trimDur)}) at the timeline playhead`}
          className="flex h-6 items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 text-[9.5px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M12 19l-4-4M12 19l4-4" />
          </svg>
          Insert
        </button>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(
              "application/x-nova-asset",
              JSON.stringify({ assetId: asset.id, offset: inPt, duration: trimDur })
            );
            e.dataTransfer.setData("text/plain", asset.id);
            e.dataTransfer.effectAllowed = "copy";
          }}
          title="Drag the trimmed In→Out range to a timeline track"
          className="flex h-6 cursor-grab items-center rounded-md border border-white/[0.1] px-1.5 text-zinc-400 transition hover:border-violet-500/50 hover:text-violet-300 active:cursor-grabbing"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" />
            <circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" />
            <circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MiniBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[0.07] hover:text-zinc-100"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
