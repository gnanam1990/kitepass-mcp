# KitePass MCP Server

> A Model Context Protocol (MCP) server that exposes Kite Agent Passport payment operations as tools for MCP-aware LLM agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](./tsconfig.json)
[![Test](https://github.com/gnanam1990/kitepass-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/gnanam1990/kitepass-mcp/actions/workflows/test.yml)

## Overview

KitePass MCP Server bridges MCP-aware LLM agents with Kite's agent payment infrastructure. It wraps the [`kpass` CLI](https://github.com/gnanam1990/kitepassport) as a set of callable MCP tools, so an assistant can check balances, manage agent spending sessions, and execute x402 payments on Kite Mainnet through a structured, validated interface.

The server runs locally over stdio and spawns a fresh `kpass` subprocess per tool call — it holds no long-running state. It is a community-built project, not officially endorsed by the Kite Foundation.

## Features

- 8 MCP tools wrapping `kpass` CLI operations (read and write).
- Zod-validated tool inputs and outputs; tool input schemas are published to clients as JSON Schema.
- Human-in-the-loop writes: session creation returns an approval URL that the user must open and approve; the agent cannot self-approve.
- SSRF-guarded payment execution: only `https://` URLs are allowed, and `localhost`, `127.0.0.1`, and `*.local` hosts are rejected (enforced both in the Zod schema and a runtime check).
- Fail-closed payment handling: any affirmative failure signal from `kpass` (`success: false`, a non-`success` status, or an error reason) is surfaced as a failed result rather than assumed success.
- Error sanitization: outputs that mention token/JWT/session/bearer/authorization details are redacted before being returned.
- Timeouts on every operation (30s default; up to 5min for payment execution).

## Tech stack

- **Language:** TypeScript (strict mode), compiled to ESM, Node.js >= 18.
- **MCP:** [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) over stdio transport.
- **Validation:** `zod` with `zod-to-json-schema` for publishing tool input schemas.
- **Tooling:** `tsc` (build), `tsx` (dev), `vitest` (tests).

## Architecture

```
MCP client  ──▶  KitePass MCP server  ──▶  kpass CLI (subprocess)  ──▶  Kite Passport backend
```

- `src/server.ts` — registers tools and handles MCP `ListTools` / `CallTool` requests over stdio.
- `src/kpass-bridge.ts` — spawns `kpass` via `execFile`, parses JSON output, enforces timeouts, sanitizes errors, and provides the URL-safety check.
- `src/schemas.ts` — Zod input/output schemas for every tool.
- `src/tools/*.ts` — one module per tool (`definition` + `handler`).
- `src/utils/zod-to-json.ts` — converts Zod schemas to JSON Schema for tool definitions.

## Getting started

### Prerequisites

- Node.js >= 18
- The [`kpass` CLI](https://github.com/gnanam1990/kitepassport), installed and logged in:
  ```bash
  kpass login --email you@example.com
  kpass me   # should show your user info
  ```

### Installation

```bash
npm install -g @kitepass/mcp-server
```

Or run from source:

```bash
git clone https://github.com/gnanam1990/kitepass-mcp
cd kitepass-mcp
npm install
npm run build
```

### Configuration

The MCP server reads one environment variable directly; the rest of the calling environment is passed through to the `kpass` subprocess, which reads its own configuration.

| Env var | Default | Purpose |
|---|---|---|
| `KPASS_BINARY_PATH` | `kpass` (resolved on `PATH`) | Override the location of the `kpass` binary the server spawns. |

Add the server to an MCP client config. Example for a stdio client (see [`examples/claude-desktop.json`](./examples/claude-desktop.json)):

```json
{
  "mcpServers": {
    "kitepass": {
      "command": "npx",
      "args": ["@kitepass/mcp-server"]
    }
  }
}
```

### Running

```bash
npm run dev     # watch mode (tsx)
npm start       # run the built server (dist/server.js)
```

The server communicates over stdio; it is intended to be launched by an MCP client rather than run interactively.

## Usage

The server exposes the following tools:

| Tool | Type | Description |
|---|---|---|
| `kpass_get_user` | Read | Current logged-in user (email, user ID, login status). |
| `kpass_list_sessions` | Read | Agent sessions, filterable by `active` / `pending` / `expired`. |
| `kpass_get_wallet_balance` | Read | KITE and USDC.e balances for the user's (or a given) address. |
| `kpass_health_check` | Read | Kite Passport backend health (status, latency, version). |
| `kpass_list_agents` | Read | Registered agents (IDs, types, names, status). |
| `kpass_create_session` | Write | Create a spending session; returns an approval URL the user must open. |
| `kpass_check_session_status` | Read | Poll the approval state of a pending session request. |
| `kpass_execute_payment` | Write | Execute an HTTP request through an approved session; `kpass` handles x402 negotiation and settlement. |

A typical write flow:

1. `kpass_create_session` with spending limits (`max_amount_per_tx`, `max_total_amount`, `ttl`, `task_summary`) — returns a `request_id` and `approval_url`.
2. The user opens `approval_url` and approves the session.
3. `kpass_check_session_status` with the `request_id` until it reports `approved` (yielding a `session_id`).
4. `kpass_execute_payment` with the `session_id` and a target `https://` URL.

## Testing

```bash
npm test          # vitest run
npm run test:watch
```

Tests live in `tests/tools.test.ts` and mock the `kpass` bridge, so no real `kpass` binary or network access is required. They exercise the per-tool input/output transformation logic, including the fail-closed payment path and error sanitization.

## Project structure

```
src/
  server.ts          # MCP server entry point (stdio)
  kpass-bridge.ts    # kpass subprocess bridge, timeouts, URL safety, error sanitization
  schemas.ts         # Zod input/output schemas
  tools/             # one module per MCP tool
  utils/zod-to-json.ts
tests/tools.test.ts  # vitest unit tests (kpass bridge mocked)
examples/
  claude-desktop.json  # sample MCP client configuration
```

## Status

Early / preview (`v0.1.0`). The 8 tools, Zod validation, stdio transport, SSRF guard, and fail-closed payment handling are implemented and unit-tested with the `kpass` bridge mocked. The server has no built-in tests that exercise a live backend; correct end-to-end behavior depends on a working, logged-in `kpass` CLI and the Kite Passport backend. Transport is stdio only.

## License

MIT — see [LICENSE](./LICENSE).
