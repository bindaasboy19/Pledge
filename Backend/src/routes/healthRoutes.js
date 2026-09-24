import { Router } from 'express';
import { isDbConnected } from '../config/db.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: isDbConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
