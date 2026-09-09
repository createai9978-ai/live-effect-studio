import { useEffect, useRef } from "react";

const MOTION_VIDEO = "/video/nova-glass-motion.mp4";

export default function DashboardMotion() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (document.hidden) {
        video.pause();
        return;
      }
      void video.play().catch(() => {});
    };

    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, []);

  return (
    <div className="nova-motion-backdrop" aria-hidden="true">
      <video
        ref={videoRef}
        src={MOTION_VIDEO}
        poster="/images/nova-motion-fallback.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        className="nova-motion-backdrop-video"
      />
      <div className="nova-motion-backdrop-scrim" />
    </div>
  );
}