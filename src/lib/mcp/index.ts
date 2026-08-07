import { defineMcp } from "@lovable.dev/mcp-js";
import getPreset from "./tools/get-preset";
import listCategories from "./tools/list-categories";
import searchPresets from "./tools/search-presets";

export default defineMcp({
  name: "effect-studio-pro",
  title: "Effect Studio Pro",
  version: "0.1.0",
  instructions:
    "Read-only tools over the Effect Studio Pro video-effect catalog. Use `list_categories` to see the category tree, `search_presets` to find effects, filters, transitions, titles, stickers, templates, stock media or audio by keyword or tag, and `get_preset` for the render engine, GPU primitive and motion signature of a specific preset.",
  tools: [listCategories, searchPresets, getPreset],
});
