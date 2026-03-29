/**
 * EcoTrade — User Routes
 * 
 * All /api/user/* routes for profile management.
 */

import { Router } from 'express';
import { authenticateToken, sensitiveActionLimiter } from '../utils/middleware.ts';
import { upload } from '../utils/upload.ts';
import * as userController from '../controllers/user.controller.ts';

const router = Router();

// Profile
router.get('/user/profile', authenticateToken, userController.getProfile);
router.patch('/user/profile', authenticateToken, sensitiveActionLimiter, userController.updateProfile);

// Password & Email
router.post('/user/change-password', authenticateToken, userController.changePassword);
router.post('/user/request-email-change', authenticateToken, userController.requestEmailChange);
router.get('/user/confirm-email-change', userController.confirmEmailChange);

// Uploads
router.post('/user/upload-avatar', authenticateToken, sensitiveActionLimiter, upload.single('avatar'), userController.uploadAvatar);
router.post('/user/upload-cover', authenticateToken, sensitiveActionLimiter, upload.single('cover'), userController.uploadCover);

// Identity & Data
router.post('/user/verify-id', authenticateToken, sensitiveActionLimiter, userController.verifyId);
router.get('/user/export-data', authenticateToken, userController.exportData);

// Account deletion
router.post('/user/delete-account', authenticateToken, userController.deleteAccount);
router.get('/user/undo-delete', userController.undoDelete);

export default router;
