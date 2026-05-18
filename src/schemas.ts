import { z } from "zod";

// ==================== Phase 1 Schemas ====================

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

// ==================== Phase 2 Schemas ====================

export const CreateSessionInput = z.object({
  max_amount_per_tx: z.string().regex(/^\d+(\.\d+)?$/, "Must be a decimal string (e.g. '0.0001')"),
  max_total_amount: z.string().regex(/^\d+(\.\d+)?$/, "Must be a decimal string (e.g. '0.01')"),
  ttl: z.string().regex(/^\d+[smhdwy]$/i, "Must be duration like '1h', '30d', '1y'"),
  task_summary: z.string().min(1).max(500),
  assets: z.array(z.string()).optional(),
  payment_approach: z.enum(["x402", "auto"]).optional(),
  agent_id: z.string().optional(),
}).strict();
export type CreateSessionInput = z.infer<typeof CreateSessionInput>;

export const CreateSessionOutput = z.object({
  request_id: z.string(),
  approval_url: z.string().url(),
  expires_at: z.string(),
  instructions: z.string(),
});
export type CreateSessionOutput = z.infer<typeof CreateSessionOutput>;

export const CheckSessionInput = z.object({
  request_id: z.string().min(1),
}).strict();
export type CheckSessionInput = z.infer<typeof CheckSessionInput>;

export const CheckSessionOutput = z.object({
  request_id: z.string(),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
  session_id: z.string().optional(),
  approved_at: z.string().optional(),
  rejected_reason: z.string().optional(),
});
export type CheckSessionOutput = z.infer<typeof CheckSessionOutput>;

export const ExecutePaymentInput = z.object({
  session_id: z.string().min(1),
  url: z.string().url().refine((u) => u.startsWith("https://"), "URL must be HTTPS"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
  max_cost_usdc: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  timeout_ms: z.number().min(1000).max(300000).optional(),
}).strict();
export type ExecutePaymentInput = z.infer<typeof ExecutePaymentInput>;

export const PaymentReceiptSchema = z.object({
  amount_usdc: z.string(),
  transaction_hash: z.string(),
  service_address: z.string(),
  receipt_id: z.string(),
  settled_at: z.string(),
}).nullable();

export const ExecutePaymentOutput = z.object({
  success: z.boolean(),
  http_status: z.number(),
  response_headers: z.record(z.string(), z.string()),
  response_body: z.unknown(),
  payment: PaymentReceiptSchema,
  error: z.string().optional(),
});
export type ExecutePaymentOutput = z.infer<typeof ExecutePaymentOutput>;

export const ListAgentsInput = z.object({
  status: z.enum(["active", "all"]).optional().default("active"),
}).strict();
export type ListAgentsInput = z.infer<typeof ListAgentsInput>;

export const AgentSchema = z.object({
  agent_id: z.string(),
  agent_type: z.enum(["web-service", "subagent", "scheduled"]),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  last_active_at: z.string().optional(),
});

export const ListAgentsOutput = z.object({
  agents: z.array(AgentSchema),
});
export type ListAgentsOutput = z.infer<typeof ListAgentsOutput>;
