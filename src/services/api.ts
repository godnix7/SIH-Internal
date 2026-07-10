import { outboxQueue } from './outboxQueue';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000';

export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  const due = await outboxQueue.due();
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
      sent += 1;
    } catch {
      await outboxQueue.retry(item);
      failed += 1;
    }
  }
  return { sent, failed };
}
