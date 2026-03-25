// src/routes/internalRoutes.ts
import { Router, type Request, type Response } from 'express';
import { EventType, type EventPayload } from '../types/events.js';
import { emitEventToBattle } from '../services/emitter.js';
import { internalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/event', internalAuth, (req: Request, res: Response): void => {
  let { type, battleId, userId, problemId, submissionId, data, timestamp, event: goEvent } = req.body;

  // Map Go 'event' field to TS 'type' field if needed
  if (!type && goEvent) {
    switch (goEvent) {
      case 'EVENTRUN':
        type = EventType.USER_RUN;
        break;
      case 'EVENTSUBMIT':
        type = EventType.USER_RUN;
        break;
      case 'EVENTRUNPASS':
        type = EventType.USER_RESULT;
        data = { status: 'AC' };
        break;
      case 'EVENTRUNFAIL':
        type = EventType.USER_RESULT;
        data = { status: 'WA' };
        break;
      case 'EVENTTYPESUBMITPASS':
      case 'EVENTSUBMITPASS':
        type = EventType.USER_SOLVED;
        data = { status: 'AC' };
        break;
      case 'EVENTTYPESUBMITFAIL':
      case 'EVENTSUBMITFAIL':
        type = EventType.USER_RESULT;
        data = { status: 'WA' };
        break;
      default:
        type = goEvent;
    }
  }

  if (!type || !battleId || !userId) {
    res.status(400).json({ error: 'Missing required fields: type, battleId, or userId' });
    return;
  }

  const event: EventPayload = {
    type: type as EventType,
    battleId,
    userId,
    problemId,
    submissionId,
    data,
    timestamp: timestamp || Date.now()
  };

  try {
    // Forward to Emitter
    emitEventToBattle(battleId, event);

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('[INTERNAL_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
