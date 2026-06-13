import { describe, it, expect, vi, beforeEach } from "vitest";

// The real bridge spawns the `kpass` binary via execFile, which is unavailable
// in CI and in any clean checkout. Mock it so the handler transformation logic
// is exercised deterministically without a real subprocess.
vi.mock("../src/kpass-bridge.js", async () => {
  const actual = await vi.importActual<typeof import("../src/kpass-bridge.js")>(
    "../src/kpass-bridge.js",
  );
  return {
    ...actual,
    callKpass: vi.fn(),
    callKpassLong: vi.fn(),
  };
});

import * as bridge from "../src/kpass-bridge.js";
import { KpassError } from "../src/kpass-bridge.js";
import * as userTool from "../src/tools/user.js";
import * as sessionsTool from "../src/tools/sessions.js";
import * as walletTool from "../src/tools/wallet.js";
import * as healthTool from "../src/tools/health.js";
import * as executePaymentTool from "../src/tools/execute-payment.js";

const callKpass = vi.mocked(bridge.callKpass);
const callKpassLong = vi.mocked(bridge.callKpassLong);

beforeEach(() => {
  callKpass.mockReset();
  callKpassLong.mockReset();
});

describe("kpass_get_user", () => {
  it("returns user info when logged in", async () => {
    callKpass.mockResolvedValue({
      status: "success",
      email: "alice@example.com",
      user_id: "user_123",
    });
    const result = await userTool.handler({});
    expect(result).toMatchObject({
      email: "alice@example.com",
      user_id: "user_123",
      status: "logged_in",
    });
  });

  it("reports logged_out when kpass does not return success", async () => {
    callKpass.mockResolvedValue({ status: "other", email: "", user_id: "" });
    const result = await userTool.handler({});
    expect(result).toMatchObject({ status: "logged_out" });
  });
});

describe("kpass_list_sessions", () => {
  it("returns sessions list", async () => {
    callKpass.mockResolvedValue({
      sessions: [
        {
          session_id: "sess_1",
          agent_id: "agent_1",
          status: "active",
          max_amount_per_tx: "0.01",
          max_total_amount: "1.0",
          spent_total: "0",
          reserved_total: "0",
          created_at: "2025-01-01T00:00:00Z",
          expires_at: "2025-02-01T00:00:00Z",
        },
      ],
    });
    const result = await sessionsTool.handler({});
    expect(result).toMatchObject({ sessions: expect.any(Array) });
    expect((result as { sessions: unknown[] }).sessions).toHaveLength(1);
  });

  it("accepts status filter and passes it through to kpass", async () => {
    callKpass.mockResolvedValue({ sessions: [] });
    await sessionsTool.handler({ status: "active" });
    expect(callKpass).toHaveBeenCalledWith(
      expect.arrayContaining(["user", "sessions", "--status", "active"]),
    );
  });

  it("tolerates missing sessions array", async () => {
    callKpass.mockResolvedValue({});
    const result = await sessionsTool.handler({});
    expect(result).toMatchObject({ sessions: [] });
  });
});

describe("kpass_get_wallet_balance", () => {
  it("returns wallet balance", async () => {
    callKpass.mockResolvedValue({
      wallet_address: "0xabc",
      chain_id: 2368,
      assets: [
        {
          symbol: "KITE",
          balance: "1.5",
          raw_balance: "1500000000000000000",
          decimals: 18,
          native: true,
        },
      ],
    });
    const result = await walletTool.handler({});
    expect(result).toMatchObject({
      address: "0xabc",
      chain_id: expect.any(Number),
      assets: expect.any(Array),
    });
  });
});

describe("kpass_health_check", () => {
  it("returns ok status", async () => {
    callKpass.mockResolvedValue({ backend_status: "ok", response_time_ms: 12 });
    const result = await healthTool.handler({});
    expect(result).toMatchObject({
      backend_status: "ok",
      latency_ms: expect.any(Number),
      checked_at: expect.any(String),
    });
  });

  it("reports down when kpass call fails", async () => {
    callKpass.mockRejectedValue(new Error("boom"));
    const result = await healthTool.handler({});
    expect(result).toMatchObject({ backend_status: "down" });
  });
});

describe("kpass_execute_payment", () => {
  const validInput = {
    session_id: "sess_1",
    url: "https://api.example.com/paid",
  };

  it("reports success and surfaces the payment receipt on a successful call", async () => {
    callKpassLong.mockResolvedValue({
      status: "success",
      http_response: { status: 200, headers: {}, body: { ok: true } },
      payment_receipt: {
        amount_usdc: "0.01",
        transaction_hash: "0xtx",
        service_address: "0xservice",
        receipt_id: "rcpt_1",
        settled_at: "2025-01-01T00:00:00Z",
      },
    });
    const result = (await executePaymentTool.handler(validInput)) as {
      success: boolean;
      payment: { transaction_hash: string } | null;
    };
    expect(result.success).toBe(true);
    expect(result.payment?.transaction_hash).toBe("0xtx");
  });

  it("fails closed when kpass returns success: false (no top-level error status)", async () => {
    // Regression: handler used to hardcode success: true for any non-throwing
    // response, masking failed payments. It must read the real signal.
    callKpassLong.mockResolvedValue({
      success: false,
      error: "insufficient session balance",
    });
    const result = (await executePaymentTool.handler(validInput)) as {
      success: boolean;
      error?: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toContain("insufficient session balance");
  });

  it("fails closed when kpass returns an error_reason without an error status", async () => {
    callKpassLong.mockResolvedValue({
      status: "ok",
      error_reason: "x402 settlement rejected",
    });
    const result = (await executePaymentTool.handler(validInput)) as {
      success: boolean;
      error?: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toContain("x402 settlement rejected");
  });

  it("returns a failure result (not a throw) when the bridge throws KpassError", async () => {
    callKpassLong.mockRejectedValue(new KpassError("kpass blew up", "X"));
    const result = (await executePaymentTool.handler(validInput)) as {
      success: boolean;
    };
    expect(result.success).toBe(false);
  });

  it("rejects unsafe (non-HTTPS / local) URLs before calling kpass", async () => {
    await expect(
      executePaymentTool.handler({
        session_id: "sess_1",
        url: "https://localhost/paid",
      }),
    ).rejects.toThrow();
    expect(callKpassLong).not.toHaveBeenCalled();
  });
});
