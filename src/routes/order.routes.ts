/**
 * EcoTrade — Order Routes
 * 
 * All /api/orders/* routes.
 */

import { Router } from 'express';
import { authenticateToken } from '../utils/middleware.ts';
import * as orderController from '../controllers/order.controller.ts';

const router = Router();

router.get('/orders', authenticateToken, orderController.getOrders);
router.post('/orders/:id/ship', authenticateToken, orderController.shipOrder);
router.post('/orders/:id/deliver', authenticateToken, orderController.deliverOrder);
router.post('/orders/:id/confirm', authenticateToken, orderController.confirmOrder);
router.post('/orders/:id/dispute', authenticateToken, orderController.disputeOrder);

export default router;
