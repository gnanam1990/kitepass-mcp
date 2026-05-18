# Changelog

## v0.1.0 (initial release)

Initial public release.

### Features
- 8 MCP tools wrapping kpass CLI operations
- Stdio transport for Claude Desktop integration
- Zod-validated inputs and outputs
- TypeScript with strict mode
- Examples for Claude Desktop config, custom agents, and payment flows

### Tools
- `kpass_get_user` — current logged-in user info
- `kpass_list_sessions` — active/pending/expired agent sessions
- `kpass_get_wallet_balance` — KITE + USDC.e balance
- `kpass_health_check` — Kite Passport backend health
- `kpass_create_session` — create spending session with approval URL
- `kpass_check_session_status` — poll session approval state
- `kpass_execute_payment` — execute x402 payment via approved session
- `kpass_list_agents` — list registered agents

### Known limitations
- Stdio transport only (HTTP transport in v0.2)
- Local kpass binary required
- Single-user (multi-user / hosted in v0.3)
