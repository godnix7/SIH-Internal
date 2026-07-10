import { useQuery } from '@tanstack/react-query';

import { verifyChain } from './hashChain';
import type { IncidentEvent } from './types';

export type ChainIntegrity = 'checking' | 'verified' | 'broken';

export function integrityLabel(events: IncidentEvent[], integrity: ChainIntegrity): string {
  const count = `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  if (integrity === 'checking') return `${count} · checking integrity`;
  if (integrity === 'broken') return `${count} · integrity check failed`;
  return `${count} · chain verified`;
}

/** Recomputes the SHA-256 event chain rather than asserting it is intact. */
export function useChainIntegrity(events: IncidentEvent[]): ChainIntegrity {
  const { data, isError } = useQuery({
    queryKey: ['chain-integrity', events.length, events.at(-1)?.hash ?? 'genesis'],
    queryFn: () => verifyChain(events),
    staleTime: Infinity,
    retry: false,
  });
  if (isError) return 'broken';
  if (data === undefined) return 'checking';
  return data ? 'verified' : 'broken';
}
