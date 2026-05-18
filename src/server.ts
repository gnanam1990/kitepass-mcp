#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import * as userTool from "./tools/user.js";
import * as sessionsTool from "./tools/sessions.js";
import * as walletTool from "./tools/wallet.js";
import * as healthTool from "./tools/health.js";
import * as createSessionTool from "./tools/create-session.js";
import * as checkSessionTool from "./tools/check-session.js";
import * as executePaymentTool from "./tools/execute-payment.js";
import * as listAgentsTool from "./tools/list-agents.js";

const TOOLS = {
  [userTool.definition.name]: userTool,
  [sessionsTool.definition.name]: sessionsTool,
  [walletTool.definition.name]: walletTool,
  [healthTool.definition.name]: healthTool,
  [createSessionTool.definition.name]: createSessionTool,
  [checkSessionTool.definition.name]: checkSessionTool,
  [executePaymentTool.definition.name]: executePaymentTool,
  [listAgentsTool.definition.name]: listAgentsTool,
};

const server = new Server(
  { name: "kitepass-mcp", version: "0.1.0-alpha.1" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.values(TOOLS).map((t) => t.definition),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name as keyof typeof TOOLS;
  const tool = TOOLS[toolName];
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }
  try {
    const result = await tool.handler(request.params.arguments ?? {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[kitepass-mcp] connected via stdio. Tools: ${Object.keys(TOOLS).join(", ")}`,
  );
}

main().catch((err) => {
  console.error("[kitepass-mcp] fatal error", err);
  process.exit(1);
});
