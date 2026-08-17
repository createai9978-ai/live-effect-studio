import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

const CHANNELS = ["A1", "A2", "A3", "Master"] as const;

/** Vertical multi-channel audio mixer, animated during playback. */
export default function AudioMeters({ playing, hasAudio }: { playing: boolean; hasAudio: boolean }) {
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0]);
  const [peaks, setPeaks] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    if (!playing || !hasAudio) {
      setLevels([0, 0, 0, 0]);
      return;
    }
    let t = 0;
    const id = setInterval(() => {
      t += 0.09;
      const next = CHANNELS.map((_, i) =>
        Math.min(1, 0.42 + 0.34 * Math.abs(Math.sin(t * (1.6 + i * 0.28) + i)) + Math.random() * 0.16)
      );
      setLevels(next);
      setPeaks((p) => next.map((v, i) => Math.max((p[i] ?? 0) * 0.95, v)));
    }, 90);
    return () => clearInterval(id);
  }, [playing, hasAudio]);

  const marks = [0, -6, -12, -18, -24, -36, -48];

  return (
    <aside className="flex w-[188px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0B0F19]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <span className="text-[11px] font-semibold text-zinc-200">Audio Mixer</span>
        <span className="text-[9px] uppercase tracking-widest text-zinc-600">dB</span>
      </div>

      <div className="flex flex-1 justify-center gap-2 px-3 py-3">
        {/* scale */}
        <div className="flex w-5 flex-col justify-between py-0.5 text-right">
          {marks.map((m) => (
            <span key={m} className="font-mono text-[7.5px] leading-none text-zinc-600">
              {m}
            </span>
          ))}
        </div>

        {CHANNELS.map((ch, i) => (
          <div key={ch} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative w-full flex-1 overflow-hidden rounded-sm bg-black/55 ring-1 ring-white/[0.05]">
              <div
                className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 via-lime-400 to-amber-400 transition-[height] duration-75"
                style={{ height: `${levels[i] * 100}%` }}
              />
              {levels[i] > 0.9 && <div className="absolute top-0 h-1.5 w-full bg-rose-500" />}
              {peaks[i] > 0.02 && (
                <div
                  className={cn("absolute w-full", peaks[i] > 0.9 ? "bg-rose-400" : "bg-white/70")}
                  style={{ bottom: `${peaks[i] * 100}%`, height: 1.5 }}
                />
              )}
            </div>
            <span
              className={cn(
                "text-[9px] font-medium",
                ch === "Master" ? "text-[#00F0FF]" : "text-zinc-400"
              )}
            >
              {ch}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.05] px-3 py-2 text-center">
        <div className="font-mono text-[9px] text-zinc-400">
          {playing && hasAudio ? `${(-6 + levels[3] * 4).toFixed(1)} dB` : "-∞ dB"}
        </div>
      </div>
    </aside>
  );
}
