/**
 * EcoTrade — Middleware
 * 
 * Authentication middleware and rate limiter configurations.
 * Extracted from the monolithic server.ts for separation of concerns.
 */

import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import db from '../../backend/db.ts';
import { JWT_SECRET } from './constants.ts';

/**
 * JWT Authentication Middleware
 * 
 * Verifies the Bearer token from the Authorization header.
 * Also checks if the user's account has been scheduled for deletion.
 * 
 * @throws 401 if no token is provided
 * @throws 403 if token is invalid or account is deleted
 */
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);

    // Check if user account is scheduled for deletion
    const dbUser: any = db.prepare('SELECT deleted_at FROM users WHERE id = ?').get(user.id);
    if (dbUser && dbUser.deleted_at) {
      return res.status(403).json({ error: 'Account scheduled for deletion' });
    }

    req.user = user;
    next();
  });
};

// --- Rate Limiting Configuration ---

/**
 * Shared key generator to handle proxy headers.
 * Extracts the client IP from forwarded/x-forwarded-for headers,
 * falling back to req.ip.
 */
const keyGenerator = (req: any) => {
  const forwarded = req.headers["forwarded"];
  const xForwardedFor = req.headers["x-forwarded-for"];

  if (forwarded) {
    const match = forwarded.match(/for=([^;]+)/);
    if (match) return match[1];
  }

  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  return req.ip;
};

/** Common validation settings for rate limiters */
const commonValidate = {
  xForwardedForHeader: false,
  forwardedHeader: false,
};

/**
 * General API Limiter — 100 requests per 15 minutes
 * Applied to all /api/ routes as a baseline.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: commonValidate,
});

/**
 * Authentication Limiter — 10 requests per 15 minutes
 * Stricter limiter for login, register, and password reset endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: commonValidate,
});

/**
 * Sensitive Action Limiter — 20 requests per 15 minutes
 * For creating listings, sending messages, wallet actions, etc.
 */
export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many actions performed, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: commonValidate,
});
