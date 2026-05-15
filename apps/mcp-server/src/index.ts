import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BridgeClient } from "./bridgeClient.js";

const bridgeUrl = process.env.GHCO_BRIDGE_URL ?? "http://127.0.0.1:8788";
const bridgeToken = process.env.GHCO_BRIDGE_TOKEN ?? "";

const client = new BridgeClient(bridgeUrl, bridgeToken);

const server = new McpServer({
  name: "ghco-comunicacoes",
  version: "0.1.0"
});

server.registerTool(
  "communications_health",
  {
    title: "Communications health",
    description: "Check whether the local GHCO Comunicacoes bridge is reachable.",
    inputSchema: {}
  },
  async () => textResult(await client.health())
);

server.registerTool(
  "list_chats",
  {
    title: "List WhatsApp chats",
    description: "List recently seen WhatsApp chats from the local bridge database.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).default(50)
    }
  },
  async ({ limit }) => textResult(await client.listChats(limit))
);

server.registerTool(
  "search_messages",
  {
    title: "Search WhatsApp messages",
    description: "Search locally stored WhatsApp text messages.",
    inputSchema: {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(20)
    }
  },
  async ({ query, limit }) => textResult(await client.searchMessages(query, limit))
);

server.registerTool(
  "get_chat_messages",
  {
    title: "Get chat messages",
    description: "Read recent messages for a specific WhatsApp chat JID.",
    inputSchema: {
      jid: z.string().min(1),
      limit: z.number().int().min(1).max(200).default(50)
    }
  },
  async ({ jid, limit }) => textResult(await client.getChatMessages(jid, limit))
);

server.registerTool(
  "send_whatsapp_message",
  {
    title: "Send WhatsApp message",
    description: "Send a text message through the local WhatsApp bridge.",
    inputSchema: {
      recipient: z.string().min(6),
      text: z.string().min(1).max(4000)
    }
  },
  async ({ recipient, text }) => textResult(await client.sendMessage(recipient, text))
);

await server.connect(new StdioServerTransport());

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

