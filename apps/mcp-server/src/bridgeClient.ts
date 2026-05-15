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
  messageType: z.string(),
  mediaType: z.string().nullable(),
  mediaMimeType: z.string().nullable(),
  mediaFileName: z.string().nullable(),
  mediaLocalPath: z.string().nullable(),
  mediaSizeBytes: z.number().nullable(),
  rawJson: z.string().optional()
});

const ContactAuditItemSchema = z.object({
  jid: z.string(),
  chatKind: z.enum(["direct", "group", "newsletter", "lid", "unknown"]),
  phone: z.string().nullable(),
  last4: z.string().nullable(),
  displayName: z.string().nullable(),
  inferredName: z.string().nullable(),
  suggestedContactName: z.string().nullable(),
  savedStatus: z.enum(["likely_saved", "likely_unsaved", "unknown", "group", "non_phone_id"]),
  reason: z.string(),
  isGroup: z.boolean(),
  isPhoneBacked: z.boolean(),
  lastMessageAt: z.string().nullable()
});

const ContactAuditSchema = z.object({
  ok: z.literal(true),
  summary: z.object({
    total: z.number(),
    individualChats: z.number(),
    groups: z.number(),
    nonPhoneIds: z.number(),
    likelySaved: z.number(),
    likelyUnsaved: z.number(),
    unknown: z.number()
  }),
  contacts: z.array(ContactAuditItemSchema)
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

  async auditContacts(limit: number, includeGroups: boolean, includeNonPhoneIds: boolean) {
    return this.request(
      `/api/audit/contacts?limit=${encodeURIComponent(String(limit))}&includeGroups=${encodeURIComponent(String(includeGroups))}&includeNonPhoneIds=${encodeURIComponent(String(includeNonPhoneIds))}`,
      ContactAuditSchema
    );
  }

  async auditarGoogleContacts(input: {
    limit: number;
    includeSaved: boolean;
    fallbackNamePrefix: string;
    nameOverrides: Array<{ phone: string; name: string }>;
  }) {
    return this.request(
      "/api/audit/google-contacts",
      z.object({
        ok: z.literal(true),
        outputPath: z.string(),
        totalRows: z.number(),
        rows: z.array(
          z.object({
            name: z.string(),
            phone: z.string(),
            sourceStatus: z.string(),
            sourceJid: z.string()
          })
        ),
        csvPreview: z.string()
      }),
      true,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
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

  async getMessage(jid: string, messageId: string) {
    const result = await this.request(
      `/api/chats/${encodeURIComponent(jid)}/messages/${encodeURIComponent(messageId)}`,
      z.object({ ok: z.literal(true), message: MessageSchema })
    );
    return result.message;
  }

  async listMediaMessages(limit: number) {
    const result = await this.request(
      `/api/media?limit=${encodeURIComponent(String(limit))}`,
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

  async sendNumberedMenu(input: {
    recipient: string;
    title?: string;
    body: string;
    options: Array<{ label: string; responseText: string }>;
    footer?: string;
    invalidResponseText?: string;
    expiresInMinutes: number;
  }) {
    return this.request(
      "/api/messages/send-form",
      z.object({
        ok: z.literal(true),
        result: z.object({
          jid: z.string(),
          messageId: z.string().nullable(),
          menuText: z.string(),
          expiresInMinutes: z.number(),
          options: z.array(z.object({ number: z.number(), label: z.string() }))
        })
      }),
      true,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  }

  async sendMedia(input: {
    recipient: string;
    filePath?: string;
    mediaUrl?: string;
    mediaType: "image" | "video" | "audio" | "document";
    caption?: string;
    fileName?: string;
    mimeType?: string;
    asVoice?: boolean;
  }) {
    return this.request(
      "/api/messages/send-media",
      z.object({
        ok: z.literal(true),
        result: z.object({
          jid: z.string(),
          messageId: z.string().nullable(),
          mediaType: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          sourceType: z.string()
        })
      }),
      true,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  }

  async formatMessage(input: { title?: string; body?: string; quotes: string[]; footer?: string }) {
    return this.request(
      "/api/messages/format",
      z.object({
        ok: z.literal(true),
        text: z.string()
      }),
      true,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  }

  async downloadMedia(chatJid: string, messageId: string) {
    return this.request(
      "/api/media/download",
      z.object({
        ok: z.literal(true),
        result: z.object({
          chatJid: z.string(),
          messageId: z.string(),
          mediaType: z.string(),
          fileName: z.string().nullable(),
          localPath: z.string(),
          sizeBytes: z.number()
        })
      }),
      true,
      {
        method: "POST",
        body: JSON.stringify({ chatJid, messageId })
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
