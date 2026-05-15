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
        raw_json TEXT NOT NULL,
        PRIMARY KEY (id, chat_jid)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_time
        ON messages (chat_jid, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_messages_text
        ON messages (text);
    `);
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
          (id, chat_jid, sender_jid, text, timestamp, is_from_me, message_type, raw_json)
         VALUES
          (@id, @chatJid, @senderJid, @text, @timestamp, @isFromMeInt, @messageType, @rawJson)`
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
                is_from_me AS isFromMe, message_type AS messageType, raw_json AS rawJson
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
                is_from_me AS isFromMe, message_type AS messageType, raw_json AS rawJson
         FROM messages
         WHERE text LIKE ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(`%${query}%`, limit)
      .map((row) => normalizeMessage(row as MessageRow));
  }
}

function normalizeMessage(row: MessageRow): StoredMessage {
  return {
    ...row,
    isFromMe: Boolean(row.isFromMe)
  };
}
