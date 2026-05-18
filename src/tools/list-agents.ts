import { callKpass } from "../kpass-bridge.js";
import { ListAgentsInput, ListAgentsOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_list_agents",
  description:
    "Lists registered agents for the current user. Returns agent IDs, types, names, and status.",
  inputSchema: zodToJsonSchema(ListAgentsInput),
};

export async function handler(input: unknown): Promise<unknown> {
  ListAgentsInput.parse(input);
  const args = ["user", "agents"];

  const raw = await callKpass<Record<string, unknown>>(args);
  const rawAgents = Array.isArray(raw.agents) ? raw.agents : [];

  const agents = rawAgents.map((a: Record<string, unknown>) => {
    const rawType = String(a.agent_type ?? a.type ?? "web-service");
    let agentType: "web-service" | "subagent" | "scheduled" = "web-service";
    if (rawType === "subagent") agentType = "subagent";
    else if (rawType === "scheduled") agentType = "scheduled";

    return {
      agent_id: String(a.agent_id ?? a.id ?? ""),
      agent_type: agentType,
      name: a.name ? String(a.name) : undefined,
      description: a.description ? String(a.description) : undefined,
      status: String(a.status ?? "active"),
      created_at: String(a.created_at ?? ""),
      last_active_at: a.last_active_at ? String(a.last_active_at) : undefined,
    };
  });

  return ListAgentsOutput.parse({ agents });
}
