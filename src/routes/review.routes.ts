/**
 * EcoTrade — Review Routes
 * 
 * Routes for creating reviews and fetching seller reviews.
 */

import { Router } from 'express';
import { authenticateToken } from '../utils/middleware.ts';
import * as reviewController from '../controllers/review.controller.ts';

const router = Router();

router.post('/reviews', authenticateToken, reviewController.createReview);
router.get('/sellers/:id/reviews', reviewController.getSellerReviews);

export default router;
