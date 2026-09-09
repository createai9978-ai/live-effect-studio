# Cohesive Prism Studio Theme

## Goal
Make the portfolio dashboard and editing workspace feel like one product by carrying the same deep cinematic blue, cyan-lit glass system into the full editor without changing editing behavior.

## What will change
- Extend the dashboard’s deep-blue, frosted-glass, cyan/iridescent border tokens into the editor shell, top bar, menus, tool rail, media panel, monitors, inspector, timeline, mixer, dialogs, and floating panels.
- Replace conflicting violet/fuchsia-heavy editor accents with the shared cyan and restrained spectral-blue hierarchy.
- Refine panel spacing, separators, clipping, and internal scrolling so the fixed Media / Monitor / Inspector / Timeline structure stays clean and overlap-free.
- Standardize active, hover, pressed, focus, disabled, slider, scrollbar, and resize states for a smoother premium feel.
- Preserve all existing buttons, menus, tools, docking, resizing, media import, playback, timeline editing, effects, workspaces, and export behavior.

## Technical details
- Add shared semantic editor theme tokens and scoped overrides in the global stylesheet, reusing the dashboard palette and glass recipes.
- Apply small structural class updates only where needed in the editor shell and top controls; no business logic changes.
- Keep the viewport locked, use internal panel scrolling, and retain the persisted dock sizing system.
- Validate opening a project, menu and workspace switching, asset drawer, sliders, playback, timeline controls, docking/resizing, and desktop/narrow viewport containment.
