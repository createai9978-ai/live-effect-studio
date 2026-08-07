import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { allEntries } from "../catalog";

export default defineTool({
  name: "search_presets",
  title: "Search presets",
  description:
    "Search the Effect Studio Pro catalog of effects, filters, transitions, titles, stickers, templates, stock media and audio by keyword, library or tag.",
  inputSchema: {
    query: z.string().describe("Keyword to match against preset names and categories.").optional(),
    library: z
      .string()
      .describe(
        "Restrict results to one library: effects, filters, transitions, titles, stickers, templates, stock or audio."
      )
      .optional(),
    tag: z.string().describe("Mood tag such as cinematic, vlog, gaming, retro or ai.").optional(),
    limit: z.number().int().describe("Maximum results to return (1-100, default 25).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, library, tag, limit }) => {
    const max = Math.min(100, Math.max(1, limit ?? 25));
    const q = query?.trim().toLowerCase();
    const lib = library?.trim().toLowerCase();
    const tg = tag?.trim().toLowerCase();

    const all = allEntries();
    if (lib && !all.some((e) => e.library === lib)) {
      throw new ToolError(`Unknown library "${library}". Use list_categories to see valid values.`);
    }

    const results = all.filter((e) => {
      if (lib && e.library !== lib) return false;
      if (tg && !e.tags.some((t) => t.toLowerCase() === tg)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.tag ?? "").toLowerCase().includes(q)
      );
    });

    const payload = {
      total: results.length,
      returned: Math.min(max, results.length),
      results: results.slice(0, max),
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload as unknown as Record<string, unknown>,
    };
  },
});
