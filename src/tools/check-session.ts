import { callKpass } from "../kpass-bridge.js";
import { CheckSessionInput, CheckSessionOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_check_session_status",
  description:
    "Checks the approval status of a pending session request. Returns whether it was approved, rejected, or is still pending.",
  inputSchema: zodToJsonSchema(CheckSessionInput),
};

export async function handler(input: unknown): Promise<unknown> {
  const validated = CheckSessionInput.parse(input);
  const raw = await callKpass<Record<string, unknown>>([
    "agent:session", "status",
    "--request-id", validated.request_id,
  ]);

  const rawStatus = String(raw.status ?? raw.state ?? "pending");
  let status: "pending" | "approved" | "rejected" | "expired" = "pending";
  if (rawStatus === "approved" || rawStatus === "active") status = "approved";
  else if (rawStatus === "rejected" || rawStatus === "denied") status = "rejected";
  else if (rawStatus === "expired") status = "expired";

  return CheckSessionOutput.parse({
    request_id: validated.request_id,
    status,
    session_id: raw.session_id ? String(raw.session_id) : undefined,
    approved_at: raw.approved_at ? String(raw.approved_at) : undefined,
    rejected_reason: raw.rejected_reason ? String(raw.rejected_reason) : undefined,
  });
}
