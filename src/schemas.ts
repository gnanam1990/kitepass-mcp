import { z } from "zod";

export const GetUserInput = z.object({}).strict();
export type GetUserInput = z.infer<typeof GetUserInput>;

export const GetUserOutput = z.object({
  email: z.string(),
  user_id: z.string(),
  status: z.enum(["logged_in", "logged_out"]),
});
export type GetUserOutput = z.infer<typeof GetUserOutput>;

export const ListSessionsInput = z.object({
  status: z.enum(["active", "pending", "expired"]).optional().default("active"),
}).strict();
export type ListSessionsInput = z.infer<typeof ListSessionsInput>;

export const SessionSchema = z.object({
  session_id: z.string(),
  agent_id: z.string(),
  status: z.string(),
  max_amount_per_tx: z.string(),
  max_total_amount: z.string(),
  spent_total: z.string(),
  reserved_total: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  task_summary: z.string().optional(),
});

export const ListSessionsOutput = z.object({
  sessions: z.array(SessionSchema),
});
export type ListSessionsOutput = z.infer<typeof ListSessionsOutput>;

export const GetWalletBalanceInput = z.object({
  address: z.string().optional(),
}).strict();
export type GetWalletBalanceInput = z.infer<typeof GetWalletBalanceInput>;

export const AssetBalanceSchema = z.object({
  symbol: z.string(),
  balance: z.string(),
  raw_balance: z.string(),
  decimals: z.number(),
  native: z.boolean(),
  contract_address: z.string().optional(),
  available_raw: z.string().optional(),
  inflight_raw: z.string().optional(),
});

export const GetWalletBalanceOutput = z.object({
  address: z.string(),
  chain_id: z.number(),
  assets: z.array(AssetBalanceSchema),
});
export type GetWalletBalanceOutput = z.infer<typeof GetWalletBalanceOutput>;

export const HealthCheckInput = z.object({}).strict();
export type HealthCheckInput = z.infer<typeof HealthCheckInput>;

export const HealthCheckOutput = z.object({
  backend_status: z.enum(["ok", "degraded", "down"]),
  latency_ms: z.number(),
  version: z.string().optional(),
  checked_at: z.string(),
});
export type HealthCheckOutput = z.infer<typeof HealthCheckOutput>;
