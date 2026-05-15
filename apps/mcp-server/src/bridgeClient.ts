import { z } from "zod";

const ChatSchema = z.object({
  jid: z.string(),
  name: z.string().nullable(),
  lastMessageAt: z.string().nullable()
});

const MessageSchema = z.object({
  id: z.string(),
  chatJid: z.string(),
  senderJid: z.string().nullable(),
  text: z.string().nullable(),
  timestamp: z.string(),
  isFromMe: z.boolean(),
  messageType: z.string()
});

export class BridgeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  async health() {
    return this.request("/health", z.unknown(), false);
  }

  async listChats(limit: number) {
    const result = await this.request(
      `/api/chats?limit=${encodeURIComponent(String(limit))}`,
      z.object({ ok: z.literal(true), chats: z.array(ChatSchema) })
    );
    return result.chats;
  }

  async searchMessages(query: string, limit: number) {
    const result = await this.request(
      `/api/messages/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
      z.object({ ok: z.literal(true), messages: z.array(MessageSchema) })
    );
    return result.messages;
  }

  async getChatMessages(jid: string, limit: number) {
    const result = await this.request(
      `/api/chats/${encodeURIComponent(jid)}/messages?limit=${encodeURIComponent(String(limit))}`,
      z.object({ ok: z.literal(true), messages: z.array(MessageSchema) })
    );
    return result.messages;
  }

  async sendMessage(recipient: string, text: string) {
    return this.request(
      "/api/messages/send",
      z.object({
        ok: z.literal(true),
        result: z.object({
          jid: z.string(),
          messageId: z.string().nullable()
        })
      }),
      true,
      {
        method: "POST",
        body: JSON.stringify({ recipient, text })
      }
    );
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    authenticated = true,
    init: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");

    if (authenticated) {
      headers.set("authorization", `Bearer ${this.token}`);
    }

    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      headers
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(`Bridge request failed (${response.status}): ${text}`);
    }

    return schema.parse(data);
  }
}

