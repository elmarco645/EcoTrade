/**
 * EcoTrade — Auth Routes
 * 
 * All /api/auth/* routes and the /auth/callback OAuth handler.
 */

import { Router } from 'express';
import { authLimiter } from '../utils/middleware.ts';
import * as authController from '../controllers/auth.controller.ts';

const router = Router();

// Auth endpoints with strict rate limiting
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.get('/auth/verify-email', authController.verifyEmail);
router.post('/auth/resend-verification', authLimiter, authController.resendVerification);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);

// OAuth URL endpoints
router.get('/auth/google/url', authController.getGoogleAuthUrl);
router.get('/auth/github/url', authController.getGithubAuthUrl);

export default router;
