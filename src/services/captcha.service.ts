/**
 * EcoTrade — CAPTCHA Service
 * 
 * Google reCAPTCHA v2 verification.
 * If RECAPTCHA_SECRET is not configured, verification is skipped (demo mode).
 */

import axios from 'axios';
import { RECAPTCHA_SECRET } from '../utils/constants.ts';

/**
 * Verify a reCAPTCHA token with Google's API.
 * 
 * @param token - The reCAPTCHA response token from the frontend
 * @returns true if valid, false otherwise. Returns true if CAPTCHA is not configured.
 */
export const verifyCaptcha = async (token: string): Promise<boolean> => {
  if (!RECAPTCHA_SECRET) return true; // Skip if not configured for demo

  try {
    const res = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET,
          response: token,
        },
      }
    );
    return res.data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};
