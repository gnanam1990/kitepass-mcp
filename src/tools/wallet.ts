import { callKpass } from "../kpass-bridge.js";
import { GetWalletBalanceInput, GetWalletBalanceOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_get_wallet_balance",
  description:
    "Returns the KITE and USDC.e balance for the user's wallet. Optionally specify an address to check a different wallet.",
  inputSchema: zodToJsonSchema(GetWalletBalanceInput),
};

export async function handler(input: unknown): Promise<unknown> {
  const validated = GetWalletBalanceInput.parse(input);
  const args = ["wallet", "balance"];
  if (validated.address) {
    args.push("--address", validated.address);
  }

  const raw = await callKpass<Record<string, unknown>>(args);

  const rawAssets = Array.isArray(raw.assets) ? raw.assets : [];
  const assets = rawAssets.map((a: Record<string, unknown>) => ({
    symbol: String(a.symbol ?? ""),
    balance: String(a.balance ?? "0"),
    raw_balance: String(a.raw_balance ?? "0"),
    decimals: Number(a.decimals ?? 18),
    native: Boolean(a.native),
    contract_address: a.contract_address ? String(a.contract_address) : undefined,
    available_raw: a.available_raw ? String(a.available_raw) : undefined,
    inflight_raw: a.inflight_raw ? String(a.inflight_raw) : undefined,
  }));

  const result = {
    address: String(raw.wallet_address ?? ""),
    chain_id: Number(raw.chain_id ?? 2366),
    assets,
  };

  return GetWalletBalanceOutput.parse(result);
}
