import { useEffect, useRef } from "react";
import { Asset, AUDIO_TRACKS, Clip } from "../editor/types";

/** Hidden audio elements that play A1/A2 clips in sync with the timeline clock. */
export default function AudioEngine({
  assets,
  clips,
  time,
  playing,
  audibleTracks,
  onLevel,
}: {
  assets: Asset[];
  clips: Clip[];
  time: number;
  playing: boolean;
  audibleTracks: Record<string, boolean>;
  onLevel?: (level: number) => void;
}) {
  const active = clips.filter(
    (c) =>
      AUDIO_TRACKS.includes(c.track) &&
      audibleTracks[c.track] &&
      time >= c.start &&
      time < c.start + c.duration
  );

  return (
    <div className="hidden">
      {active.map((clip) => {
        const asset = assets.find((a) => a.id === clip.assetId);
        if (!asset) return null;
        return (
            <SyncedAudio key={clip.id} clip={clip} url={asset.url} time={time} playing={playing} onLevel={onLevel} />
        );
      })}
    </div>
  );
}

function SyncedAudio({
  clip,
  url,
  time,
  playing,
  onLevel,
}: {
  clip: Clip;
  url: string;
  time: number;
  playing: boolean;
  onLevel?: (level: number) => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const analysisRef = useRef<{ context: AudioContext; analyser: AnalyserNode; raf: number } | null>(null);

  // play / pause
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing]);

  // drift correction / scrub sync
  useEffect(() => {
    const el = ref.current;
    if (!el || el.readyState < 1) return;
    const target = Math.max(0, time - clip.start + clip.offset);
    if (!playing || Math.abs(el.currentTime - target) > 0.35) {
      try {
        el.currentTime = target;
      } catch {
        /* not seekable yet */
      }
    }
  }, [time, playing, clip.start, clip.offset]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onLevel || !playing) return;
    const AudioContextCtor = window.AudioContext;
    const context = new AudioContextCtor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaElementSource(el);
    source.connect(analyser);
    analyser.connect(context.destination);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const sample = () => {
      analyser.getByteFrequencyData(bins);
      const energy = bins.reduce((sum, value) => sum + value, 0) / Math.max(1, bins.length * 255);
      onLevel(Math.min(1, energy * 2.8));
      raf = requestAnimationFrame(sample);
    };
    sample();
    analysisRef.current = { context, analyser, raf };
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      analyser.disconnect();
      void context.close();
      analysisRef.current = null;
      onLevel(0);
    };
  }, [playing, onLevel]);

  return (
    <audio
      ref={ref}
      src={url}
      preload="auto"
      onLoadedMetadata={(e) => {
        const el = e.currentTarget;
        el.currentTime = Math.max(0, time - clip.start + clip.offset);
        if (playing) el.play().catch(() => {});
      }}
    />
  );
}
