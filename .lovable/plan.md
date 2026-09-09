# Nebula Glass Studio Dashboard

## Goal
Rebuild the dashboard foreground around the selected Nebula glass studio direction while keeping the existing cinematic motion video as the full-screen background.

## What will change
- Replace the conventional sidebar-and-grid composition with an asymmetric floating studio: slim icon rail, compact control header, dominant live preview stage, offset quick-tool stack, and staggered lower project deck.
- Preserve the existing NOVA branding, portfolio sections, aspect-ratio choices, account state, project actions, local projects, live video player, Quick FX looks, sliders, and admin control.
- Make navigation and portfolio tabs visibly stateful, with animated active indicators and tactile press/hover behavior.
- Route tool cards and recommended actions into working editor entry points instead of leaving decorative controls.
- Add lightweight glass dialogs for portfolio sections and non-project dashboard destinations, with close and keyboard behavior.
- Keep all surfaces translucent so the existing local motion video remains visible through multiple layers of blur and tint.

## Visual system
- Palette: Spectral Carbon — `#080A10`, `#171B26`, cyan `#00E5FF`, ultraviolet `#B45CFF`.
- Typography: Space Grotesk for display text and DM Sans for interface text.
- Composition: selected Nebula direction, adapted to NOVA’s real controls and content rather than its placeholder copy.
- Effects: thin iridescent borders, restrained cyan/violet glow, nested optical-glass depth, spring-like hover lift, and subtle animated status signals.

## Technical details
- Refactor `HomeScreen` into focused dashboard regions and add local state for active navigation and lightweight dialogs.
- Restyle `HeroPreview` to match the dominant stage while retaining play, pause, restart, mute, seek, look presets, and grading sliders.
- Extend semantic NOVA tokens and dashboard classes in the global stylesheet; load the selected fonts through the root document head.
- Use responsive CSS grid areas so the asymmetric desktop layout collapses into an ordered narrow layout without overlap or page scrolling bugs.
- Validate all primary interactions, media playback, slider updates, modal opening/closing, desktop layout, and narrow layout in the live preview.
