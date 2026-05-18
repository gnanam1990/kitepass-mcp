import { callKpass } from "../kpass-bridge.js";
import { CreateSessionInput, CreateSessionOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_create_session",
  description:
    "Initiates creation of a new agent spending session. The user must approve via the returned approval URL before the session is usable. Always confirm the spending limits with the user before calling this.",
  inputSchema: zodToJsonSchema(CreateSessionInput),
};

export async function handler(input: unknown): Promise<unknown> {
  const validated = CreateSessionInput.parse(input);
  const args = [
    "agent:session", "create",
    "--max-amount-per-tx", validated.max_amount_per_tx,
    "--max-total-amount", validated.max_total_amount,
    "--ttl", validated.ttl,
    "--task-summary", validated.task_summary,
  ];
  if (validated.assets) {
    args.push("--assets", validated.assets.join(","));
  }
  if (validated.payment_approach) {
    args.push("--payment-approach", validated.payment_approach);
  }
  if (validated.agent_id) {
    args.push("--agent-id", validated.agent_id);
  }

  const raw = await callKpass<Record<string, unknown>>(args);
  return CreateSessionOutput.parse({
    request_id: String(raw.request_id ?? raw.id ?? ""),
    approval_url: String(raw.approval_url ?? raw.url ?? ""),
    expires_at: String(raw.expires_at ?? ""),
    instructions:
      "Open approval_url in a browser, approve the session, then call kpass_check_session_status with this request_id to confirm.",
  });
}
