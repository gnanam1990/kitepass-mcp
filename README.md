# KitePass MCP Server

> Model Context Protocol server for Kite Agent Passport — exposes kpass operations as tools for Claude, GPT, and other MCP-aware LLMs.

**Status:** Alpha (Phase 1 of 3)

## Prerequisites

- Node 18+
- [kpass CLI](https://github.com/gnanam1990/kitepassport) installed and logged in (`kpass login`)

## Install

```bash
git clone https://github.com/gnanam1990/kitepass-mcp
cd kitepass-mcp
npm install
npm run build
```

## Quickstart

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "kitepass": {
      "command": "node",
      "args": ["/path/to/kitepass-mcp/dist/server.js"]
    }
  }
}
```

Restart Claude Desktop, then ask: "Check my Kite wallet balance"

## Tools (Phase 1 — Read Only)

| Tool | Description |
|---|---|
| `kpass_get_user` | Current logged-in user info (email, user ID, status) |
| `kpass_list_sessions` | Active/pending/expired agent sessions |
| `kpass_get_wallet_balance` | KITE + USDC.e balance for your wallet |
| `kpass_health_check` | Kite Passport backend health status |

## Coming in Phase 2

- `kpass_create_session` — Create spending sessions
- `kpass_session_status` — Check session approval status
- `kpass_execute_payment` — Execute x402 payments
- `kpass_list_agents` — List registered agents

## Development

```bash
npm run dev     # watch mode
npm test        # run tests
npm run build   # compile to dist/
```

## License

MIT
