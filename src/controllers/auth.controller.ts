/**
 * EcoTrade — Auth Controller
 * 
 * Handles: registration, login, email verification, password reset, OAuth.
 * All async handlers wrapped in try/catch per protocol.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import db from '../../backend/db.ts';
import { JWT_SECRET, RECAPTCHA_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, APP_URL } from '../utils/constants.ts';
import { verifyCaptcha } from '../services/captcha.service.ts';
import { sendVerificationEmail, sendForgotPasswordEmail } from '../services/email.service.ts';

/**
 * Detect whether the login identifier is an email, phone number, or username.
 */
function detectInputType(input: string): 'email' | 'phone' | 'username' {
  if (input.includes("@")) return "email";
  if (/^\+?\d{10,15}$/.test(input)) return "phone";
  return "username";
}

/** POST /api/auth/register */
export const register = async (req: any, res: any) => {
  const { email, password, confirmPassword, name, username, phone, avatar, captchaToken } = req.body;
  try {
    // Verify CAPTCHA
    if (RECAPTCHA_SECRET && !captchaToken) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({ error: 'Invalid CAPTCHA' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (username && username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const stmt = db.prepare('INSERT INTO users (email, password, name, full_name, username, phone, avatar, verification_token, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
    const result = stmt.run(email, hashedPassword, name, name, username || null, phone || null, avatar || null, verificationToken);

    // Send verification email
    const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
    await sendVerificationEmail(email, verificationToken, origin);

    res.json({
      message: 'Signup successful! Please check your email to verify your account.',
      user: { id: result.lastInsertRowid, email, name, username, phone, avatar, role: 'buyer', is_email_verified: 0 },
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: users.username')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(400).json({ error: error.message });
  }
};

/** POST /api/auth/login */
export const login = async (req: any, res: any) => {
  let { identifier, password, captchaToken } = req.body;
  identifier = identifier?.trim();
  console.log(`[LOGIN ATTEMPT] Identifier: ${identifier}`);

  try {
    // Verify CAPTCHA
    if (RECAPTCHA_SECRET && !captchaToken) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({ error: 'Invalid CAPTCHA' });
    }

    const type = detectInputType(identifier);
    console.log(`[LOGIN DEBUG] Detected input type: ${type} for "${identifier}"`);

    let user: any;
    if (type === "email") {
      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(identifier);
    } else if (type === "phone") {
      user = db.prepare('SELECT * FROM users WHERE phone = ?').get(identifier);
    } else {
      user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(identifier);
    }

    if (!user) {
      console.log(`[LOGIN FAILED] User not found: "${identifier}"`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lock_until && Date.now() < user.lock_until) {
      const remainingMinutes = Math.ceil((user.lock_until - Date.now()) / (60 * 1000));
      console.log(`[LOGIN FAILED] Account locked: ${identifier}, remaining: ${remainingMinutes}m`);
      return res.status(403).json({ error: `Account locked due to too many failed attempts. Please try again in ${remainingMinutes} minutes.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log(`[LOGIN FAILED] Password mismatch for: ${identifier}`);

      const attempts = (user.failed_attempts || 0) + 1;
      let lockUntil = null;

      if (attempts >= 5) {
        lockUntil = Date.now() + (15 * 60 * 1000);
        console.log(`[LOGIN FAILED] Locking account: ${identifier} until ${new Date(lockUntil).toISOString()}`);
      }

      db.prepare('UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?').run(attempts, lockUntil, user.id);

      // Artificial delay to prevent brute-force
      await new Promise(resolve => setTimeout(resolve, 1000));

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on success
    db.prepare('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?').run(user.id);

    if (user.deleted_at) {
      return res.status(403).json({
        error: 'Account scheduled for deletion',
        message: 'This account is scheduled for deletion. Please check your email for the restoration link if you wish to undo this.',
      });
    }

    if (!user.is_email_verified) {
      console.log(`[LOGIN FAILED] Email not verified: ${identifier}`);
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Your email is not verified. Please check your email for the verification link.',
        showResend: true,
        email: user.email,
      });
    }

    console.log(`[LOGIN SUCCESS] User: ${user.email}`);
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        avatar: user.avatar || user.avatar_url || "/default-avatar.png",
        is_email_verified: user.is_email_verified,
        is_seller_verified: user.is_seller_verified,
      },
    });
  } catch (error: any) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/** GET /api/auth/verify-email */
export const verifyEmail = async (req: any, res: any) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const user: any = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

  db.prepare('UPDATE users SET is_email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
  res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
};

/** POST /api/auth/resend-verification */
export const resendVerification = async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user: any = db.prepare('SELECT id, is_email_verified FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_email_verified) return res.status(400).json({ error: 'Email is already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, user.id);

    const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
    await sendVerificationEmail(email, verificationToken, origin);
    res.json({ success: true, message: 'Verification email resent successfully!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/auth/forgot-password */
export const forgotPassword = async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user: any = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
        .run(resetToken, resetTokenExpiry, user.id);

      const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendForgotPasswordEmail(email, resetToken, origin);
    }

    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/auth/reset-password */
export const resetPassword = async (req: any, res: any) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

  const user: any = db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?')
    .get(token, new Date().toISOString());

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const hashedPassword = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?')
    .run(hashedPassword, user.id);

  res.json({ success: true, message: 'Password has been reset successfully.' });
};

/** GET /api/auth/google/url */
export const getGoogleAuthUrl = (req: any, res: any) => {
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth not configured' });
  const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
  const redirectUri = `${origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: 'google',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
};

/** GET /api/auth/github/url */
export const getGithubAuthUrl = (req: any, res: any) => {
  if (!GITHUB_CLIENT_ID) return res.status(500).json({ error: 'GitHub OAuth not configured' });
  const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
  const redirectUri = `${origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'user:email',
    state: 'github',
  });
  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
};

/** GET /auth/callback — OAuth callback handler */
export const oauthCallback = async (req: any, res: any) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Code is required');

  const origin = `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${origin}/auth/callback`;

  try {
    let user: any = null;
    if (state === 'google') {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      const { access_token } = tokenRes.data;
      const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const googleUser = userRes.data;

      user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleUser.id, googleUser.email);
      if (!user) {
        const username = googleUser.email.split('@')[0] + Math.floor(Math.random() * 1000);
        const result = db.prepare('INSERT INTO users (email, password, name, username, google_id, is_email_verified, avatar_url) VALUES (?, ?, ?, ?, ?, 1, ?)')
          .run(googleUser.email, 'OAUTH_USER', googleUser.name, username, googleUser.id, googleUser.picture);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      } else if (!user.google_id) {
        db.prepare('UPDATE users SET google_id = ?, is_email_verified = 1 WHERE id = ?').run(googleUser.id, user.id);
      }
    } else if (state === 'github') {
      const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }, { headers: { Accept: 'application/json' } });
      const { access_token } = tokenRes.data;
      const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const githubUser = userRes.data;

      let email = githubUser.email;
      if (!email) {
        const emailsRes = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        email = emailsRes.data.find((e: any) => e.primary && e.verified)?.email || emailsRes.data[0]?.email;
      }

      user = db.prepare('SELECT * FROM users WHERE github_id = ? OR email = ?').get(githubUser.id.toString(), email);
      if (!user) {
        const username = githubUser.login + Math.floor(Math.random() * 1000);
        const result = db.prepare('INSERT INTO users (email, password, name, username, github_id, is_email_verified, avatar_url) VALUES (?, ?, ?, ?, ?, 1, ?)')
          .run(email, 'OAUTH_USER', githubUser.name || githubUser.login, username, githubUser.id.toString(), githubUser.avatar_url);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      } else if (!user.github_id) {
        db.prepare('UPDATE users SET github_id = ?, is_email_verified = 1 WHERE id = ?').run(githubUser.id.toString(), user.id);
      }
    }

    if (user) {
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  token: '${token}', 
                  user: ${JSON.stringify({ id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, is_email_verified: user.is_email_verified })} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } else {
      res.status(400).send('Authentication failed');
    }
  } catch (error: any) {
    console.error('OAuth Error:', error.response?.data || error.message);
    res.status(500).send('Internal Server Error during OAuth');
  }
};
