// src/types/events.ts

export enum EventType {
  USER_RUN = 'USER_RUN',
  USER_RESULT = 'USER_RESULT',
  USER_SOLVED = 'USER_SOLVED',
  USER_TYPING = 'USER_TYPING',
}

export interface EventPayload {
  type: EventType;
  battleId: string;
  userId: string;
  problemId?: string;
  submissionId?: string;
  data?: {
    status?: 'WA' | 'AC';
    [key: string]: any;
  };
  timestamp: number;
}
