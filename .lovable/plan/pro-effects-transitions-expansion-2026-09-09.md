# Pro Effects & Transitions Expansion

Bring the asset library and effect controls up to Filmora / Premiere / CapCut level, using the existing card grid, live previews and control panel — no layout changes.

## 1. Transitions library

New sub-categories added next to the existing Trending / Fade / Zoom / Slides:

- **3D Motion** — cube spin, card flip, box tumble, door swing, prism rotate
- **Cinematic Camera** — zoom in/out punch, camera pan light leak, whip pan, dolly push, parallax slide
- **Digital / Glitch** — RGB split tear, datamosh, signal distortion, pixel sort, warp shatter
- **Film Burn & Flare** — film burn, light leak sweep, lens flare wipe, halation bloom
- **Seamless Wipes** — linear/clock/iris/barn-door/gradient wipes and dissolve patterns

Each preset gets a unique seeded render program, so previews and applied results differ per item.

## 2. Video effects & filters

- **Camera & Motion** — camera shake variants, motion blur, random flicker, strobe, rolling shutter
- **Optics** — Gaussian, zoom/radial, directional and tilt-shift blurs plus a real sharpening set
- **Retro** — extend VHS / CRT / old-film grain sets with more distinct looks
- Cinematic grading LUT sets stay where they are, with additional mood packs

## 3. Text & motion graphics

- **Kinetic Typography** — word-pop, typewriter, bounce-in, split-reveal, glitch text
- **Intro Openers & Credit Rolls** — title cards, end cards, scrolling credits
- **Social Pop-ups** (stickers) — subscribe button, like burst, notification bell, follower counter, comment bubble

## 4. Animation & keyframing controls

Keyframing for Position / Scale / Rotation / Opacity with bezier curves already exists in the motion panel; this adds the missing tool families to the effect control panel so their presets expose real parameters:

- **Chroma Key** — key colour, tolerance, edge feather, spill suppression, edge shrink
- **Picture-in-Picture** — size, X/Y offset, corner radius, border, shadow, opacity
- **Motion / Mask Tracking** — track target, search radius, smoothing, mask feather, offsets
- **Sharpen & Detail** — amount, radius, edge threshold, denoise
- **Flicker / Strobe** — rate, depth, randomness, blend

Each family gets four ready presets and a live CSS preview mapping, matching how the existing families work.

## Technical notes

- `src/editor/assetLibrary.ts` — new `makeSet` packs, wired into `LIB_TREES` (transitions, titles, stickers) and `EFFECTS_TREE`, with the existing global de-duplication guaranteeing unique names/ids.
- `src/editor/effectParams.ts` — new `EffectFamily` members (`chroma`, `pip`, `tracking`, `sharpen`, `flicker`) with schemas, presets, `familyFor` keyword routing and `paramsToVisual` cases.
- `src/editor/effectRuntime.ts` — keyword routing for new names onto existing GPU primitives (`gaussianBlur`, `directionalBlur`, `rgbSplit`, `cameraShake`, `sharpen`, `glow`, `transitionWarp`, `rotoscope`).
- Asset browser, effect control panel and timeline stay as-is; new content flows through existing components.
