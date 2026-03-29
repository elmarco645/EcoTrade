/**
 * EcoTrade — Offer Routes
 * 
 * All /api/offers/* routes.
 */

import { Router } from 'express';
import { authenticateToken, sensitiveActionLimiter } from '../utils/middleware.ts';
import * as offerController from '../controllers/offer.controller.ts';

const router = Router();

router.post('/offers', authenticateToken, sensitiveActionLimiter, offerController.createOffer);
router.get('/offers', authenticateToken, offerController.getOffers);
router.post('/offers/:id/accept', authenticateToken, offerController.acceptOffer);
router.post('/offers/:id/reject', authenticateToken, offerController.rejectOffer);

export default router;
