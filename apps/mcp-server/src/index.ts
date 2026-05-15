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
  "audit_contacts",
  {
    title: "Audit WhatsApp contact catalog",
    description:
      "Audit locally seen WhatsApp chats and suggest contact names in the format Nome 0786. This infers saved/unsaved status from chat metadata; it does not read the phone address book directly.",
    inputSchema: {
      limit: z.number().int().min(1).max(5000).default(500),
      includeGroups: z.boolean().default(false),
      includeNonPhoneIds: z.boolean().default(false)
    }
  },
  async ({ limit, includeGroups, includeNonPhoneIds }) => textResult(await client.auditContacts(limit, includeGroups, includeNonPhoneIds))
);

server.registerTool(
  "Auditar",
  {
    title: "Auditar contatos para Google Contacts",
    description:
      "Gera um CSV local para importar no Google Contacts, usando nomes no padrao Nome 0786. Use nameOverrides para informar nomes conhecidos, por exemplo phone +19936180786 e name Leonardo.",
    inputSchema: {
      limit: z.number().int().min(1).max(5000).default(500),
      includeSaved: z.boolean().default(false),
      fallbackNamePrefix: z.string().min(1).max(40).default("Contato"),
      nameOverrides: z
        .array(
          z.object({
            phone: z.string().min(8).max(32),
            name: z.string().min(1).max(120)
          })
        )
        .default([])
    }
  },
  async (input) => textResult(await client.auditarGoogleContacts(input))
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
  "get_message",
  {
    title: "Get one WhatsApp message",
    description: "Read one locally stored WhatsApp message by chat JID and message ID.",
    inputSchema: {
      jid: z.string().min(1),
      messageId: z.string().min(1)
    }
  },
  async ({ jid, messageId }) => textResult(await client.getMessage(jid, messageId))
);

server.registerTool(
  "list_media_messages",
  {
    title: "List WhatsApp media messages",
    description: "List recent messages that contain downloadable media metadata.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).default(50)
    }
  },
  async ({ limit }) => textResult(await client.listMediaMessages(limit))
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

server.registerTool(
  "send_whatsapp_media",
  {
    title: "Send WhatsApp media",
    description: "Send an image, video, audio file, voice note, or document through the local WhatsApp bridge.",
    inputSchema: {
      recipient: z.string().min(6),
      filePath: z.string().min(1),
      mediaType: z.enum(["image", "video", "audio", "document"]),
      caption: z.string().max(4000).optional(),
      fileName: z.string().min(1).optional(),
      mimeType: z.string().min(3).optional(),
      asVoice: z.boolean().optional()
    }
  },
  async (input) => textResult(await client.sendMedia(input))
);

server.registerTool(
  "download_whatsapp_media",
  {
    title: "Download WhatsApp media",
    description: "Download media from a locally stored WhatsApp message and return the local file path.",
    inputSchema: {
      chatJid: z.string().min(1),
      messageId: z.string().min(1)
    }
  },
  async ({ chatJid, messageId }) => textResult(await client.downloadMedia(chatJid, messageId))
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
