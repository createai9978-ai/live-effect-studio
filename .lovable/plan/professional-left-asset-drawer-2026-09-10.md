# Professional Left Asset Drawer

## Goal
Make the Media, Text, Transitions, Effects, and Filters area clean, readable, and stable without changing the rest of the editor.

## What will change
- Refine the slim tool rail with consistent spacing, clearer active states, and labels that never clip.
- Rebuild the open asset drawer header around a clear panel title, compact tabs, and a full-width search field.
- Replace the cramped three-column preset grid with a readable two-column layout using larger live previews and properly truncated names.
- Keep the header fixed and scrolling inside the preset area so the timeline and monitor never move.
- Add a short slide/fade transition and restrained hover lift while respecting reduced-motion settings.

## Technical details
- Update the embedded state in `AssetBrowser` without changing the full-screen library.
- Add narrowly scoped rail/drawer classes and responsive rules in the global stylesheet.
- Preserve all existing preset application, favorites, search, preview, import, and close behavior.
- Verify Media, Text, Transitions, Effects, and Filters at desktop and narrow viewport sizes with no overlap or clipping.
