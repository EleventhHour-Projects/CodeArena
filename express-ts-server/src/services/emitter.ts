// src/services/emitter.ts
import { type EventPayload } from '../types/events.js';
import { Server } from "socket.io";

let io: Server | null = null;

export function setIO(ioInstance: Server) {
  io = ioInstance;
}

export function emitEventToBattle(battleId: string, event: EventPayload): void {
  // Structured log for future extensibility
  console.log("[WSS_EMIT]", {
    battleId,
    type: event.type,
    userId: event.userId,
    problemId: event.problemId,
    data: event.data
  });

  if (!io) {
    console.error("Socket.IO not initialized");
    return;
  }
  io.to(battleId).emit("event", event);
}
