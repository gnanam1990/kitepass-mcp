import { callKpass } from "../kpass-bridge.js";
import { HealthCheckInput, HealthCheckOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_health_check",
  description:
    "Checks the Kite Passport backend health. Returns status, latency, and version info.",
  inputSchema: zodToJsonSchema(HealthCheckInput),
};

export async function handler(input: unknown): Promise<unknown> {
  HealthCheckInput.parse(input);
  const start = Date.now();

  try {
    const raw = await callKpass<Record<string, unknown>>(["health"]);
    const latency = Date.now() - start;

    const rawStatus = String(raw.backend_status ?? raw.status ?? "ok");
    let backendStatus: "ok" | "degraded" | "down" = "ok";
    if (rawStatus === "degraded") backendStatus = "degraded";
    else if (rawStatus === "down" || rawStatus === "error") backendStatus = "down";

    const result = {
      backend_status: backendStatus,
      latency_ms: Number(raw.response_time_ms ?? latency),
      version: raw.backend_version ? String(raw.backend_version) : undefined,
      checked_at: new Date().toISOString(),
    };

    return HealthCheckOutput.parse(result);
  } catch {
    const result = {
      backend_status: "down" as const,
      latency_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
    };
    return HealthCheckOutput.parse(result);
  }
}
