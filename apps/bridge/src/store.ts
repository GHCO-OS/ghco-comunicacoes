import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type StoredChat = {
  jid: string;
  name: string | null;
  lastMessageAt: string | null;
};

export type StoredMessage = {
  id: string;
  chatJid: string;
  senderJid: string | null;
  text: string | null;
  timestamp: string;
  isFromMe: boolean;
  messageType: string;
  mediaType: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  mediaLocalPath: string | null;
  mediaSizeBytes: number | null;
  rawJson: string;
};

type MessageRow = Omit<StoredMessage, "isFromMe"> & {
  isFromMe: number;
};

export class MessageStore {
  private readonly db: Database.Database;

  constructor(storeDir: string) {
    fs.mkdirSync(storeDir, { recursive: true });
    this.db = new Database(path.join(storeDir, "messages.db"));
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        jid TEXT PRIMARY KEY,
        name TEXT,
        last_message_at TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT NOT NULL,
        chat_jid TEXT NOT NULL,
        sender_jid TEXT,
        text TEXT,
        timestamp TEXT NOT NULL,
        is_from_me INTEGER NOT NULL,
        message_type TEXT NOT NULL,
        media_type TEXT,
        media_mime_type TEXT,
        media_file_name TEXT,
        media_local_path TEXT,
        media_size_bytes INTEGER,
        raw_json TEXT NOT NULL,
        PRIMARY KEY (id, chat_jid)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_time
        ON messages (chat_jid, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_messages_text
        ON messages (text);
    `);

    this.migrate();
  }

  upsertChat(chat: StoredChat): void {
    this.db
      .prepare(
        `INSERT INTO chats (jid, name, last_message_at)
         VALUES (@jid, @name, @lastMessageAt)
         ON CONFLICT(jid) DO UPDATE SET
           name = COALESCE(excluded.name, chats.name),
           last_message_at = excluded.last_message_at`
      )
      .run(chat);
  }

  upsertMessage(message: StoredMessage): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO messages
          (id, chat_jid, sender_jid, text, timestamp, is_from_me, message_type,
           media_type, media_mime_type, media_file_name, media_local_path, media_size_bytes, raw_json)
         VALUES
          (@id, @chatJid, @senderJid, @text, @timestamp, @isFromMeInt, @messageType,
           @mediaType, @mediaMimeType, @mediaFileName, @mediaLocalPath, @mediaSizeBytes, @rawJson)`
      )
      .run({ ...message, isFromMeInt: message.isFromMe ? 1 : 0 });
  }

  listChats(limit: number): StoredChat[] {
    return this.db
      .prepare(
        `SELECT jid, name, last_message_at AS lastMessageAt
         FROM chats
         ORDER BY COALESCE(last_message_at, '') DESC
         LIMIT ?`
      )
      .all(limit) as StoredChat[];
  }

  listMessages(chatJid: string, limit: number): StoredMessage[] {
    return this.db
      .prepare(
        `SELECT id, chat_jid AS chatJid, sender_jid AS senderJid, text, timestamp,
                is_from_me AS isFromMe, message_type AS messageType,
                media_type AS mediaType, media_mime_type AS mediaMimeType,
                media_file_name AS mediaFileName, media_local_path AS mediaLocalPath,
                media_size_bytes AS mediaSizeBytes, raw_json AS rawJson
         FROM messages
         WHERE chat_jid = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(chatJid, limit)
      .map((row) => normalizeMessage(row as MessageRow));
  }

  searchMessages(query: string, limit: number): StoredMessage[] {
    return this.db
      .prepare(
        `SELECT id, chat_jid AS chatJid, sender_jid AS senderJid, text, timestamp,
                is_from_me AS isFromMe, message_type AS messageType,
                media_type AS mediaType, media_mime_type AS mediaMimeType,
                media_file_name AS mediaFileName, media_local_path AS mediaLocalPath,
                media_size_bytes AS mediaSizeBytes, raw_json AS rawJson
         FROM messages
         WHERE text LIKE ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(`%${query}%`, limit)
      .map((row) => normalizeMessage(row as MessageRow));
  }

  getMessage(chatJid: string, messageId: string): StoredMessage | null {
    const row = this.db
      .prepare(
        `SELECT id, chat_jid AS chatJid, sender_jid AS senderJid, text, timestamp,
                is_from_me AS isFromMe, message_type AS messageType,
                media_type AS mediaType, media_mime_type AS mediaMimeType,
                media_file_name AS mediaFileName, media_local_path AS mediaLocalPath,
                media_size_bytes AS mediaSizeBytes, raw_json AS rawJson
         FROM messages
         WHERE chat_jid = ? AND id = ?`
      )
      .get(chatJid, messageId);

    return row ? normalizeMessage(row as MessageRow) : null;
  }

  listMediaMessages(limit: number): StoredMessage[] {
    return this.db
      .prepare(
        `SELECT id, chat_jid AS chatJid, sender_jid AS senderJid, text, timestamp,
                is_from_me AS isFromMe, message_type AS messageType,
                media_type AS mediaType, media_mime_type AS mediaMimeType,
                media_file_name AS mediaFileName, media_local_path AS mediaLocalPath,
                media_size_bytes AS mediaSizeBytes, raw_json AS rawJson
         FROM messages
         WHERE media_type IS NOT NULL
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(limit)
      .map((row) => normalizeMessage(row as MessageRow));
  }

  markMediaDownloaded(chatJid: string, messageId: string, localPath: string, sizeBytes: number): void {
    this.db
      .prepare(
        `UPDATE messages
         SET media_local_path = ?, media_size_bytes = ?
         WHERE chat_jid = ? AND id = ?`
      )
      .run(localPath, sizeBytes, chatJid, messageId);
  }

  private migrate(): void {
    const columns = new Set(
      (this.db.prepare("PRAGMA table_info(messages)").all() as Array<{ name: string }>).map((column) => column.name)
    );

    const migrations: Array<[string, string]> = [
      ["media_type", "ALTER TABLE messages ADD COLUMN media_type TEXT"],
      ["media_mime_type", "ALTER TABLE messages ADD COLUMN media_mime_type TEXT"],
      ["media_file_name", "ALTER TABLE messages ADD COLUMN media_file_name TEXT"],
      ["media_local_path", "ALTER TABLE messages ADD COLUMN media_local_path TEXT"],
      ["media_size_bytes", "ALTER TABLE messages ADD COLUMN media_size_bytes INTEGER"]
    ];

    for (const [column, sql] of migrations) {
      if (!columns.has(column)) {
        this.db.exec(sql);
      }
    }
  }
}

function normalizeMessage(row: MessageRow): StoredMessage {
  return {
    ...row,
    isFromMe: Boolean(row.isFromMe)
  };
}
