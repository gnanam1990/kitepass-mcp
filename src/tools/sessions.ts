import { callKpass } from "../kpass-bridge.js";
import { ListSessionsInput, ListSessionsOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_list_sessions",
  description:
    "Lists agent sessions for the current user. Filter by status: active, pending, or expired. Returns session IDs, agent IDs, spending limits, and timestamps.",
  inputSchema: zodToJsonSchema(ListSessionsInput),
};

export async function handler(input: unknown): Promise<unknown> {
  const validated = ListSessionsInput.parse(input);
  const args = ["user", "sessions"];
  if (validated.status) {
    args.push("--status", validated.status);
  }

  const raw = await callKpass<Record<string, unknown>>(args);
  const rawSessions = Array.isArray(raw.sessions) ? raw.sessions : [];

  const sessions = rawSessions.map((s: Record<string, unknown>) => ({
    session_id: String(s.session_id ?? s.id ?? ""),
    agent_id: String(s.agent_id ?? ""),
    status: String(s.status ?? ""),
    max_amount_per_tx: String(s.max_amount_per_tx ?? s.max_per_tx ?? "0"),
    max_total_amount: String(s.max_total_amount ?? s.max_total ?? "0"),
    spent_total: String(s.spent_total ?? s.spent ?? "0"),
    reserved_total: String(s.reserved_total ?? s.reserved ?? "0"),
    created_at: String(s.created_at ?? ""),
    expires_at: String(s.expires_at ?? ""),
    task_summary: s.task_summary ? String(s.task_summary) : undefined,
  }));

  return ListSessionsOutput.parse({ sessions });
}
