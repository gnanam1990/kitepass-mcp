# @kitepass/mcp-server

> Model Context Protocol server for Kite Agent Passport. Give Claude, GPT, or any MCP-aware LLM the ability to authenticate, manage sessions, and execute x402 payments on Kite Mainnet.

---

## What this is

KitePass MCP Server is an open-source implementation of an MCP server that bridges LLM agents with Kite's agent payment infrastructure. It wraps the [kpass CLI](https://github.com/gnanam1990/kitepassport) operations as callable MCP tools, enabling any MCP-aware AI assistant to:

- Check wallet balances on Kite Mainnet
- Create and manage agent spending sessions
- Execute x402 micropayments to paid APIs
- List registered agents and their status

This is a community-built project, not officially endorsed by Anthropic or the Kite Foundation.

## Quick start

### 1. Install

```bash
npm install -g @kitepass/mcp-server
```

### 2. Prerequisites

- Node 18+
- [kpass CLI](https://github.com/gnanam1990/kitepassport) installed and logged in
  ```bash
  kpass login --email your@email.com
  kpass me  # should show your user info
  ```

### 3. Configure Claude Desktop

Add to your Claude Desktop config file:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

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

### 4. Restart Claude Desktop

You can now ask Claude:
- "What's my Kite wallet balance?"
- "Show me my active sessions"
- "Create a $0.01 session for one hour"
- "List the agents I have registered"

## Available tools

| Tool | Description | Type |
|---|---|---|
| `kpass_get_user` | Current logged-in user info | Read |
| `kpass_list_sessions` | Active/pending/expired agent sessions | Read |
| `kpass_get_wallet_balance` | KITE + USDC.e balance | Read |
| `kpass_health_check` | Kite Passport backend health | Read |
| `kpass_create_session` | Create spending session (returns approval URL) | Write |
| `kpass_check_session_status` | Poll session approval state | Read |
| `kpass_execute_payment` | Execute x402 payment via approved session | Write |
| `kpass_list_agents` | List registered agents | Read |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌────────────────┐
│  Claude Desktop │────▶│  KitePass MCP    │────▶│  kpass CLI      │────▶│  Kite Passport │
│  (MCP Client)   │◀────│  Server          │◀────│  (subprocess)   │◀────│  Backend       │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └────────────────┘
```

The MCP server runs as a local subprocess of Claude Desktop. Each tool call spawns a fresh `kpass` subprocess, executes the operation, and returns the result. No long-running processes or state is maintained between calls.

## Security model

- **Identity:** The MCP server runs with the user's kpass identity. All operations are performed as the logged-in user.
- **Write operations:** Creating sessions and executing payments require an approved session. The approval URL must be opened by the human user — the AI cannot approve sessions itself.
- **No token exposure:** JWT tokens and session secrets are never included in tool outputs. Error messages are sanitized.
- **URL validation:** Payment execution refuses non-HTTPS URLs, localhost, and local network addresses.
- **Timeout protection:** All operations have timeouts (30s default, 5min max for payments).

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `KPASS_BINARY_PATH` | (PATH lookup) | Override kpass binary location |
| `KITE_PASSPORT_BASE_URL` | `https://passport.prod.gokite.ai` | Override Kite Passport backend URL |

## Examples

See the [examples/](./examples/) directory for:
- `claude-desktop.json` — Claude Desktop configuration
- `basic-agent.ts` — Using MCP from a custom agent
- `payment-flow.ts` — End-to-end payment example

## Development

```bash
git clone https://github.com/gnanam1990/kitepass-mcp
cd kitepass-mcp
npm install
npm run build
npm test
```

## Roadmap

- **v0.1:** 8 read/write tools, stdio transport, Claude Desktop integration (current)
- **v0.2:** HTTP transport, observability tools, batch operations
- **v0.3:** Multi-user / hosted mode

## Contributing

Issues and PRs welcome. Please run `npm test` before submitting.

## Credits

Built by [Gnanam (@0x_art)](https://twitter.com/0x_art).

Thanks to the Kite Foundation and Anthropic teams for the foundational tooling.

## License

MIT
