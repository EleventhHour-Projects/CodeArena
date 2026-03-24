// src/services/emitter.ts
import { type EventPayload } from '../types/events.js';

/**
 * Emits an event to a specific battle.
 * Placeholder function for future WebSocket or Redis integration.
 */
export function emitEventToBattle(battleId: string, event: EventPayload): void {
  // Structured log for future extensibility
  console.log("[WSS_EMIT]", {
    battleId,
    type: event.type,
    userId: event.userId,
    problemId: event.problemId,
    data: event.data
  });

  // Future Logic:
  // - wss.to(battleId).emit('event', event);
  // - redis.publish(`battle:${battleId}`, JSON.stringify(event));
}
