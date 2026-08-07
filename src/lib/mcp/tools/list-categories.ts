import { defineTool } from "@lovable.dev/mcp-js";
import { categoryTree } from "../catalog";

export default defineTool({
  name: "list_categories",
  title: "List effect categories",
  description:
    "List every effect category, sub-category and asset library in Effect Studio Pro with item counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const tree = categoryTree();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(tree, null, 2) }],
      structuredContent: tree as unknown as Record<string, unknown>,
    };
  },
});
