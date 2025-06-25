// src/utils/streamUtils.ts
import { Subject } from 'rxjs';

/**
 * Utility to create and manage stream subjects for subscriptions.
 */
export function getOrCreateSubject<T>(map: Map<string, Subject<T>>, key: string): Subject<T> {
  if (map.has(key)) return map.get(key)!;
  const subject = new Subject<T>();
  map.set(key, subject);
  return subject;
}

/**
 * Utility to register a stream subscription.
 */
export function registerStream(map: Map<string, any>, id: string, data: any) {
  map.set(id, data);
}
