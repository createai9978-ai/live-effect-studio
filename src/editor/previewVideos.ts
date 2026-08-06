/**
 * Live preview clip pool.
 *
 * Every effect/preset card streams a real, silent, seamlessly looping clip
 * instead of a static thumbnail. The pool is deliberately large (90+ distinct
 * source clips, SD 640x360) so that no two presets in a category end up
 * showing the same footage. On top of the clip choice, each preset also gets a
 * deterministic in-clip start offset, so even the rare pair that lands on the
 * same source file opens on a completely different scene/frame.
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
  "https://videos.pexels.com/video-files/4535130/4535130-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/3173395/3173395-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6902796/6902796-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6485488/6485488-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6800546/6800546-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8275902/8275902-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5353645/5353645-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2692203/2692203-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2671676/2671676-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8207128/8207128-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2450252/2450252-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4670061/4670061-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/9282273/9282273-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8385174/8385174-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6582704/6582704-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4957266/4957266-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8052451/8052451-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4992566/4992566-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7113966/7113966-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/9213087/9213087-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5135408/5135408-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4149546/4149546-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4976697/4976697-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5182601/5182601-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/3982745/3982745-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5742758/5742758-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8815503/8815503-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7137954/7137954-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6771546/6771546-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7222936/7222936-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6993160/6993160-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/9134755/9134755-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5359618/5359618-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5541978/5541978-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/9215639/9215639-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6529488/6529488-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6359697/6359697-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5499001/5499001-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5353235/5353235-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6698667/6698667-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5189732/5189732-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7534977/7534977-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7303010/7303010-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7106318/7106318-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8955418/8955418-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8986477/8986477-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4383190/4383190-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5975782/5975782-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5551585/5551585-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8498497/8498497-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5609111/5609111-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8841919/8841919-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4782595/4782595-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8574317/8574317-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7863710/7863710-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5580050/5580050-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7651612/7651612-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6033353/6033353-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5529329/5529329-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2060968/2060968-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7430750/7430750-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5286379/5286379-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7867563/7867563-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/3144722/3144722-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6859080/6859080-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/4649966/4649966-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2712105/2712105-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7539618/7539618-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8576487/8576487-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/9281842/9281842-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7875133/7875133-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8672373/8672373-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8789677/8789677-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6062790/6062790-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7809666/7809666-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7314191/7314191-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6259234/6259234-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5122483/5122483-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7031147/7031147-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8293512/8293512-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/1786828/1786828-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/6158048/6158048-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8981752/8981752-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/8201355/8201355-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/7684814/7684814-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/5431344/5431344-sd_640_360_30fps.mp4",
  "https://videos.pexels.com/video-files/2637003/2637003-sd_640_360_30fps.mp4",
] as const;

/** Stable 32-bit hash so a given preset always resolves to the same media. */
function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Registry that guarantees globally distinct (clip, offset) pairs.
 * The first time a preset id is seen we walk the clip pool from its hashed
 * home slot until we find the least-used clip, so a grid of N presets spreads
 * evenly across the pool instead of clustering on a handful of files.
 */
const usage = new Array<number>(CLIPS.length).fill(0);
const assigned = new Map<string, { clip: string; offset: number }>();

function assign(id: string) {
  const cached = assigned.get(id);
  if (cached) return cached;

  const h = hash(id);
  const home = h % CLIPS.length;
  let best = home;
  for (let step = 0; step < CLIPS.length; step += 1) {
    const idx = (home + step) % CLIPS.length;
    if (usage[idx]! < usage[best]!) best = idx;
    if (usage[best] === 0) break;
  }
  const round = usage[best]!;
  usage[best] = round + 1;

  // Distinct opening frame per preset: hashed offset, pushed further into the
  // clip on each reuse round so repeats never open on the same scene.
  const offset = 0.4 + round * 3.1 + ((h >>> 8) % 2600) / 1000;
  const entry = { clip: CLIPS[best]!, offset: Number(offset.toFixed(3)) };
  assigned.set(id, entry);
  return entry;
}

export function previewClipFor(id: string): string {
  const { clip, offset } = assign(id);
  // Media fragment gives every preset a unique URL + opening frame.
  return `${clip}#t=${offset.toFixed(3)}`;
}

/** Deterministic in-clip offset so every preset card begins on a distinct frame. */
export function previewOffsetFor(id: string): number {
  return assign(id).offset;
}

export const PREVIEW_CLIPS = CLIPS;
