import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode-terminal";
import type { MessageStore } from "./store.js";

type Socket = ReturnType<typeof makeWASocket>;

export class WhatsAppClient {
  private socket: Socket | null = null;
  private connection = "starting";
  private lastError: string | null = null;
  private me: string | null = null;

  constructor(
    private readonly storeDir: string,
    private readonly messageStore: MessageStore
  ) {}

  async start(): Promise<void> {
    const authDir = path.join(this.storeDir, "auth");
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    const logger = P({ level: process.env.GHCO_LOG_LEVEL ?? "info" });

    this.socket = makeWASocket({
      auth: state,
      version,
      logger,
      printQRInTerminal: false,
      syncFullHistory: false
    });

    this.socket.ev.on("creds.update", saveCreds);
    this.socket.ev.on("connection.update", (update) => {
      this.connection = update.connection ?? this.connection;
      this.lastError = update.lastDisconnect?.error?.message ?? null;
      this.me = this.socket?.user?.id ?? this.me;

      if (update.qr) {
        console.log("Scan this QR Code with WhatsApp Linked Devices:");
        qrcode.generate(update.qr, { small: true });
      }

      const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      if (update.connection === "close" && statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => void this.start(), 3000);
      }
    });

    this.socket.ev.on("messages.upsert", ({ messages }) => {
      for (const message of messages) {
        this.persistIncomingMessage(message);
      }
    });
  }

  getStatus() {
    return {
      connection: this.connection,
      lastError: this.lastError,
      me: this.me
    };
  }

  async sendText(recipient: string, text: string) {
    if (!this.socket) {
      throw new Error("WhatsApp socket is not initialized.");
    }

    const jid = normalizeRecipient(recipient);
    const result = await this.socket.sendMessage(jid, { text });
    return {
      jid,
      messageId: result?.key?.id ?? null
    };
  }

  private persistIncomingMessage(message: any): void {
    const chatJid = message.key?.remoteJid;
    const id = message.key?.id;

    if (!chatJid || !id || chatJid === "status@broadcast") {
      return;
    }

    const text = extractText(message.message);
    const messageType = Object.keys(message.message ?? {})[0] ?? "unknown";

    if (!text && messageType === "unknown") {
      return;
    }

    const timestamp = toIsoTimestamp(message.messageTimestamp);
    const senderJid = message.key?.participant ?? message.key?.remoteJid ?? null;

    this.messageStore.upsertChat({
      jid: chatJid,
      name: message.pushName ?? null,
      lastMessageAt: timestamp
    });

    this.messageStore.upsertMessage({
      id,
      chatJid,
      senderJid,
      text,
      timestamp,
      isFromMe: Boolean(message.key?.fromMe),
      messageType,
      rawJson: JSON.stringify(message)
    });
  }
}

function extractText(message: any): string | null {
  if (!message) return null;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    null
  );
}

function normalizeRecipient(recipient: string): string {
  if (recipient.includes("@")) return recipient;
  return `${recipient.replace(/\D/g, "")}@s.whatsapp.net`;
}

function toIsoTimestamp(value: unknown): string {
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  if (typeof value === "object" && value && "toNumber" in value) {
    return new Date((value as { toNumber: () => number }).toNumber() * 1000).toISOString();
  }

  return new Date().toISOString();
}

