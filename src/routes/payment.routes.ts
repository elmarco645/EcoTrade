/**
 * EcoTrade — Payment Routes
 * 
 * Routes for Flutterwave payment initiation, verification, and webhook.
 */

import { Router } from 'express';
import { authenticateToken, sensitiveActionLimiter } from '../utils/middleware.ts';
import * as paymentController from '../controllers/payment.controller.ts';

const router = Router();

router.post('/pay', authenticateToken, sensitiveActionLimiter, paymentController.initiatePay);
router.get('/pay/verify', authenticateToken, paymentController.verifyPayment);
router.post('/webhook/flutterwave', paymentController.flutterwaveWebhook);

export default router;
