import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

/** Vertical master audio meters, animated during playback. */
export default function AudioMeters({ playing, hasAudio }: { playing: boolean; hasAudio: boolean }) {
  const [levels, setLevels] = useState<[number, number]>([0, 0]);
  const [peaks, setPeaks] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (!playing || !hasAudio) {
      setLevels([0, 0]);
      return;
    }
    let t = 0;
    const id = setInterval(() => {
      t += 0.09;
      const l = 0.45 + 0.35 * Math.abs(Math.sin(t * 2.1)) + Math.random() * 0.18;
      const r = 0.45 + 0.35 * Math.abs(Math.sin(t * 1.7 + 1)) + Math.random() * 0.18;
      const nl: [number, number] = [Math.min(1, l), Math.min(1, r)];
      setLevels(nl);
      setPeaks((p) => [Math.max(p[0] * 0.96, nl[0]), Math.max(p[1] * 0.96, nl[1])]);
    }, 90);
    return () => clearInterval(id);
  }, [playing, hasAudio]);

  const marks = [0, -6, -12, -18, -24, -36, -48];

  return (
    <aside className="flex w-[72px] shrink-0 flex-col border-l border-white/[0.06] bg-[#181B24]">
      <div className="border-b border-white/[0.05] px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
        Audio
      </div>

      <div className="flex flex-1 justify-center gap-1.5 px-2 py-3">
        {/* scale */}
        <div className="relative flex w-5 flex-col justify-between py-0.5 text-right">
          {marks.map((m) => (
            <span key={m} className="font-mono text-[7px] leading-none text-zinc-600">
              {m}
            </span>
          ))}
        </div>
        {/* channels */}
        {[0, 1].map((ch) => (
          <div key={ch} className="relative w-3 overflow-hidden rounded-sm bg-black/50 ring-1 ring-white/[0.05]">
            <div
              className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 via-emerald-400 to-amber-400 transition-[height] duration-75"
              style={{ height: `${levels[ch] * 100}%` }}
            />
            {levels[ch] > 0.88 && <div className="absolute top-0 h-1.5 w-full bg-rose-500" />}
            {/* peak hold */}
            {peaks[ch] > 0.02 && (
              <div
                className={cn("absolute w-full", peaks[ch] > 0.88 ? "bg-rose-400" : "bg-white/70")}
                style={{ bottom: `${peaks[ch] * 100}%`, height: 1.5 }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.05] px-2 py-2 text-center">
        <div className="font-mono text-[9px] text-zinc-400">
          {playing && hasAudio ? `${(-6 + levels[0] * 4).toFixed(1)} dB` : "-∞ dB"}
        </div>
        <div className="mt-1 text-[8px] text-zinc-700">Master</div>
      </div>
    </aside>
  );
}
