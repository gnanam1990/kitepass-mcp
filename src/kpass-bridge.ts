import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const execFileAsync = promisify(execFile);

const KPASS_BINARY = process.env.KPASS_BINARY_PATH || "kpass";
const DEFAULT_TIMEOUT_MS = 30_000;
const LONG_TIMEOUT_MS = 300_000;

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
      [...args, "--output", "json", "--no-interactive"],
      {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
        cwd: homedir(),
      },
    );

    if (stderr && !stdout) {
      throw new KpassError(sanitizeKpassError(stderr), "KPASS_STDERR");
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

export async function callKpassLong<T = unknown>(
  args: string[],
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const timeout = Math.min(options.timeoutMs ?? LONG_TIMEOUT_MS, LONG_TIMEOUT_MS);
  return callKpass<T>(args, { timeoutMs: timeout });
}

export async function writeTempJsonFile(data: unknown): Promise<string> {
  const filePath = join(tmpdir(), `kpass-body-${randomBytes(8).toString("hex")}.json`);
  await writeFile(filePath, JSON.stringify(data), "utf-8");
  setTimeout(() => {
    unlink(filePath).catch(() => {});
  }, 60_000);
  return filePath;
}

export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return false;
    if (parsed.hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
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
