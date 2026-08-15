import { useMemo, useState } from "react";
import { cn } from "../utils/cn";

/**
 * Interactive hero preview canvas + floating Quick FX Customizer.
 *
 * A live looping clip is graded in real time from four sliders (Intensity,
 * Contrast, Temperature, Tint) plus a row of one-click look presets, so the
 * landing screen reacts instantly to every interaction.
 */

const HERO_CLIP = "https://videos.pexels.com/video-files/3129671/3129671-sd_640_360_30fps.mp4";

type Look = { id: string; label: string; intensity: number; contrast: number; temp: number; tint: number };

const LOOKS: Look[] = [
  { id: "neutral", label: "Neutral", intensity: 50, contrast: 50, temp: 50, tint: 50 },
  { id: "teal-orange", label: "Teal & Orange", intensity: 72, contrast: 64, temp: 66, tint: 40 },
  { id: "nolan", label: "Nolan Steel", intensity: 60, contrast: 78, temp: 34, tint: 46 },
  { id: "neon", label: "Blade Neon", intensity: 84, contrast: 70, temp: 26, tint: 72 },
  { id: "mono", label: "Ash Mono", intensity: 10, contrast: 74, temp: 50, tint: 50 },
];

export default function HeroPreview() {
  const [look, setLook] = useState<Look>(LOOKS[1]);
  const [intensity, setIntensity] = useState(look.intensity);
  const [contrast, setContrast] = useState(look.contrast);
  const [temp, setTemp] = useState(look.temp);
  const [tint, setTint] = useState(look.tint);

  const applyLook = (l: Look) => {
    setLook(l);
    setIntensity(l.intensity);
    setContrast(l.contrast);
    setTemp(l.temp);
    setTint(l.tint);
  };

  const filter = useMemo(() => {
    const sat = 0.4 + (intensity / 100) * 1.4;
    const con = 0.7 + (contrast / 100) * 0.8;
    const hue = (temp - 50) * 0.36 + (tint - 50) * -0.24;
    const sepia = Math.max(0, (temp - 50) / 180);
    const bright = 0.92 + (intensity / 100) * 0.2;
    return `saturate(${sat.toFixed(2)}) contrast(${con.toFixed(2)}) hue-rotate(${hue.toFixed(1)}deg) sepia(${sepia.toFixed(2)}) brightness(${bright.toFixed(2)})`;
  }, [intensity, contrast, temp, tint]);

  return (
    <div className="nova-rise relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141824] shadow-2xl shadow-black/40 transition-shadow duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_30px_80px_-30px_rgba(0,229,255,0.45)]">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          src={HERO_CLIP}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover transform-gpu transition-[filter] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ filter, animation: "nova-ken-burns 22s var(--ease-drift) infinite alternate" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-[#8DF3FF] ring-1 ring-[#00E5FF]/30 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px] shadow-[#00E5FF]/80" />
            LIVE PREVIEW
          </span>
          <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-zinc-300 ring-1 ring-white/10 backdrop-blur">
            {look.label}
          </span>
        </div>

        {/* Floating Quick FX Customizer */}
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/45 p-3 backdrop-blur-xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[9.5px] uppercase tracking-widest text-zinc-500">Quick FX</span>
            {LOOKS.map((l) => (
              <button
                key={l.id}
                onClick={() => applyLook(l)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10.5px] transition-all duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-px",
                  look.id === l.id
                    ? "bg-gradient-to-r from-[#00E5FF]/25 to-[#8A2BE2]/30 text-white ring-1 ring-[#00E5FF]/40"
                    : "bg-white/[0.05] text-zinc-400 ring-1 ring-white/[0.06] hover:bg-white/[0.1] hover:text-zinc-100"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Slider label="Intensity" value={intensity} onChange={setIntensity} />
            <Slider label="Contrast" value={contrast} onChange={setContrast} />
            <Slider label="Temperature" value={temp} onChange={setTemp} />
            <Slider label="Tint" value={tint} onChange={setTint} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[9.5px] uppercase tracking-wide text-zinc-400">
        {label}
        <span className="font-mono text-[9.5px] text-[#8DF3FF]">{Math.round(value)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </label>
  );
}
