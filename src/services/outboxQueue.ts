import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { priorityRank } from '@/src/lib/constants';
import type { QueuePriority } from '@/src/lib/types';

const KEY_NAME = 'yatri-shield.queue-key.v1';

export type OutboxItem = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: QueuePriority;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
};

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function id(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class OutboxQueue {
  private databasePromise?: Promise<SQLite.SQLiteDatabase>;

  private async database(): Promise<SQLite.SQLiteDatabase> {
    if (!this.databasePromise) this.databasePromise = this.open();
    return this.databasePromise;
  }

  private async open(): Promise<SQLite.SQLiteDatabase> {
    const database = await SQLite.openDatabaseAsync('yatri-shield.db');
    let key = await SecureStore.getItemAsync(KEY_NAME);
    if (!key) {
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${id()}-${Date.now()}`,
      );
      await SecureStore.setItemAsync(KEY_NAME, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    // SQLCipher is enabled through the Expo config plugin. The key itself never enters SQLite storage.
    await database.execAsync(`PRAGMA key = '${escapeSqlString(key)}';`);
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        priority TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS outbox_due_idx ON outbox(next_attempt_at, priority, created_at);
    `);
    return database;
  }

  async enqueue(
    type: string,
    payload: Record<string, unknown>,
    priority: QueuePriority,
  ): Promise<OutboxItem> {
    const item: OutboxItem = {
      id: id(),
      type,
      payload,
      priority,
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
    };
    const database = await this.database();
    await database.runAsync(
      'INSERT INTO outbox (id, type, payload, priority, attempts, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      item.id,
      item.type,
      JSON.stringify(item.payload),
      item.priority,
      item.attempts,
      item.nextAttemptAt,
      item.createdAt,
    );
    return item;
  }

  async due(limit = 25): Promise<OutboxItem[]> {
    const database = await this.database();
    const rows = await database.getAllAsync<
      Omit<OutboxItem, 'payload' | 'nextAttemptAt' | 'createdAt'> & {
        payload: string;
        next_attempt_at: number;
        created_at: number;
      }
    >(
      "SELECT * FROM outbox WHERE next_attempt_at <= ? ORDER BY CASE priority WHEN 'SOS' THEN 0 WHEN 'GEOFENCE_CRITICAL' THEN 1 WHEN 'CHECKIN' THEN 2 WHEN 'LOCATION_BATCH' THEN 3 ELSE 4 END, created_at ASC LIMIT ?",
      Date.now(),
      limit,
    );
    return rows
      .map((row) => ({
        ...row,
        payload: JSON.parse(row.payload) as Record<string, unknown>,
        nextAttemptAt: row.next_attempt_at,
        createdAt: row.created_at,
      }))
      .sort(
        (a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.createdAt - b.createdAt,
      );
  }

  async acknowledge(itemId: string): Promise<void> {
    const database = await this.database();
    await database.runAsync('DELETE FROM outbox WHERE id = ?', itemId);
  }

  async retry(item: OutboxItem): Promise<void> {
    const database = await this.database();
    const attempts = item.attempts + 1;
    const cap = item.priority === 'SOS' ? 30_000 : 5 * 60_000;
    const base = item.priority === 'SOS' ? 1_000 : 2_000;
    const delay = Math.min(cap, base * 2 ** attempts) + Math.floor(Math.random() * 500);
    await database.runAsync(
      'UPDATE outbox SET attempts = ?, next_attempt_at = ? WHERE id = ?',
      attempts,
      Date.now() + delay,
      item.id,
    );
  }
}

export const outboxQueue = new OutboxQueue();
