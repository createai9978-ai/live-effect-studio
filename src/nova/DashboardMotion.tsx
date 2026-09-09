import { useEffect, useRef, useState } from "react";
import motionAsset from "../assets/nova-glass-motion.mp4.asset.json";

export default function DashboardMotion() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (document.hidden) {
        video.pause();
        return;
      }
      void video.play().catch(() => setFailed(true));
    };

    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, []);

  return (
    <div className="nova-motion-backdrop" aria-hidden="true">
      {!failed && (
        <video
          ref={videoRef}
          src={motionAsset.url}
          poster="/images/nova-motion-fallback.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          onError={() => setFailed(true)}
          className="nova-motion-backdrop-video"
        />
      )}
      <div className="nova-motion-backdrop-scrim" />
    </div>
  );
}