import { zodToJsonSchema as toJsonSchema } from "zod-to-json-schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToJsonSchema(schema: any): Record<string, unknown> {
  return toJsonSchema(schema, { target: "openApi3" }) as Record<string, unknown>;
}
