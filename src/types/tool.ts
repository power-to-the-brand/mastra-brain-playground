// Type definitions for Mastra Brain Tools

/** Shape returned by the custom /tools route on the Mastra server */
export interface ToolListItem {
  id: string;
  key: string;
  name: string;
  description: string;
}

/** Shape returned by the standard /api/tools endpoint on the Mastra server */
export interface ToolDetail {
  id: string;
  description: string;
  inputSchema: string; // JSON string of the Zod schema
  outputSchema: string; // JSON string of the Zod schema
  requireApproval: boolean;
}

/**
 * The Mastra server can return tools in two formats:
 *
 * 1. Custom route (/tools) → ToolListItem[]  (flat array)
 * 2. Standard route (/api/tools) → Record<string, ToolDetail>  (object keyed by tool key)
 *
 * This type represents either shape so the API route can normalise it.
 */
export type MastraToolsResponse = ToolListItem[] | Record<string, ToolDetail>;

/** Normalised shape used by the frontend */
export interface Tool {
  /** The tool key as registered in Mastra (e.g. "getSRActivationData") */
  key: string;
  /** The explicit tool id (e.g. "get-sr-activation-data") */
  id: string;
  /** Human-readable name derived from the key if no explicit name exists */
  name: string;
  /** Tool description */
  description: string;
  /** Whether the tool requires approval before execution */
  requireApproval?: boolean;
}

/**
 * Normalise the Mastra server response into a consistent Tool[] array.
 * Handles both the flat array format and the object format.
 */
export function normaliseToolsResponse(data: MastraToolsResponse): Tool[] {
  if (Array.isArray(data)) {
    // Custom /tools route returns ToolListItem[]
    return data.map((item) => ({
      key: item.key ?? item.id,
      id: item.id,
      name: item.name ?? item.id,
      description: item.description ?? "",
    }));
  }

  // Standard /api/tools route returns Record<string, ToolDetail>
  return Object.entries(data).map(([key, detail]) => ({
    key,
    id: detail.id ?? key,
    name: detail.id ?? key,
    description: detail.description ?? "",
    requireApproval: detail.requireApproval ?? false,
  }));
}
