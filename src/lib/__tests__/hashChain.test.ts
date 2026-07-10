import { canonicalJson, hashEvent, verifyChain } from '../hashChain';
import type { IncidentEvent } from '../types';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // A deterministic stand-in: the chain logic under test only needs collision-free digests.
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => {
    let hash = 0n;
    for (const character of value)
      hash = (hash * 31n + BigInt(character.codePointAt(0) ?? 0)) % 2n ** 64n;
    return hash.toString(16).padStart(16, '0');
  }),
}));

async function buildChain(count: number): Promise<IncidentEvent[]> {
  const events: IncidentEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const body = {
      id: `evt-${index}`,
      type: 'sos.sent',
      actor: 'system' as const,
      timestamp: 1_000 + index,
      payload: { status: 'SENT' },
    };
    const prevHash = events.at(-1)?.hash ?? 'GENESIS';
    events.push({ ...body, prevHash, hash: await hashEvent(prevHash, body) });
  }
  return events;
}

describe('canonicalJson', () => {
  it('orders keys so an identical event always hashes identically', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ a: [{ y: 1, x: 2 }] })).toBe('{"a":[{"x":2,"y":1}]}');
  });

  it('drops undefined members, as a JSON round trip does', () => {
    expect(canonicalJson({ a: 1, location: undefined })).toBe('{"a":1}');
    expect(canonicalJson({ a: 1 })).toBe(canonicalJson({ a: 1, location: undefined }));
  });
});

describe('verifyChain', () => {
  it('accepts an intact chain and an empty chain', async () => {
    await expect(verifyChain(await buildChain(4))).resolves.toBe(true);
    await expect(verifyChain([])).resolves.toBe(true);
  });

  it('rejects a chain whose event payload was edited after hashing', async () => {
    const events = await buildChain(3);
    events[1] = { ...events[1], payload: { status: 'CANCELLED' } };
    await expect(verifyChain(events)).resolves.toBe(false);
  });

  it('rejects a chain with an event removed from the middle', async () => {
    const events = await buildChain(4);
    await expect(verifyChain([events[0], events[2], events[3]])).resolves.toBe(false);
  });

  it('still verifies after the chain is persisted and read back as JSON', async () => {
    // An SOS raised without a location fix carries `location: undefined`.
    const body = {
      id: 'evt-0',
      type: 'sos.created',
      actor: 'you' as const,
      timestamp: 1_000,
      payload: { type: 'police', silent: false, location: undefined },
    };
    const hash = await hashEvent('GENESIS', body);
    const events: IncidentEvent[] = [{ ...body, prevHash: 'GENESIS', hash }];

    const restored = JSON.parse(JSON.stringify(events)) as IncidentEvent[];
    await expect(verifyChain(restored)).resolves.toBe(true);
  });

  it('rejects a chain that does not start at GENESIS', async () => {
    const events = await buildChain(2);
    await expect(verifyChain([{ ...events[0], prevHash: 'FORGED' }, events[1]])).resolves.toBe(
      false,
    );
  });
});
