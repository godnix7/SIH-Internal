import * as Crypto from 'expo-crypto';
import type { IncidentEvent } from './types';

/**
 * Canonicalises exactly what a JSON round trip preserves: `undefined` object
 * members are dropped and `undefined` array slots become null, matching
 * JSON.stringify. Without this an event holding `location: undefined` hashes
 * one way in memory and another after being persisted and read back, which
 * breaks the chain on restore.
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

export async function hashEvent(
  previousHash: string,
  event: Omit<IncidentEvent, 'hash' | 'prevHash'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${previousHash}${canonicalJson(event)}`,
  );
}

export async function verifyChain(events: IncidentEvent[]): Promise<boolean> {
  let previousHash = 'GENESIS';
  for (const event of events) {
    const { hash, prevHash, ...body } = event;
    if (prevHash !== previousHash || (await hashEvent(prevHash, body)) !== hash) return false;
    previousHash = hash;
  }
  return true;
}
