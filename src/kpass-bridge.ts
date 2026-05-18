import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const KPASS_BINARY = process.env.KPASS_BINARY_PATH || "kpass";
const DEFAULT_TIMEOUT_MS = 30_000;

export class KpassError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "KpassError";
  }
}

export async function callKpass<T = unknown>(
  args: string[],
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const { stdout, stderr } = await execFileAsync(
      KPASS_BINARY,
      [...args, "--output", "json"],
      {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    if (stderr && !stdout) {
      throw new KpassError(
        sanitizeKpassError(stderr),
        "KPASS_STDERR",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      throw new KpassError(
        "Failed to parse kpass output as JSON",
        "KPASS_PARSE_ERROR",
        stdout,
      );
    }

    const result = parsed as Record<string, unknown>;
    if (result.status === "error") {
      throw new KpassError(
        String(result.hint || result.message || "Unknown kpass error"),
        "KPASS_CLI_ERROR",
        parsed,
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof KpassError) throw err;

    const error = err as { code?: string; message?: string; stderr?: string };
    if (error.code === "ETIMEDOUT") {
      throw new KpassError(
        `kpass command timed out after ${timeout}ms`,
        "KPASS_TIMEOUT",
      );
    }
    throw new KpassError(
      sanitizeKpassError(error.message || String(err)),
      "KPASS_EXEC_ERROR",
    );
  }
}

export function sanitizeKpassError(e: unknown): string {
  const msg = String(e);
  const sensitive = ["token", "jwt", "session", "bearer", "authorization"];
  for (const word of sensitive) {
    if (msg.toLowerCase().includes(word)) {
      return "kpass authentication error (details redacted)";
    }
  }
  return msg.slice(0, 500);
}

let cachedVersion = "";

export async function getKpassVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const { stdout } = await execFileAsync(KPASS_BINARY, ["--version"], {
      timeout: 5000,
    });
    cachedVersion = stdout.trim();
    return cachedVersion;
  } catch {
    return "unknown";
  }
}

export function kpassBinaryPath(): string {
  return KPASS_BINARY;
}
