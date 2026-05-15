import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
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
    if (!this.socket) {
      throw new Error("WhatsApp socket is not initialized.");
    }

    const source = resolveMediaSource(input.filePath, input.mediaUrl);

    const jid = normalizeRecipient(input.recipient);
    const mimeType = input.mimeType ?? inferMimeType(source.nameForMime);
    const fileName = input.fileName ?? source.fileName;
    const media = { url: source.url };
    const content =
      input.mediaType === "image"
        ? { image: media, caption: input.caption, mimetype: mimeType }
        : input.mediaType === "video"
          ? { video: media, caption: input.caption, mimetype: mimeType }
          : input.mediaType === "audio"
            ? { audio: media, mimetype: mimeType, ptt: Boolean(input.asVoice) }
            : { document: media, caption: input.caption, mimetype: mimeType, fileName };

    const result = await this.socket.sendMessage(jid, content);
    return {
      jid,
      messageId: result?.key?.id ?? null,
      mediaType: input.mediaType,
      fileName,
      mimeType,
      sourceType: source.sourceType
    };
  }

  async downloadMedia(chatJid: string, messageId: string) {
    if (!this.socket) {
      throw new Error("WhatsApp socket is not initialized.");
    }

    const stored = this.messageStore.getMessage(chatJid, messageId);
    if (!stored) {
      throw new Error("Message not found in local store.");
    }

    if (!stored.mediaType) {
      throw new Error("Message has no downloadable media metadata.");
    }

    if (stored.mediaLocalPath && fs.existsSync(stored.mediaLocalPath)) {
      return {
        chatJid,
        messageId,
        mediaType: stored.mediaType,
        fileName: stored.mediaFileName,
        localPath: stored.mediaLocalPath,
        sizeBytes: fs.statSync(stored.mediaLocalPath).size
      };
    }

    const rawMessage = JSON.parse(stored.rawJson);
    const buffer = await downloadMediaMessage(rawMessage, "buffer", {});
    const mediaDir = path.join(this.storeDir, "media", sanitizePathSegment(chatJid));
    fs.mkdirSync(mediaDir, { recursive: true });

    const fileName = stored.mediaFileName ?? `${messageId}.${extensionForMediaType(stored.mediaType)}`;
    const localPath = path.join(mediaDir, sanitizeFileName(fileName));
    fs.writeFileSync(localPath, buffer);
    this.messageStore.markMediaDownloaded(chatJid, messageId, localPath, buffer.byteLength);

    return {
      chatJid,
      messageId,
      mediaType: stored.mediaType,
      fileName,
      localPath,
      sizeBytes: buffer.byteLength
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
      ...extractMediaMetadata(message.message, id),
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

function extractMediaMetadata(message: any, messageId: string) {
  const media =
    message?.imageMessage ??
    message?.videoMessage ??
    message?.audioMessage ??
    message?.documentMessage ??
    null;

  const mediaType = message?.imageMessage
    ? "image"
    : message?.videoMessage
      ? "video"
      : message?.audioMessage
        ? "audio"
        : message?.documentMessage
          ? "document"
          : null;

  if (!mediaType || !media) {
    return {
      mediaType: null,
      mediaMimeType: null,
      mediaFileName: null,
      mediaLocalPath: null,
      mediaSizeBytes: null
    };
  }

  return {
    mediaType,
    mediaMimeType: media.mimetype ?? null,
    mediaFileName: media.fileName ?? `${messageId}.${extensionForMediaType(mediaType)}`,
    mediaLocalPath: null,
    mediaSizeBytes: typeof media.fileLength === "number" ? media.fileLength : null
  };
}

function normalizeRecipient(recipient: string): string {
  if (recipient.includes("@")) return recipient;
  return `${recipient.replace(/\D/g, "")}@s.whatsapp.net`;
}

function resolveMediaSource(filePath: string | undefined, mediaUrl: string | undefined) {
  if (filePath && mediaUrl) {
    throw new Error("Use only one media source: filePath or mediaUrl.");
  }

  if (mediaUrl) {
    const url = new URL(mediaUrl);
    if (url.protocol !== "https:") {
      throw new Error("mediaUrl must use HTTPS.");
    }

    const fileName = path.basename(decodeURIComponent(url.pathname)) || "media";
    return {
      url: mediaUrl,
      fileName,
      nameForMime: fileName,
      sourceType: "url"
    };
  }

  if (!filePath) {
    throw new Error("Provide filePath or mediaUrl.");
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Media file does not exist: ${absolutePath}`);
  }

  return {
    url: absolutePath,
    fileName: path.basename(absolutePath),
    nameForMime: absolutePath,
    sourceType: "file"
  };
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

function inferMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg; codecs=opus",
    ".opus": "audio/ogg; codecs=opus",
    ".wav": "audio/wav",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  return map[extension] ?? "application/octet-stream";
}

function extensionForMediaType(mediaType: string): string {
  const map: Record<string, string> = {
    image: "jpg",
    video: "mp4",
    audio: "ogg",
    document: "bin"
  };
  return map[mediaType] ?? "bin";
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9@._-]/g, "_");
}

function sanitizeFileName(value: string): string {
  return path.basename(value).replace(/[^a-zA-Z0-9._ -]/g, "_");
}
