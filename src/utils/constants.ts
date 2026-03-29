/**
 * EcoTrade — Environment Constants
 * 
 * Centralized access to all environment variables with safe defaults.
 * Never hardcode secrets — always use process.env.
 */

/** JWT signing secret. Falls back to a dev-only default. */
export const JWT_SECRET = process.env.JWT_SECRET || 'ecotrade_secret_key_123';

/** Google reCAPTCHA v2 secret key */
export const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

/** Gmail SMTP credentials */
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;

/** Google OAuth credentials */
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/** GitHub OAuth credentials */
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

/** Flutterwave payment keys */
export const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
export const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY;
export const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH;

/** Application URL for email links */
export const APP_URL = process.env.APP_URL;

/** Server port */
export const PORT = parseInt(process.env.PORT || '3000', 10);
