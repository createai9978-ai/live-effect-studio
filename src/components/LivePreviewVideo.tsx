import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { VideoProcessor, type EffectParams } from "../editor/VideoProcessor";

/**
 * LivePreviewVideo — an always-on, muted, seamlessly looping video preview
 * used in place of static thumbnails on every effect/preset card.
 *
 * Performance rules:
 *  - the <video> element only mounts once the card scrolls into view
 *  - playback pauses the moment the card leaves the viewport
 *  - hovering restarts playback instantly at full rate
 *  - the element fades in only after the first decoded frame, so there is no
 *    flash of an undecoded (blue/black) buffer
 */
export default function LivePreviewVideo({
  src,
  hovered,
  className,
  style,
  animateClass,
  effect,
  startOffset = 0,
}: {
  src: string;
  hovered: boolean;
  className?: string;
  style?: React.CSSProperties;
  animateClass?: string;
  effect?: EffectParams;
  startOffset?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processorRef = useRef<VideoProcessor | null>(null);
  const [effectReady, setEffectReady] = useState(false);

  // Mount / unmount playback based on viewport visibility.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "220px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep the element playing while visible, paused while off-screen.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      v.playbackRate = hovered ? 1 : 0.75;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, [inView, hovered]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!hovered || !effect || !video || !canvas || video.readyState < 2) {
      processorRef.current?.dispose();
      processorRef.current = null;
      setEffectReady(false);
      return;
    }
    const processor = new VideoProcessor();
    if (!processor.init(canvas, video)) return;
    processor.setEffects([effect]);
    processor.start(() => setEffectReady(true));
    processorRef.current = processor;
    return () => {
      processor.dispose();
      processorRef.current = null;
    };
  }, [hovered, effect]);

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      {inView && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          onLoadedData={(e) => {
            e.currentTarget.playbackRate = hovered ? 1 : 0.75;
            if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > startOffset) {
              e.currentTarget.currentTime = startOffset;
            }
            setReady(true);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            "transform-gpu [backface-visibility:hidden] [transform:translateZ(0)]",
            "transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            ready ? "opacity-100" : "opacity-0",
            hovered ? "scale-[1.08]" : "scale-100",
            animateClass
          )}
          style={style}
        />
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-150",
          hovered && effectReady ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Neutral loading surface — deliberately colourless so no tint can bleed through */}
      {!ready && (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#111218_0%,#191b24_45%,#111218_90%)]" />
      )}
    </div>
  );
}
