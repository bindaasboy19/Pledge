import { Router } from 'express';
import { verifyCertificate } from '../controllers/certificateController.js';
import { verifyLimiter } from '../middleware/rateLimiter.js';

export const certificateRouter = Router();

// Apply dedicated rate limiter to public verification endpoint
certificateRouter.use(verifyLimiter);

// Supports both wildcard path (/api/certificates/verify/NF/CSP/26000001) and query param (?id=...)
certificateRouter.get('/verify/*certificateId', verifyCertificate);
certificateRouter.get('/verify', verifyCertificate);

export default certificateRouter;
