# Live Glass Dashboard Motion Layer

## Direction
Create a restrained cinematic motion system behind the existing dashboard without changing its structure. Use a locally stored, seamless abstract fluid-light loop in deep graphite, cyan, and violet, with slow parallax and soft highlights that remain visible through translucent surfaces.

## What will change
- Add one full-dashboard background video layer beneath all content, with a static visual fallback and reduced-motion handling.
- Upgrade the sidebar, top bar, portfolio card, quick tools, recommendation items, and project area into consistent frosted surfaces with semi-transparent fills, subtle borders, and controlled glow.
- Preserve text contrast and click behavior by adding tonal scrims where motion passes behind controls.
- Upgrade the existing preview player with native play/pause, mute, restart, timeline progress, and current-time display while retaining looping playback and live look controls.
- Keep the current dashboard layout, dimensions, labels, navigation, and project actions unchanged.

## Motion and performance
- Use a single composited background video instead of many competing loops.
- Pause playback when the page is hidden and avoid expensive continuous blur/filter animation.
- Keep animation to transform and opacity where possible; respect `prefers-reduced-motion`.
- Use local media assets so the dashboard does not depend on an external video host.

## Validation
- Verify the dashboard at desktop and the current narrow viewport with no overlap or clipped controls.
- Test all video controls, quick FX buttons, sidebar actions, and project actions.
- Confirm successful build, no runtime errors, and smooth fallback behavior if video playback is unavailable.

## Technical details
- Add a focused background media component and enhance `HeroPreview` with React-controlled playback state.
- Apply reusable glass surface classes in the global style system rather than duplicating effects.
- Generate or package the loop under the project’s local public assets and preload only required metadata/media.
