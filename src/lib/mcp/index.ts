import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getPreset from "./tools/get-preset";
import listCategories from "./tools/list-categories";
import searchPresets from "./tools/search-presets";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default defineMcp({
  name: "effect-studio-pro",
  title: "Effect Studio Pro",
  version: "0.1.0",
  // Require a verified bearer token from the app's own auth issuer, so the
  // published MCP endpoint is not callable anonymously.
  auth: auth.oauth.issuer({
    issuer: `${SUPABASE_URL}/auth/v1`,
    acceptedAudiences: ["authenticated"],
    resourceName: "Effect Studio Pro",
  }),
  instructions:
    "Read-only tools over the Effect Studio Pro video-effect catalog. Use `list_categories` to see the category tree, `search_presets` to find effects, filters, transitions, titles, stickers, templates, stock media or audio by keyword or tag, and `get_preset` for the render engine, GPU primitive and motion signature of a specific preset.",
  tools: [listCategories, searchPresets, getPreset],
});

