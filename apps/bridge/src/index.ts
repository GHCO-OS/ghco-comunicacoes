import express from "express";
import { z } from "zod";
import { requireBearerToken } from "./auth.js";
import { getConfig } from "./config.js";
import { MessageStore } from "./store.js";
import { WhatsAppClient } from "./whatsappClient.js";

const config = getConfig();
const app = express();
const store = new MessageStore(config.storeDir);
const whatsapp = new WhatsAppClient(config.storeDir, store);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "ghco-comunicacoes-bridge",
    whatsapp: whatsapp.getStatus()
  });
});

app.use("/api", requireBearerToken(config.token));

app.get("/api/chats", (request, response) => {
  const limit = boundedNumber(request.query.limit, 50, 1, 200);
  response.json({ ok: true, chats: store.listChats(limit) });
});

app.get("/api/chats/:jid/messages", (request, response) => {
  const limit = boundedNumber(request.query.limit, 50, 1, 200);
  response.json({ ok: true, messages: store.listMessages(request.params.jid, limit) });
});

app.get("/api/chats/:jid/messages/:messageId", (request, response) => {
  const message = store.getMessage(request.params.jid, request.params.messageId);
  if (!message) {
    response.status(404).json({ ok: false, error: "Message not found." });
    return;
  }

  response.json({ ok: true, message });
});

app.get("/api/media", (request, response) => {
  const limit = boundedNumber(request.query.limit, 50, 1, 200);
  response.json({ ok: true, messages: store.listMediaMessages(limit) });
});

app.get("/api/messages/search", (request, response) => {
  const query = z.string().min(1).parse(request.query.q);
  const limit = boundedNumber(request.query.limit, 20, 1, 100);
  response.json({ ok: true, messages: store.searchMessages(query, limit) });
});

app.post("/api/messages/send", async (request, response, next) => {
  try {
    const input = z
      .object({
        recipient: z.string().min(6),
        text: z.string().min(1).max(4000)
      })
      .parse(request.body);

    const result = await whatsapp.sendText(input.recipient, input.text);
    response.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/messages/send-media", async (request, response, next) => {
  try {
    const input = z
      .object({
        recipient: z.string().min(6),
        filePath: z.string().min(1),
        mediaType: z.enum(["image", "video", "audio", "document"]),
        caption: z.string().max(4000).optional(),
        fileName: z.string().min(1).optional(),
        mimeType: z.string().min(3).optional(),
        asVoice: z.boolean().optional()
      })
      .parse(request.body);

    const result = await whatsapp.sendMedia(input);
    response.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/media/download", async (request, response, next) => {
  try {
    const input = z
      .object({
        chatJid: z.string().min(1),
        messageId: z.string().min(1)
      })
      .parse(request.body);

    const result = await whatsapp.downloadMedia(input.chatJid, input.messageId);
    response.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  response.status(400).json({ ok: false, error: message });
});

await whatsapp.start();

app.listen(config.port, config.host, () => {
  console.log(`GHCO Comunicacoes bridge listening at http://${config.host}:${config.port}`);
});

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = Number(first ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
