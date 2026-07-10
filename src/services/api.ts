import { outboxQueue } from './outboxQueue';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000';

export type FlushResult = { sent: number; failed: number; sentTypes: string[] };

export async function flushOutbox(): Promise<FlushResult> {
  const due = await outboxQueue.due();
  const sentTypes: string[] = [];
  let sent = 0;
  let failed = 0;
  for (const item of due) {
    try {
      const response = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.id },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      await outboxQueue.acknowledge(item.id);
      sentTypes.push(item.type);
      sent += 1;
    } catch {
      await outboxQueue.retry(item);
      failed += 1;
    }
  }
  return { sent, failed, sentTypes };
}
