import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { describeItem, findItem } from "../catalog";

export default defineTool({
  name: "get_preset",
  title: "Get preset details",
  description:
    "Get the full technical detail of one Effect Studio Pro preset: its render engine, GPU effect primitive, default parameter values and motion signature.",
  inputSchema: {
    id: z.string().min(1).describe("Preset id, as returned by search_presets."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const found = findItem(id.trim());
    if (!found) throw new ToolError(`No preset with id "${id}". Use search_presets to find one.`);
    const detail = { ...describeItem(found.item), category: found.entry.category, library: found.entry.library };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail as unknown as Record<string, unknown>,
    };
  },
});
