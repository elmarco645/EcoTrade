/**
 * EcoTrade — Listing Routes
 * 
 * All /api/listings/* routes and /api/cart/validate.
 */

import { Router } from 'express';
import { authenticateToken, sensitiveActionLimiter } from '../utils/middleware.ts';
import * as listingController from '../controllers/listing.controller.ts';

const router = Router();

router.get('/listings', listingController.getAllListings);
router.get('/listings/:id', listingController.getListingById);
router.post('/listings', authenticateToken, sensitiveActionLimiter, listingController.createListing);
router.post('/cart/validate', listingController.validateCart);

export default router;
