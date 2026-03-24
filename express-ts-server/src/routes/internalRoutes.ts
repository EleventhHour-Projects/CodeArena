// src/routes/internalRoutes.ts
import { Router, type Request, type Response } from 'express';
import { EventType, type EventPayload } from '../types/events.js';
import { emitEventToBattle } from '../services/emitter.js';
import { internalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/event', internalAuth, (req: Request, res: Response): void => {
  const { type, battleId, userId, problemId, submissionId, data, timestamp } = req.body;

  if (!type || !battleId || !userId) {
    res.status(400).json({ error: 'Missing required fields: type, battleId, or userId' });
    return;
  }

  if (type === EventType.USER_RESULT && (!data || !data.status)) {
    res.status(400).json({ error: 'USER_RESULT requires data.status' });
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
