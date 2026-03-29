/**
 * EcoTrade — Route Aggregator
 * 
 * Registers all API route groups onto the Express app.
 * Each route module provides an Express Router mounted under /api/.
 * 
 * The OAuth callback is mounted at the root level (/auth/callback)
 * because it's not a JSON API endpoint.
 */

import { Express } from 'express';
import { apiLimiter } from '../utils/middleware.ts';
import { oauthCallback } from '../controllers/auth.controller.ts';

import authRoutes from './auth.routes.ts';
import userRoutes from './user.routes.ts';
import listingRoutes from './listing.routes.ts';
import offerRoutes from './offer.routes.ts';
import orderRoutes from './order.routes.ts';
import walletRoutes from './wallet.routes.ts';
import reviewRoutes from './review.routes.ts';
import paymentRoutes from './payment.routes.ts';

/**
 * Register all API routes on the Express application.
 * 
 * @param app - Express application instance
 */
export function registerRoutes(app: Express): void {
  // Apply general rate limiter to all API routes
  app.use('/api/', apiLimiter);

  // Health check (outside of route modules for simplicity)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Mount all route modules under /api/
  app.use('/api/', authRoutes);
  app.use('/api/', userRoutes);
  app.use('/api/', listingRoutes);
  app.use('/api/', offerRoutes);
  app.use('/api/', orderRoutes);
  app.use('/api/', walletRoutes);
  app.use('/api/', reviewRoutes);
  app.use('/api/', paymentRoutes);

  // OAuth callback (root-level, not under /api/)
  app.get('/auth/callback', oauthCallback);
}
