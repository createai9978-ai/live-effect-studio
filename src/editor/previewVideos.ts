/**
 * Live preview clip pool.
 * Every effect/preset card streams a real, silent, seamlessly looping clip
 * instead of a static thumbnail. Clips are short, SD (640x360) and cached by
 * the browser, so the same handful of files powers the entire grid.
 */
const CLIPS = [
  "https://videos.pexels.com/video-files/3129671/3129671-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2098989/2098989-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/3130284/3130284-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/1093662/1093662-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2278095/2278095-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4884233/4884233-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/3571264/3571264-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2611250/2611250-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6774633/6774633-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2098988/2098988-sd_640_360_30fps.mp4",
] as const;

/** Stable hash so a given preset always shows the same clip. */
function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function previewClipFor(id: string): string {
  return CLIPS[hash(id) % CLIPS.length];
}

/** A deterministic in-clip offset makes every preset card begin on a distinct frame. */
export function previewOffsetFor(id: string): number {
  return 0.35 + (hash(`${id}:offset`) % 5200) / 1000;
}

export const PREVIEW_CLIPS = CLIPS;
