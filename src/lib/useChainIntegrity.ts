import { useQuery } from '@tanstack/react-query';

import { verifyChain } from './hashChain';
import type { IncidentEvent } from './types';

export type ChainIntegrity = 'checking' | 'verified' | 'broken';

/** i18n key for the integrity summary; the caller supplies `count` for pluralisation. */
export function integrityKey(integrity: ChainIntegrity): string {
  if (integrity === 'checking') return 'sos.integrityChecking';
  if (integrity === 'broken') return 'sos.integrityBroken';
  return 'sos.integrityVerified';
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
