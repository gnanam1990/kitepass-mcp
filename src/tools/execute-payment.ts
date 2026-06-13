import {
  callKpassLong,
  writeTempJsonFile,
  isUrlSafe,
  KpassError,
} from "../kpass-bridge.js";
import { ExecutePaymentInput, ExecutePaymentOutput } from "../schemas.js";
import { zodToJsonSchema } from "../utils/zod-to-json.js";

export const definition = {
  name: "kpass_execute_payment",
  description:
    "Executes an HTTP request via an approved session. The kpass CLI handles x402 negotiation, retries, and settlement automatically. Returns the response body and payment metadata.",
  inputSchema: zodToJsonSchema(ExecutePaymentInput),
};

export async function handler(input: unknown): Promise<unknown> {
  const validated = ExecutePaymentInput.parse(input);

  if (!isUrlSafe(validated.url)) {
    throw new KpassError(
      "URL must be HTTPS and cannot be localhost or local network",
      "INVALID_URL",
    );
  }

  const args = [
    "agent:session", "execute",
    "--session-id", validated.session_id,
    "--url", validated.url,
    "--method", validated.method ?? "GET",
  ];

  if (validated.headers) {
    args.push("--headers", JSON.stringify(validated.headers));
  }

  let tempFile: string | undefined;
  if (validated.body) {
    const bodyStr =
      typeof validated.body === "string"
        ? validated.body
        : JSON.stringify(validated.body);
    if (bodyStr.length > 4096) {
      tempFile = await writeTempJsonFile(validated.body);
      args.push("--body-file", tempFile);
    } else {
      args.push("--body", bodyStr);
    }
  }

  if (validated.max_cost_usdc) {
    args.push("--max-cost", validated.max_cost_usdc);
  }

  try {
    const raw = await callKpassLong<Record<string, unknown>>(args, {
      timeoutMs: validated.timeout_ms ?? 60_000,
    });

    const httpResp = (raw.http_response ?? raw.response ?? {}) as Record<string, unknown>;
    const paymentReceipt = raw.payment_receipt ?? raw.payment ?? null;

    let payment = null;
    if (paymentReceipt && typeof paymentReceipt === "object") {
      const pr = paymentReceipt as Record<string, unknown>;
      payment = {
        amount_usdc: String(pr.amount_usdc ?? pr.amount ?? "0"),
        transaction_hash: String(pr.transaction_hash ?? pr.tx_hash ?? ""),
        service_address: String(pr.service_address ?? pr.to ?? ""),
        receipt_id: String(pr.receipt_id ?? pr.id ?? ""),
        settled_at: String(pr.settled_at ?? pr.timestamp ?? ""),
      };
    }

    // Fail closed: callKpass already throws on { status: "error" }, but the
    // execute subcommand can return a structured envelope where the request or
    // payment failed without that top-level error status (e.g. success: false,
    // a non-"success" status, or an explicit error/error_reason). Treat any
    // affirmative failure signal as a failure instead of hardcoding success.
    const errorReason =
      raw.error ?? raw.error_reason ?? raw.errorReason;
    const failed =
      raw.success === false ||
      (raw.status !== undefined && raw.status !== "success") ||
      errorReason != null;

    if (failed) {
      return ExecutePaymentOutput.parse({
        success: false,
        http_status: Number(httpResp.status ?? raw.http_status ?? 0),
        response_headers: (httpResp.headers ?? raw.response_headers ?? {}) as Record<string, string>,
        response_body: httpResp.body ?? raw.response_body ?? null,
        payment,
        error: errorReason != null ? String(errorReason) : "kpass reported payment failure",
      });
    }

    return ExecutePaymentOutput.parse({
      success: true,
      http_status: Number(httpResp.status ?? raw.http_status ?? 200),
      response_headers: (httpResp.headers ?? raw.response_headers ?? {}) as Record<string, string>,
      response_body: httpResp.body ?? raw.response_body ?? raw,
      payment,
    });
  } catch (err) {
    if (err instanceof KpassError) {
      return ExecutePaymentOutput.parse({
        success: false,
        http_status: 0,
        response_headers: {},
        response_body: null,
        payment: null,
        error: err.message,
      });
    }
    throw err;
  }
}
