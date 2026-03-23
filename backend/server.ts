import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'ecotrade_secret_key_123';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS; // App Password for Gmail

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const emailTemplate = (title: string, message: string, buttonText: string, link: string) => {
  return `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px; color: #333;">
    <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align:center; margin-bottom: 20px;">
        <h2 style="color:#2ecc71; margin: 0; font-size: 28px;">🌱 EcoTrade</h2>
      </div>
      
      <h3 style="color: #1a1a1a; margin-top: 0;">${title}</h3>
      <p style="line-height: 1.6; color: #4a5568;">${message}</p>

      <div style="text-align:center; margin:30px 0;">
        <a href="${link}" 
           style="background:#2ecc71; color:white; padding:14px 28px; 
                  text-decoration:none; border-radius:8px; font-weight: bold; display: inline-block;">
          ${buttonText}
        </a>
      </div>

      <p style="font-size:12px; color:#94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    </div>
  </div>
  `;
};

const sendVerificationEmail = async (email: string, token: string, origin: string) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Verification email simulation only.');
    console.log(`[EMAIL SIMULATION] Verification link for ${email}: ${origin}/verify-email?token=${token}`);
    return;
  }

  const link = `${origin}/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Verify your EcoTrade account',
      html: emailTemplate(
        "Verify Your Email",
        "Welcome to EcoTrade! We're excited to have you join our community of sustainable traders. Click the button below to verify your account and start trading.",
        "Verify Email",
        link
      )
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

const sendDeleteUndoEmail = async (email: string, token: string, origin: string) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Delete undo email simulation only.');
    console.log(`[EMAIL SIMULATION] Undo delete link for ${email}: ${origin}/undo-delete?token=${token}`);
    return;
  }

  const link = `${origin}/undo-delete?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Account Deletion Scheduled',
      html: emailTemplate(
        "Account Deletion Scheduled",
        "Your account has been scheduled for deletion. If this wasn't you, or if you've changed your mind, you have 7 days to restore your account by clicking the button below.",
        "Restore Account",
        link
      )
    });
    console.log(`Delete undo email sent to ${email}`);
  } catch (error) {
    console.error('Error sending delete undo email:', error);
  }
};

const sendEmailChangeVerificationEmail = async (email: string, token: string, origin: string) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Email change simulation only.');
    console.log(`[EMAIL SIMULATION] Email change link for ${email}: ${origin}/api/user/confirm-email-change?token=${token}`);
    return;
  }

  const link = `${origin}/api/user/confirm-email-change?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Confirm your EcoTrade email change',
      html: emailTemplate(
        "Confirm Email Change",
        "You requested to change your email address on EcoTrade. Click the button below to confirm this change. If you didn't request this, please ignore this email.",
        "Confirm Email Change",
        link
      )
    });
    console.log(`Email change verification sent to ${email}`);
  } catch (error) {
    console.error('Error sending email change verification:', error);
  }
};

const sendForgotPasswordEmail = async (email: string, token: string, origin: string) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Forgot password email simulation only.');
    console.log(`[EMAIL SIMULATION] Reset link for ${email}: ${origin}/reset-password?token=${token}`);
    return;
  }

  const link = `${origin}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Reset your EcoTrade password',
      html: emailTemplate(
        "Reset Your Password",
        "We received a request to reset your password. If you didn't make this request, you can safely ignore this email. Otherwise, click the button below to choose a new password.",
        "Reset Password",
        link
      )
    });
    console.log(`Forgot password email sent to ${email}`);
  } catch (error) {
    console.error('Error sending forgot password email:', error);
    throw new Error('Failed to send reset email');
  }
};

const verifyCaptcha = async (token: string) => {
  if (!RECAPTCHA_SECRET) return true; // Skip if not configured for demo
  try {
    const res = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
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

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json());

  // --- Rate Limiting Configuration ---

  // Shared key generator to handle proxy headers
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

  const commonValidate = {
    xForwardedForHeader: false, // Handled by app.set('trust proxy', 1)
    forwardedHeader: false, // Handled by custom keyGenerator
  };

  // 1. General API Limiter (100 requests per 15 mins)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    validate: commonValidate,
  });

  // 2. Authentication Limiter (Stricter: 10 requests per 15 mins)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    validate: commonValidate,
  });

  // 3. Sensitive Action Limiter (Medium: 20 requests per 15 mins)
  // For creating listings, sending messages, wallet actions, etc.
  const sensitiveActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many actions performed, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    validate: commonValidate,
  });

  // Apply general limiter to all API routes
  app.use('/api/', apiLimiter);

  // Apply strict auth limiter to auth endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/resend-verification', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  // Apply sensitive action limiter to specific endpoints
  app.post('/api/listings', sensitiveActionLimiter);
  app.post('/api/offers', sensitiveActionLimiter);
  app.post('/api/wallet/deposit', sensitiveActionLimiter);
  app.post('/api/wallet/withdraw', sensitiveActionLimiter);
  app.post('/api/transactions/checkout', sensitiveActionLimiter);
  app.post('/api/messages', sensitiveActionLimiter);
  app.post('/api/user/verify-id', sensitiveActionLimiter);
  app.patch('/api/user/profile', sensitiveActionLimiter);
  app.post('/api/user/upload-avatar', sensitiveActionLimiter);
  app.post('/api/user/upload-cover', sensitiveActionLimiter);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images are allowed'));
      }
    }
  });

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  // --- Auth Routes ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.post('/api/auth/register', async (req, res) => {
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
      
      // Send real verification email
      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendVerificationEmail(email, verificationToken, origin);
      
      res.json({ 
        message: 'Signup successful! Please check your email to verify your account.',
        user: { id: result.lastInsertRowid, email, name, username, phone, avatar, role: 'buyer', is_email_verified: 0 } 
      });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: users.username')) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  function detectInputType(input: string) {
    if (input.includes("@")) return "email";
    if (/^\+?\d{10,15}$/.test(input)) return "phone";
    return "username";
  }

  app.post('/api/auth/login', async (req, res) => {
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
          lockUntil = Date.now() + (15 * 60 * 1000); // 15 mins
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
          message: 'This account is scheduled for deletion. Please check your email for the restoration link if you wish to undo this.' 
        });
      }

      if (!user.is_email_verified) {
        console.log(`[LOGIN FAILED] Email not verified: ${identifier}`);
        return res.status(403).json({ 
          error: 'Email not verified', 
          message: 'Your email is not verified. Please check your email for the verification link.',
          showResend: true,
          email: user.email
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
          is_seller_verified: user.is_seller_verified 
        } 
      });
    } catch (error: any) {
      console.error('[LOGIN ERROR]', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const user: any = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    db.prepare('UPDATE users SET is_email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      const user: any = db.prepare('SELECT id, is_email_verified FROM users WHERE email = ?').get(email);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.is_email_verified) return res.status(400).json({ error: 'Email is already verified' });

      const verificationToken = crypto.randomBytes(32).toString('hex');
      db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, user.id);

      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendVerificationEmail(email, verificationToken, origin);
      res.json({ success: true, message: 'Verification email resent successfully!' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      const user: any = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
        
        db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
          .run(resetToken, resetTokenExpiry, user.id);
          
      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendForgotPasswordEmail(email, resetToken, origin);
      }
      
      // Always return success to prevent email enumeration
      res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    const user: any = db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?')
      .get(token, new Date().toISOString());
      
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?')
      .run(hashedPassword, user.id);
      
    res.json({ success: true, message: 'Password has been reset successfully.' });
  });

  // --- OAuth Routes ---
  app.get('/api/auth/google/url', (req, res) => {
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth not configured' });
    const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
    const redirectUri = `${origin}/auth/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: 'google',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  app.get('/api/auth/github/url', (req, res) => {
    if (!GITHUB_CLIENT_ID) return res.status(500).json({ error: 'GitHub OAuth not configured' });
    const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
    const redirectUri = `${origin}/auth/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'user:email',
      state: 'github'
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  app.get('/auth/callback', async (req, res) => {
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
          grant_type: 'authorization_code'
        });
        const { access_token } = tokenRes.data;
        const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const googleUser = userRes.data; // { id, email, name, picture }
        
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
          redirect_uri: redirectUri
        }, { headers: { Accept: 'application/json' } });
        const { access_token } = tokenRes.data;
        const userRes = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const githubUser = userRes.data; // { id, email, name, login, avatar_url }
        
        let email = githubUser.email;
        if (!email) {
          const emailsRes = await axios.get('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${access_token}` }
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
  });

  // --- Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      
      // Check if user is deleted
      const dbUser: any = db.prepare('SELECT deleted_at FROM users WHERE id = ?').get(user.id);
      if (dbUser && dbUser.deleted_at) {
        return res.status(403).json({ error: 'Account scheduled for deletion' });
      }

      req.user = user;
      next();
    });
  };

  app.get('/api/user/profile', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT id, email, name, username, role, bio, location, avatar_url, cover_url, social_links, wallet_balance, rating, is_verified, is_seller_verified, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  app.patch('/api/user/profile', authenticateToken, (req: any, res) => {
    const { name, username, bio, location, avatar_url, avatar, phone, cover_url, social_links } = req.body;
    try {
      const currentUser: any = db.prepare('SELECT username, username_updated_at FROM users WHERE id = ?').get(req.user.id);
      
      let updateUsername = false;
      if (username && username !== currentUser.username) {
        // Check 30-day limit
        if (currentUser.username_updated_at) {
          const lastUpdate = new Date(currentUser.username_updated_at);
          const now = new Date();
          const diffDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            return res.status(400).json({ error: `Username can only be changed once every 30 days. Next change available in ${30 - diffDays} days.` });
          }
        }
        if (username.length < 3) {
          return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        updateUsername = true;
      }

      const stmt = db.prepare(`
        UPDATE users 
        SET name = COALESCE(?, name),
            username = CASE WHEN ? = 1 THEN ? ELSE username END,
            username_updated_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE username_updated_at END,
            bio = COALESCE(?, bio),
            location = COALESCE(?, location),
            avatar_url = COALESCE(?, avatar_url),
            avatar = COALESCE(?, avatar),
            phone = COALESCE(?, phone),
            cover_url = COALESCE(?, cover_url),
            social_links = COALESCE(?, social_links)
        WHERE id = ?
      `);
      
      stmt.run(name, updateUsername ? 1 : 0, username, updateUsername ? 1 : 0, bio, location, avatar_url, avatar, phone, cover_url, typeof social_links === 'object' ? JSON.stringify(social_links) : social_links, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: users.username')) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      if (error.message.includes('UNIQUE constraint failed: users.phone')) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/change-password', authenticateToken, async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
      const user: any = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/request-email-change', authenticateToken, async (req: any, res) => {
    const { newEmail } = req.body;
    try {
      if (!newEmail || !newEmail.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(newEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      console.log(`[DEBUG] Generated email change token: ${token} for user ${req.user.id}`);
      db.prepare('UPDATE users SET email_change_token = ?, new_email = ? WHERE id = ?').run(token, newEmail, req.user.id);

      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendEmailChangeVerificationEmail(newEmail, token, origin);
      res.json({ success: true, message: 'Verification email sent to new email address' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user/confirm-email-change', async (req, res) => {
    const { token } = req.query;
    console.log(`[DEBUG] Received email change confirmation request with token: ${token}`);
    try {
      if (!token) return res.status(400).json({ error: 'Token is required' });

      const user: any = db.prepare('SELECT id, new_email FROM users WHERE email_change_token = ?').get(token);
      if (!user) {
        console.log(`[DEBUG] No user found for token: ${token}`);
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      console.log(`[DEBUG] Found user ${user.id} for token. Updating email to ${user.new_email}`);
      db.prepare('UPDATE users SET email = ?, new_email = NULL, email_change_token = NULL WHERE id = ?').run(user.new_email, user.id);
      res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #2ecc71;">✅ Email updated successfully!</h1>
            <p>You can now log in with your new email address.</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2ecc71; color: white; text-decoration: none; border-radius: 5px;">Go to EcoTrade</a>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error(`[ERROR] Email change confirmation failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/upload-avatar', authenticateToken, upload.single('avatar'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    try {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);
      res.json({ success: true, avatar_url: avatarUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/upload-cover', authenticateToken, upload.single('cover'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const coverUrl = `/uploads/${req.file.filename}`;
    try {
      db.prepare('UPDATE users SET cover_url = ? WHERE id = ?').run(coverUrl, req.user.id);
      res.json({ success: true, cover_url: coverUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/verify-id', authenticateToken, (req: any, res) => {
    const { nationalId } = req.body;
    if (!nationalId) return res.status(400).json({ error: 'National ID required' });

    try {
      // In a real app, we would use a proper encryption library like 'crypto'
      // For this demo, we'll just store a masked/hashed version as a placeholder for "encrypted"
      const encryptedId = Buffer.from(nationalId).toString('base64'); 
      
      db.prepare("UPDATE users SET national_id_encrypted = ?, is_verified = 1 WHERE id = ?").run(encryptedId, req.user.id);
      res.json({ success: true, message: 'Identity verified successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/user/export-data', authenticateToken, (req: any, res) => {
    try {
      const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const listings = db.prepare('SELECT * FROM listings WHERE seller_id = ?').all(req.user.id);
      const transactions = db.prepare('SELECT * FROM transactions WHERE buyer_id = ? OR seller_id = ?').all(req.user.id, req.user.id);
      const offers = db.prepare('SELECT * FROM offers WHERE buyer_id = ? OR seller_id = ?').all(req.user.id, req.user.id);
      const reviews = db.prepare('SELECT * FROM reviews WHERE buyer_id = ? OR seller_id = ?').all(req.user.id, req.user.id);
      const messages = db.prepare('SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?').all(req.user.id, req.user.id);

      // Remove sensitive info
      delete user.password;
      delete user.verification_token;
      delete user.reset_token;
      delete user.reset_token_expiry;
      delete user.delete_token;
      delete user.delete_expires;

      const exportData = {
        profile: user,
        listings,
        transactions,
        offers,
        reviews,
        messages,
        exported_at: new Date().toISOString()
      };

      res.setHeader('Content-Disposition', 'attachment; filename=ecotrade_data_export.json');
      res.json(exportData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/delete-account', authenticateToken, async (req: any, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
      const user: any = db.prepare('SELECT password, email FROM users WHERE id = ?').get(req.user.id);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

      const deleteToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7 days

      db.prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP, delete_token = ?, delete_expires = ? WHERE id = ?')
        .run(deleteToken, expires.toISOString(), req.user.id);

      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendDeleteUndoEmail(user.email, deleteToken, origin);

      res.json({ success: true, message: 'Account scheduled for deletion. You have 7 days to undo this.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user/undo-delete', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
      const user: any = db.prepare('SELECT id, delete_expires FROM users WHERE delete_token = ?').get(token);
      if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

      const expires = new Date(user.delete_expires);
      if (new Date() > expires) {
        return res.status(400).json({ error: 'Undo period has expired' });
      }

      db.prepare('UPDATE users SET deleted_at = NULL, delete_token = NULL, delete_expires = NULL WHERE id = ?')
        .run(user.id);

      res.json({ success: true, message: 'Account restored successfully! You can now log in again.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Listing Routes ---
  app.get('/api/listings', (req, res) => {
    try {
      console.log('[API] Fetching all listings...');
      const listings = db.prepare(`
        SELECT l.*, u.name as seller_name, u.avatar_url as seller_avatar, u.is_seller_verified 
        FROM listings l 
        JOIN users u ON l.seller_id = u.id 
        WHERE l.status != 'sold'
        ORDER BY l.created_at DESC
      `).all();
      console.log(`[API] Found ${listings.length} listings`);
      res.json(listings);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch listings:', error);
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });

  app.get('/api/listings/:id', (req, res) => {
    const listing = db.prepare(`
      SELECT l.*, u.name as seller_name, u.avatar_url as seller_avatar, u.rating as seller_rating, u.is_seller_verified,
             (SELECT COUNT(*) FROM reviews WHERE seller_id = u.id) as seller_reviews_count
      FROM listings l 
      JOIN users u ON l.seller_id = u.id 
      WHERE l.id = ?
    `).get(req.params.id);
    res.json(listing);
  });

  app.post('/api/cart/validate', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

    const listings = [];
    for (const id of ids) {
      let listing: any = db.prepare('SELECT id, title, status, price FROM listings WHERE id = ?').get(id);
      if (listing && listing.status === 'reserved') {
        const pendingTx: any = db.prepare(`
          SELECT * FROM transactions 
          WHERE listing_id = ? AND status = 'pending_payment' 
          AND created_at > datetime('now', '-15 minutes')
        `).get(id);
        
        if (!pendingTx) {
          db.prepare("UPDATE listings SET status = 'available' WHERE id = ?").run(id);
          listing.status = 'available';
        }
      }
      if (listing) listings.push(listing);
    }

    res.json(listings);
  });

  app.post('/api/listings', authenticateToken, (req: any, res) => {
    const { title, description, category, condition, price, is_negotiable, location, images } = req.body;
    const stmt = db.prepare(`
      INSERT INTO listings (seller_id, title, description, category, condition, price, is_negotiable, location, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.id, title, description, category, condition, price, is_negotiable ? 1 : 0, location, JSON.stringify(images));
    res.json({ id: result.lastInsertRowid });
  });

  // --- Offer Routes ---
  app.post('/api/offers', authenticateToken, (req: any, res) => {
    const { listing_id, amount } = req.body;
    const listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller_id === req.user.id) return res.status(400).json({ error: 'Cannot make offer on your own listing' });

    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24); // 24h expiry

    const stmt = db.prepare(`
      INSERT INTO offers (listing_id, buyer_id, seller_id, amount, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(listing_id, req.user.id, listing.seller_id, amount, expires_at.toISOString());
    res.json({ id: result.lastInsertRowid });
  });

  app.get('/api/offers', authenticateToken, (req: any, res) => {
    const offers = db.prepare(`
      SELECT o.*, l.title as listing_title, u.name as buyer_name
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u ON o.buyer_id = u.id
      WHERE o.seller_id = ? OR o.buyer_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id, req.user.id);
    res.json(offers);
  });

  app.post('/api/offers/:id/accept', authenticateToken, (req: any, res) => {
    const offer: any = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer || offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare("UPDATE offers SET status = 'accepted' WHERE id = ?").run(req.params.id);
    // In a real app, we might lock the price or notify the buyer
    res.json({ success: true });
  });

  app.post('/api/offers/:id/reject', authenticateToken, (req: any, res) => {
    const offer: any = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer || offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare("UPDATE offers SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Wallet & Escrow Routes ---
  app.get('/api/user/wallet', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id);
    res.json({ balance: user.wallet_balance });
  });

  app.get('/api/user/transactions', authenticateToken, (req: any, res) => {
    const transactions = db.prepare(`
      SELECT t.*, l.title as listing_title 
      FROM transactions t
      JOIN listings l ON t.listing_id = l.id
      WHERE t.buyer_id = ? OR t.seller_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id, req.user.id);
    res.json(transactions);
  });

  app.post('/api/transactions/buy', authenticateToken, (req: any, res) => {
    const { listing_id } = req.body;
    const listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
    const buyer: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    
    // Auto-release logic: if reserved but no active pending payment transaction in last 15 mins
    if (listing.status === 'reserved') {
      const pendingTx: any = db.prepare(`
        SELECT * FROM transactions 
        WHERE listing_id = ? AND status = 'pending_payment' 
        AND created_at > datetime('now', '-15 minutes')
      `).get(listing_id);
      
      if (!pendingTx) {
        // Safe to re-reserve
        db.prepare("UPDATE listings SET status = 'available' WHERE id = ?").run(listing_id);
        listing.status = 'available';
      }
    }

    if (listing.status !== 'available') {
      return res.status(400).json({ error: `Listing "${listing.title}" is currently ${listing.status}` });
    }
    
    if (buyer.wallet_balance < listing.price) return res.status(400).json({ error: 'Insufficient funds' });

    try {
      const buyTx = db.transaction(() => {
        db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(listing.price, req.user.id);
        const stmt = db.prepare(`
          INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, status, escrow_status)
          VALUES (?, ?, ?, ?, 'paid', 'held')
        `);
        const result = stmt.run(listing_id, req.user.id, listing.seller_id, listing.price);
        db.prepare('UPDATE listings SET status = ? WHERE id = ?').run('reserved', listing_id);
        return result.lastInsertRowid;
      });
      const txId = buyTx();
      res.json({ transaction_id: txId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/transactions/checkout', authenticateToken, (req: any, res) => {
    const { items, total, shipping_address } = req.body;
    const buyer: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    try {
      const checkoutTx = db.transaction(() => {
        const availableItems = [];
        const unavailableItems = [];

        for (const listing_id of items) {
          let listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
          
          if (listing && listing.status === 'reserved') {
            const pendingTx: any = db.prepare(`
              SELECT * FROM transactions 
              WHERE listing_id = ? AND status = 'pending_payment' 
              AND created_at > datetime('now', '-15 minutes')
            `).get(listing_id);
            
            if (!pendingTx) {
              db.prepare("UPDATE listings SET status = 'available' WHERE id = ?").run(listing_id);
              listing.status = 'available';
            }
          }

          if (listing && listing.status === 'available') {
            availableItems.push(listing);
          } else {
            unavailableItems.push(listing_id);
          }
        }

        if (availableItems.length === 0) {
          throw new Error('No items in your cart are currently available for purchase.');
        }

        // Calculate total for available items only
        const subtotal = availableItems.reduce((acc, l) => acc + l.price, 0);
        const shipping_fee_per_item = (total - subtotal) / availableItems.length;

        const transactionIds = [];
        for (const listing of availableItems) {
          const result = db.prepare(`
            INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, shipping_fee, total_amount, status, escrow_status, shipping_address)
            VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', 'pending', ?)
          `).run(listing.id, req.user.id, listing.seller_id, listing.price, shipping_fee_per_item, listing.price + shipping_fee_per_item, shipping_address);
          
          transactionIds.push(result.lastInsertRowid);
          db.prepare('UPDATE listings SET status = ? WHERE id = ?').run('reserved', listing.id);
        }
        return { transactionIds, unavailableItems };
      });

      const { transactionIds, unavailableItems } = checkoutTx();
      res.json({ 
        success: true, 
        transaction_ids: transactionIds,
        unavailable_items: unavailableItems 
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Payment Routes ---
  app.post('/api/pay', authenticateToken, async (req: any, res) => {
    const { amount, transaction_ids } = req.body;
    const user: any = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id);
    const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

    // Simulation Mode for Demo
    if (!FLW_SECRET_KEY || FLW_SECRET_KEY === 'FLWSECK_TEST-MOCK-KEY') {
      console.warn('FLW_SECRET_KEY is missing or using mock key. Using simulation mode.');
      const tx_ref = `eco-${Date.now()}-${transaction_ids.join('-')}`;
      
      // In simulation mode, we'll just return a link that redirects back to our success page
      // with the necessary params to trigger verification
      return res.json({
        status: 'success',
        message: 'Payment initiated (Simulation Mode)',
        data: {
          link: `${req.headers.origin}/payment-success?status=successful&tx_ref=${tx_ref}&mode=simulation`
        }
      });
    }

    try {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: `eco-${Date.now()}-${transaction_ids.join('-')}`,
          amount,
          currency: 'KES',
          redirect_url: `${req.headers.origin}/payment-success`,
          customer: {
            email: user.email,
            name: user.name,
          },
          customizations: {
            title: 'EcoTrade Checkout',
            description: 'Payment for EcoTrade items',
            logo: 'https://picsum.photos/seed/ecotrade/200/200',
          },
          payment_options: 'card, mpesa, airtel',
        },
        {
          headers: {
            Authorization: `Bearer ${FLW_SECRET_KEY}`,
          },
        }
      );

      // Update transactions with the reference
      for (const id of transaction_ids) {
        db.prepare('UPDATE transactions SET payment_reference = ? WHERE id = ?').run(response.data.data.tx_ref, id);
      }

      res.json(response.data);
    } catch (error: any) {
      console.error('Payment initiation error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to initiate payment. Please check your FLW_SECRET_KEY.' });
    }
  });

  app.get('/api/pay/verify', authenticateToken, async (req: any, res) => {
    const { tx_ref, mode } = req.query;
    if (!tx_ref) return res.status(400).json({ error: 'Missing tx_ref' });

    try {
      // If simulation mode, we trust the client (only for demo!)
      if (mode === 'simulation') {
        const transactionIds = tx_ref.split('-').slice(2);
        const updateTx = db.transaction(() => {
          for (const txId of transactionIds) {
            const tx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
            if (tx && tx.status === 'pending_payment') {
              db.prepare(`
                UPDATE transactions 
                SET status = 'paid', escrow_status = 'held', payment_reference = ?, gateway_response = ?
                WHERE id = ?
              `).run('MOCK_FLW_ID', JSON.stringify({ mode: 'simulation' }), txId);
              
              db.prepare('UPDATE listings SET status = ? WHERE id = ?').run('sold', tx.listing_id);
            }
          }
        });
        updateTx();
        return res.json({ status: 'success', message: 'Payment verified (Simulated)' });
      }

      // Real verification would call Flutterwave API here
      // For now, we'll just check if we have the tx_ref in our DB and it's marked as paid via webhook
      // If not, we could poll Flutterwave, but for this demo we'll assume the webhook handles it
      // or we can manually check here if needed.
      
      res.json({ status: 'success', message: 'Payment verification initiated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/webhook/flutterwave', (req, res) => {
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    if (secretHash && signature !== secretHash) {
      return res.status(401).end();
    }

    const { status, tx_ref, id: flw_id } = req.body.data || req.body;

    if (status === 'successful') {
      const transactionIds = tx_ref.split('-').slice(2); // Extract IDs from eco-timestamp-id1-id2...
      
      const updateTx = db.transaction(() => {
        for (const txId of transactionIds) {
          const tx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
          if (tx && tx.status === 'pending_payment') {
            db.prepare(`
              UPDATE transactions 
              SET status = 'paid', escrow_status = 'held', payment_reference = ?, gateway_response = ?
              WHERE id = ?
            `).run(flw_id, JSON.stringify(req.body), txId);
            
            db.prepare('UPDATE listings SET status = ? WHERE id = ?').run('sold', tx.listing_id);
          }
        }
      });
      updateTx();
    }

    res.status(200).end();
  });

  app.get('/api/orders', authenticateToken, (req: any, res) => {
    const orders = db.prepare(`
      SELECT t.*, l.title as listing_title, l.images as listing_images, u.name as seller_name, b.name as buyer_name
      FROM transactions t
      JOIN listings l ON t.listing_id = l.id
      JOIN users u ON t.seller_id = u.id
      JOIN users b ON t.buyer_id = b.id
      WHERE t.buyer_id = ? OR t.seller_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id, req.user.id);
    res.json(orders);
  });

  app.post('/api/orders/:id/ship', authenticateToken, (req: any, res) => {
    const { tracking_id } = req.body;
    const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!order || order.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare("UPDATE transactions SET status = 'shipped', tracking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(tracking_id, req.params.id);
    res.json({ success: true });
  });

  app.post('/api/orders/:id/deliver', authenticateToken, (req: any, res) => {
    const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!order || order.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare("UPDATE transactions SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/orders/:id/confirm', authenticateToken, (req: any, res) => {
    const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!order || order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const transaction = db.transaction(() => {
      db.prepare("UPDATE transactions SET status = 'completed', escrow_status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(req.params.id);
      
      // Release funds to seller
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?')
        .run(order.amount, order.seller_id);
    });

    transaction();
    res.json({ success: true });
  });

  app.post('/api/orders/:id/dispute', authenticateToken, (req: any, res) => {
    const { reason, evidence } = req.body;
    const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!order || order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare("UPDATE transactions SET status = 'disputed', dispute_reason = ?, dispute_evidence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(reason, JSON.stringify(evidence), req.params.id);
    res.json({ success: true });
  });

  app.post('/api/reviews', authenticateToken, (req: any, res) => {
    const { transaction_id, rating, review_text } = req.body;
    
    try {
      const transaction: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transaction_id);
      
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
      if (transaction.status !== 'completed') return res.status(400).json({ error: 'Transaction must be completed to leave a review' });
      if (transaction.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only the buyer can review this transaction' });

      const stmt = db.prepare(`
        INSERT INTO reviews (transaction_id, buyer_id, seller_id, rating, review_text)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(transaction_id, req.user.id, transaction.seller_id, rating, review_text);
      
      // Update seller rating
      const stats: any = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE seller_id = ?').get(transaction.seller_id);
      db.prepare('UPDATE users SET rating = ? WHERE id = ?').run(stats.avg, transaction.seller_id);
      
      res.json({ success: true, avg_rating: stats.avg, total_reviews: stats.count });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'You have already reviewed this transaction' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/sellers/:id/reviews', (req, res) => {
    const reviews = db.prepare(`
      SELECT r.*, u.name as buyer_name, u.avatar_url as buyer_avatar
      FROM reviews r
      JOIN users u ON r.buyer_id = u.id
      WHERE r.seller_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.id);
    res.json(reviews);
  });

  app.post('/api/transactions/:id/confirm', authenticateToken, (req: any, res) => {
    const tx: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!tx || tx.buyer_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    try {
      const confirmTx = db.transaction(() => {
        db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(tx.amount, tx.seller_id);
        db.prepare("UPDATE transactions SET status = 'completed', escrow_status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
        db.prepare("UPDATE listings SET status = 'sold' WHERE id = ?").run(tx.listing_id);
      });
      confirmTx();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Socket.io ---
  io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(`user_${userId}`));
    socket.on('send_message', (data) => {
      const { sender_id, receiver_id, content, listing_id } = data;
      const stmt = db.prepare('INSERT INTO messages (sender_id, receiver_id, content, listing_id) VALUES (?, ?, ?, ?)');
      const result = stmt.run(sender_id, receiver_id, content, listing_id);
      const message = { id: result.lastInsertRowid, ...data, created_at: new Date().toISOString() };
      io.to(`user_${receiver_id}`).emit('receive_message', message);
      socket.emit('message_sent', message);
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '../frontend'),
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html')));
  }

  httpServer.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
    
    // Cleanup job for deleted accounts (runs every hour)
    setInterval(() => {
      try {
        console.log('[CLEANUP] Checking for expired account deletions...');
        const expiredUsers = db.prepare('SELECT id FROM users WHERE deleted_at IS NOT NULL AND delete_expires < CURRENT_TIMESTAMP').all();
        
        for (const user of expiredUsers as any[]) {
          console.log(`[CLEANUP] Anonymizing user ${user.id}`);
          // Soft delete / Anonymize
          db.prepare(`
            UPDATE users 
            SET email = 'deleted_' || id || '@deleted.ecotrade',
                password = 'DELETED_' || id,
                name = 'Deleted User',
                full_name = 'Deleted User',
                username = 'deleted_user_' || id,
                bio = NULL,
                location = NULL,
                avatar_url = NULL,
                cover_url = NULL,
                social_links = NULL,
                national_id_encrypted = NULL,
                deleted_at = CURRENT_TIMESTAMP -- Keep this to mark as permanently deleted in this sense
            WHERE id = ?
          `).run(user.id);
        }
      } catch (error) {
        console.error('[CLEANUP ERROR]', error);
      }
    }, 60 * 60 * 1000);

    // Seed sample data if empty
    const usersCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (usersCount.count === 0) {
      console.log('Seeding sample data...');
      const hashedPassword = bcrypt.hashSync('password123', 10);
      
      // Create users
      const user1 = db.prepare('INSERT INTO users (email, password, name, username, wallet_balance, rating, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)').run('alice@example.com', hashedPassword, 'Alice Green', 'alice', 500, 4.9);
      const user2 = db.prepare('INSERT INTO users (email, password, name, username, wallet_balance, rating, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)').run('bob@example.com', hashedPassword, 'Bob Smith', 'bob', 1000, 4.5);
      const user3 = db.prepare('INSERT INTO users (email, password, name, username, wallet_balance, rating, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)').run('nefaryus@example.com', hashedPassword, 'Nefaryus', 'Nefaryus', 1500, 5.0);
      
      // Create listings
      const listings = [
        { seller_id: user1.lastInsertRowid, title: 'Vintage Leather Jacket', description: 'Beautifully aged brown leather jacket. Size M.', category: 'Fashion', condition: 'Used - Good', price: 85, is_negotiable: 1, location: 'Nairobi', images: ['https://picsum.photos/seed/jacket/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with blue switches.', category: 'Electronics', condition: 'Like New', price: 45, is_negotiable: 0, location: 'Mombasa', images: ['https://picsum.photos/seed/kb/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'Retro Camera', description: 'Classic film camera in working condition.', category: 'Electronics', condition: 'Used - Fair', price: 120, is_negotiable: 1, location: 'Kisumu', images: ['https://picsum.photos/seed/camera/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'iPhone 13 Pro', description: '128GB, Sierra Blue, excellent condition.', category: 'Phones & Tablets', condition: 'Like New', price: 750, is_negotiable: 1, location: 'Nairobi', images: ['https://picsum.photos/seed/iphone/800/800'] },
        { seller_id: user3.lastInsertRowid, title: 'High-end Gaming PC', description: 'RTX 4090, i9-13900K, 64GB RAM.', category: 'Computers & Laptops', condition: 'New', price: 3500, is_negotiable: 0, location: 'Nairobi', images: ['https://picsum.photos/seed/pc/800/800'] },
        { seller_id: user3.lastInsertRowid, title: 'Sony WH-1000XM5', description: 'Industry-leading noise canceling headphones.', category: 'Electronics', condition: 'New', price: 350, is_negotiable: 0, location: 'Nairobi', images: ['https://picsum.photos/seed/sony/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'MacBook Air M1', description: '8GB RAM, 256GB SSD, Space Gray.', category: 'Computers & Laptops', condition: 'New', price: 900, is_negotiable: 0, location: 'Nakuru', images: ['https://picsum.photos/seed/macbook/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'PS5 Console', description: 'Disc version with two controllers.', category: 'Gaming', condition: 'New', price: 550, is_negotiable: 0, location: 'Eldoret', images: ['https://picsum.photos/seed/ps5/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'Nike Air Max', description: 'Size 10, brand new in box.', category: 'Fashion', condition: 'New', price: 110, is_negotiable: 1, location: 'Nairobi', images: ['https://picsum.photos/seed/nike/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'Coffee Maker', description: 'Automatic espresso machine.', category: 'Appliances', condition: 'Used - Good', price: 150, is_negotiable: 1, location: 'Mombasa', images: ['https://picsum.photos/seed/coffee/800/800'] },
      ];

      const insertListing = db.prepare(`
        INSERT INTO listings (seller_id, title, description, category, condition, price, is_negotiable, location, images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const l of listings) {
        insertListing.run(l.seller_id, l.title, l.description, l.category, l.condition, l.price, l.is_negotiable, l.location, JSON.stringify(l.images));
      }
    }
  });
}

startServer();
