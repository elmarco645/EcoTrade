/**
 * EcoTrade — Wallet & Transaction Routes
 * 
 * Routes for wallet balance, transaction history, purchases, and checkout.
 */

import { Router } from 'express';
import { authenticateToken, sensitiveActionLimiter } from '../utils/middleware.ts';
import * as walletController from '../controllers/wallet.controller.ts';

const router = Router();

// Wallet
router.get('/user/wallet', authenticateToken, walletController.getWalletBalance);
router.get('/user/transactions', authenticateToken, walletController.getUserTransactions);

// Purchase & Checkout
router.post('/transactions/buy', authenticateToken, walletController.buyWithWallet);
router.post('/transactions/checkout', authenticateToken, sensitiveActionLimiter, walletController.checkout);
router.post('/transactions/:id/confirm', authenticateToken, walletController.confirmTransaction);

export default router;
