import { useEffect, useRef } from "react";
import { Asset, AUDIO_TRACKS, Clip } from "../editor/types";

/** Hidden audio elements that play A1/A2 clips in sync with the timeline clock. */
export default function AudioEngine({
  assets,
  clips,
  time,
  playing,
  audibleTracks,
}: {
  assets: Asset[];
  clips: Clip[];
  time: number;
  playing: boolean;
  audibleTracks: Record<string, boolean>;
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
          <SyncedAudio key={clip.id} clip={clip} url={asset.url} time={time} playing={playing} />
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
}: {
  clip: Clip;
  url: string;
  time: number;
  playing: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);

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
