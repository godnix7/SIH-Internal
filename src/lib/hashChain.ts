import * as Crypto from 'expo-crypto';
import type { IncidentEvent } from './types';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
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
