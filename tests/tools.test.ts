import { describe, it, expect } from "vitest";
import * as userTool from "../src/tools/user.js";
import * as sessionsTool from "../src/tools/sessions.js";
import * as walletTool from "../src/tools/wallet.js";
import * as healthTool from "../src/tools/health.js";

describe("kpass_get_user", () => {
  it("returns user info when logged in", async () => {
    const result = await userTool.handler({});
    expect(result).toMatchObject({
      email: expect.any(String),
      user_id: expect.stringMatching(/^user_/),
      status: "logged_in",
    });
  });
});

describe("kpass_list_sessions", () => {
  it("returns sessions list", async () => {
    const result = await sessionsTool.handler({});
    expect(result).toMatchObject({
      sessions: expect.any(Array),
    });
  });

  it("accepts status filter", async () => {
    const result = await sessionsTool.handler({ status: "active" });
    expect(result).toMatchObject({
      sessions: expect.any(Array),
    });
  });
});

describe("kpass_get_wallet_balance", () => {
  it("returns wallet balance", async () => {
    const result = await walletTool.handler({});
    expect(result).toMatchObject({
      address: expect.stringMatching(/^0x/),
      chain_id: expect.any(Number),
      assets: expect.any(Array),
    });
  });
});

describe("kpass_health_check", () => {
  it("returns health status", async () => {
    const result = await healthTool.handler({});
    expect(result).toMatchObject({
      backend_status: expect.stringMatching(/^(ok|degraded|down)$/),
      latency_ms: expect.any(Number),
      checked_at: expect.any(String),
    });
  });
});
