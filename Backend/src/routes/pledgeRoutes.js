import { Router } from 'express';
import { getPledgeCount, submitPledge } from '../controllers/pledgeController.js';
import { pledgeSubmissionLimiter } from '../middleware/rateLimiter.js';

export const pledgeRouter = Router();

// GET /api/pledges/count -> Live total count from MongoDB
pledgeRouter.get('/count', getPledgeCount);

// POST /api/pledges -> Record commitment and optionally dispatch certificate
pledgeRouter.post('/', pledgeSubmissionLimiter, submitPledge);

export default pledgeRouter;
