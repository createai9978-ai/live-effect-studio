import { memo, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

const CHANNELS = ["A1", "A2", "A3", "Master"] as const;

/**
 * Vertical multi-channel audio mixer.
 *
 * The meters animate on a single requestAnimationFrame loop that writes
 * `transform: scaleY()` straight to the DOM — no React state per frame, and no
 * layout work, so the mixer stays perfectly smooth during playback while
 * costing the rest of the editor nothing.
 */
function AudioMeters({ playing, hasAudio }: { playing: boolean; hasAudio: boolean }) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const peakRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const peaks = [0, 0, 0, 0];

    const paint = (levels: number[]) => {
      for (let i = 0; i < CHANNELS.length; i++) {
        const v = levels[i] ?? 0;
        peaks[i] = Math.max(peaks[i] * 0.95, v);
        const bar = barRefs.current[i];
        if (bar) bar.style.transform = `scaleY(${v})`;
        const peak = peakRefs.current[i];
        if (peak) {
          peak.style.opacity = peaks[i] > 0.02 ? "1" : "0";
          peak.style.transform = `translate3d(0,${-peaks[i] * 100}%,0)`;
          peak.style.backgroundColor = peaks[i] > 0.9 ? "rgb(251 113 133)" : "rgba(255,255,255,.7)";
        }
        const clip = clipRefs.current[i];
        if (clip) clip.style.opacity = v > 0.9 ? "1" : "0";
      }
      if (readoutRef.current) {
        const master = levels[3] ?? 0;
        readoutRef.current.textContent =
          master > 0 ? `${(-6 + master * 4).toFixed(1)} dB` : "-∞ dB";
      }
    };

    if (!playing || !hasAudio) {
      paint([0, 0, 0, 0]);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      paint(
        CHANNELS.map((_, i) =>
          Math.min(
            1,
            0.42 +
              0.34 * Math.abs(Math.sin(t * (1.6 + i * 0.28) * 1.9 + i)) +
              0.12 * Math.abs(Math.sin(t * (7 + i)))
          )
        )
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, hasAudio]);

  const marks = [0, -6, -12, -18, -24, -36, -48];

  return (
    <aside className="flex h-full w-full min-w-0 flex-col bg-transparent">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
        <span className="text-[12px] font-semibold text-zinc-100">Audio Mixer</span>
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
            <div className="relative w-full flex-1 overflow-hidden rounded-md bg-black/60 ring-1 ring-white/[0.07]">
              <div
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                className="absolute inset-x-0 bottom-0 h-full origin-bottom bg-gradient-to-t from-emerald-500 via-lime-400 to-amber-400 will-change-transform"
                style={{ transform: "scaleY(0)" }}
              />
              <div
                ref={(el) => {
                  clipRefs.current[i] = el;
                }}
                className="absolute top-0 h-1.5 w-full bg-rose-500 opacity-0 transition-opacity duration-150"
              />
              <div
                ref={(el) => {
                  peakRefs.current[i] = el;
                }}
                className="absolute bottom-0 h-[1.5px] w-full opacity-0 will-change-transform"
              />
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
        <div ref={readoutRef} className="font-mono text-[9px] tabular-nums text-zinc-400">
          -∞ dB
        </div>
      </div>
    </aside>
  );
}

/** Memoized: this panel only re-renders when its own props change. */
export default memo(AudioMeters);
