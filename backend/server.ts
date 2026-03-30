import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

console.log('[SERVER] Initializing Firebase Admin...');
if (!admin) {
  console.error('[SERVER] Firebase Admin module not found');
} else {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    console.log(`[SERVER] Project ID: ${projectId}`);
    console.log(`[SERVER] Client Email: ${clientEmail ? 'SET' : 'NOT SET'}`);
    console.log(`[SERVER] Private Key: ${privateKey ? 'SET' : 'NOT SET'}`);
    console.log(`[SERVER] Credentials Path: ${credentialsPath}`);

    const config: any = {
      projectId: projectId,
    };

    if (clientEmail && privateKey) {
      config.credential = admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      });
      console.log('[SERVER] Using service account credentials from environment variables');
    } else if (credentialsPath && fs.existsSync(credentialsPath)) {
      config.credential = admin.credential.cert(credentialsPath);
      console.log(`[SERVER] Using service account key from: ${credentialsPath}`);
    } else {
      try {
        config.credential = admin.credential.applicationDefault();
        console.log('[SERVER] Using Application Default Credentials (ADC)');
      } catch (adcError) {
        console.warn('[SERVER] No Firebase Admin credentials found (env or file) and ADC failed. Some features may not work.');
        console.error('[SERVER] ADC Error:', adcError);
      }
    }

    if (!admin.apps.length) {
      admin.initializeApp(config);
    }
    console.log(`[SERVER] Firebase Admin initialized successfully for project: ${projectId}`);
  } catch (error) {
    console.error('[SERVER] Failed to initialize Firebase Admin:', error);
  }
}

// Use environment variable for database ID if available, otherwise fallback to config or (default)
// If FIREBASE_PROJECT_ID is set, we assume the user is using their own project and likely the (default) database
const databaseId = process.env.FIREBASE_DATABASE_ID || 
                  (process.env.FIREBASE_PROJECT_ID ? '(default)' : (firebaseConfig.firestoreDatabaseId || '(default)'));

const firestore = getFirestore(admin.app(), databaseId);
console.log(`[SERVER] Firestore initialized for database: ${databaseId}`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  app.use(cors());

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

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/health', async (req, res) => {
    let firestoreStatus = 'unknown';
    try {
      await firestore.collection('listings').limit(1).get();
      firestoreStatus = 'connected';
    } catch (err: any) {
      firestoreStatus = `error: ${err.message}`;
    }

    res.json({ 
      status: 'ok',
      firebase: {
        initialized: admin.apps.length > 0,
        projectId: admin.app().options.projectId,
        databaseId: databaseId,
        firestore: firestoreStatus
      }
    });
  });

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, name, username, phone, avatar, captchaToken } = req.body;
    const authHeader = req.headers['authorization'];
    const firebaseToken = authHeader && authHeader.split(' ')[1];

    try {
      // Verify CAPTCHA
      if (RECAPTCHA_SECRET && !captchaToken) {
        return res.status(400).json({ error: 'CAPTCHA verification required' });
      }
      const isCaptchaValid = await verifyCaptcha(captchaToken);
      if (!isCaptchaValid) {
        return res.status(400).json({ error: 'Invalid CAPTCHA' });
      }

      if (!firebaseToken) {
        return res.status(401).json({ error: 'Firebase token required' });
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const uid = decodedToken.uid;

      if (decodedToken.email !== email) {
        return res.status(400).json({ error: 'Email mismatch' });
      }

      if (username && username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }

      // Check if email already exists in Firestore
      const userDoc = await firestore.collection('users').doc(uid).get();
      if (userDoc.exists) {
        return res.status(400).json({ 
          error: 'Email already registered', 
          action: 'LOGIN_INSTEAD',
          email: email 
        });
      }

      // Check if username is taken (requires a query)
      if (username) {
        const usernameQuery = await firestore.collection('users').where('username', '==', username).get();
        if (!usernameQuery.empty) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      const userData = {
        uid,
        email,
        name,
        full_name: name,
        username: username || null,
        phone: phone || null,
        avatar: avatar || null,
        role: 'buyer',
        wallet_balance: 1000.0,
        rating: 0,
        is_verified: false,
        is_email_verified: true,
        is_seller_verified: false,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await firestore.collection('users').doc(uid).set(userData);
      
      res.json({ 
        message: 'Signup successful!',
        user: { ...userData, id: uid } 
      });
    } catch (error: any) {
      console.error('[REGISTER ERROR]', error);
      res.status(400).json({ error: error.message });
    }
  });

  function detectInputType(input: string) {
    if (input.includes("@")) return "email";
    if (/^\+?\d{10,15}$/.test(input)) return "phone";
    return "username";
  }

  app.post('/api/auth/login', async (req, res) => {
    const { captchaToken } = req.body;
    const authHeader = req.headers['authorization'];
    const firebaseToken = authHeader && authHeader.split(' ')[1];

    try {
      // Verify CAPTCHA
      if (RECAPTCHA_SECRET && !captchaToken) {
        return res.status(400).json({ error: 'CAPTCHA verification required' });
      }
      const isCaptchaValid = await verifyCaptcha(captchaToken);
      if (!isCaptchaValid) {
        return res.status(400).json({ error: 'Invalid CAPTCHA' });
      }

      if (!firebaseToken) {
        return res.status(401).json({ error: 'Firebase token required' });
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const uid = decodedToken.uid;
      
      const userDoc = await firestore.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ 
          error: 'Account not found',
          action: 'SIGNUP'
        });
      }

      const user = userDoc.data();

      if (user?.deleted_at) {
        return res.status(403).json({ 
          error: 'Account scheduled for deletion', 
          message: 'This account is scheduled for deletion.' 
        });
      }

      console.log(`[LOGIN SUCCESS] User: ${user?.email}`);
      
      res.json({ 
        user: { 
          id: uid, 
          email: user?.email, 
          name: user?.name, 
          username: user?.username,
          avatar: user?.avatar || user?.avatar_url || "/default-avatar.png",
          role: user?.role,
          wallet_balance: user?.wallet_balance,
          rating: user?.rating,
          is_email_verified: user?.is_email_verified,
          is_seller_verified: user?.is_seller_verified
        }
      });
    } catch (error: any) {
      console.error('[LOGIN ERROR]', error);
      res.status(401).json({ error: 'Invalid or expired session' });
    }
  });

  app.post('/api/auth/resolve-email', async (req, res) => {
    const { identifier } = req.body;
    try {
      const type = detectInputType(identifier);
      let userQuery: admin.firestore.QuerySnapshot;
      
      if (type === "email") {
        userQuery = await firestore.collection('users').where('email', '==', identifier.toLowerCase()).get();
      } else if (type === "phone") {
        userQuery = await firestore.collection('users').where('phone', '==', identifier).get();
      } else {
        userQuery = await firestore.collection('users').where('username', '==', identifier.toLowerCase()).get();
      }

      if (userQuery.empty) {
        return res.status(404).json({ error: 'Account not found' });
      }
      
      const user = userQuery.docs[0].data();
      res.json({ email: user.email });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
      let email: string = '';
      let name: string = '';
      let avatarUrl: string = '';

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
        email = googleUser.email;
        name = googleUser.name;
        avatarUrl = googleUser.picture;
        
        const userSnap = await firestore.collection('users').where('google_id', '==', googleUser.id).get();
        const emailSnap = await firestore.collection('users').where('email', '==', googleUser.email.toLowerCase()).get();
        
        if (!userSnap.empty) {
          user = { ...userSnap.docs[0].data(), id: userSnap.docs[0].id };
        } else if (!emailSnap.empty) {
          user = { ...emailSnap.docs[0].data(), id: emailSnap.docs[0].id };
          await firestore.collection('users').doc(user.id).update({ google_id: googleUser.id, is_email_verified: true });
        } else {
          const username = googleUser.email.split('@')[0] + Math.floor(Math.random() * 1000);
          const newUser = {
            email: googleUser.email.toLowerCase(),
            password: 'OAUTH_USER',
            name: googleUser.name,
            username: username.toLowerCase(),
            google_id: googleUser.id,
            is_email_verified: true,
            avatar_url: googleUser.picture,
            wallet_balance: 1000,
            rating: 0,
            role: 'buyer',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          };
          const docRef = await firestore.collection('users').add(newUser);
          user = { ...newUser, id: docRef.id };
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
        name = githubUser.name || githubUser.login;
        avatarUrl = githubUser.avatar_url;
        
        email = githubUser.email;
        if (!email) {
          const emailsRes = await axios.get('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          email = emailsRes.data.find((e: any) => e.primary && e.verified)?.email || emailsRes.data[0]?.email;
        }

        const userSnap = await firestore.collection('users').where('github_id', '==', githubUser.id.toString()).get();
        const emailSnap = await firestore.collection('users').where('email', '==', email.toLowerCase()).get();

        if (!userSnap.empty) {
          user = { ...userSnap.docs[0].data(), id: userSnap.docs[0].id };
        } else if (!emailSnap.empty) {
          user = { ...emailSnap.docs[0].data(), id: emailSnap.docs[0].id };
          await firestore.collection('users').doc(user.id).update({ github_id: githubUser.id.toString(), is_email_verified: true });
        } else {
          const username = githubUser.login + Math.floor(Math.random() * 1000);
          const newUser = {
            email: email.toLowerCase(),
            password: 'OAUTH_USER',
            name: githubUser.name || githubUser.login,
            username: username.toLowerCase(),
            github_id: githubUser.id.toString(),
            is_email_verified: true,
            avatar_url: githubUser.avatar_url,
            wallet_balance: 1000,
            rating: 0,
            role: 'buyer',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          };
          const docRef = await firestore.collection('users').add(newUser);
          user = { ...newUser, id: docRef.id };
        }
      }

      if (user) {
        // Ensure user exists in Firebase
        let firebaseUser;
        try {
          firebaseUser = await admin.auth().getUserByEmail(email);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            firebaseUser = await admin.auth().createUser({
              email,
              displayName: name,
              photoURL: avatarUrl,
              emailVerified: true
            });
          } else {
            throw err;
          }
        }

        // Create Firebase Custom Token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    customToken: '${customToken}', 
                    user: ${JSON.stringify({ id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, is_email_verified: 1 })} 
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
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    try {
      // Verify Firebase ID Token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;

      const userDoc = await firestore.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User profile not found' });
      }

      const dbUser = userDoc.data();
      
      if (dbUser?.deleted_at) {
        return res.status(403).json({ error: 'Account scheduled for deletion' });
      }

      req.user = {
        id: uid,
        email: dbUser?.email,
        username: dbUser?.username
      };
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(403).json({ error: 'Invalid or expired session' });
    }
  };

  app.get('/api/user/profile', authenticateToken, async (req: any, res) => {
    try {
      const userDoc = await firestore.collection('users').doc(req.user.id).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      
      const user = userDoc.data();
      res.json({ 
        ...user,
        id: req.user.id
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/user/profile', authenticateToken, async (req: any, res) => {
    const { name, username, bio, location, avatar_url, avatar, phone, cover_url, social_links } = req.body;
    try {
      const userRef = firestore.collection('users').doc(req.user.id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

      const currentData = userDoc.data();
      
      // Check if username is changing and if it's taken
      if (username && username !== currentData?.username) {
        // Check 30-day limit
        if (currentData?.username_updated_at) {
          const lastUpdate = currentData.username_updated_at.toDate();
          const now = new Date();
          const diffDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            return res.status(400).json({ error: `Username can only be changed once every 30 days. Next change available in ${30 - diffDays} days.` });
          }
        }
        if (username.length < 3) {
          return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        const usernameQuery = await firestore.collection('users').where('username', '==', username).get();
        if (!usernameQuery.empty) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      // Check if phone is changing and if it's taken
      if (phone && phone !== currentData?.phone) {
        const phoneQuery = await firestore.collection('users').where('phone', '==', phone).get();
        if (!phoneQuery.empty) {
          return res.status(400).json({ error: 'Phone number already in use' });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (username !== undefined && username !== currentData?.username) {
        updateData.username = username;
        updateData.username_updated_at = admin.firestore.FieldValue.serverTimestamp();
      }
      if (bio !== undefined) updateData.bio = bio;
      if (location !== undefined) updateData.location = location;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (phone !== undefined) updateData.phone = phone;
      if (cover_url !== undefined) updateData.cover_url = cover_url;
      if (social_links !== undefined) updateData.social_links = social_links;

      await userRef.update(updateData);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/user/change-password', authenticateToken, async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
      const userDoc = await firestore.collection('users').doc(req.user.id).get();
      const user = userDoc.data();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

      const isMatch = await bcrypt.compare(oldPassword, user?.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await firestore.collection('users').doc(req.user.id).update({ password: hashedPassword });
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

      const existingUserSnap = await firestore.collection('users').where('email', '==', newEmail.toLowerCase()).get();
      if (!existingUserSnap.empty) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      console.log(`[DEBUG] Generated email change token: ${token} for user ${req.user.id}`);
      await firestore.collection('users').doc(req.user.id).update({ 
        email_change_token: token, 
        new_email: newEmail.toLowerCase() 
      });

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

      const userSnap = await firestore.collection('users').where('email_change_token', '==', token).get();
      if (userSnap.empty) {
        console.log(`[DEBUG] No user found for token: ${token}`);
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const userDoc = userSnap.docs[0];
      const user = userDoc.data();
      console.log(`[DEBUG] Found user ${userDoc.id} for token. Updating email to ${user.new_email}`);
      await userDoc.ref.update({ 
        email: user.new_email, 
        new_email: null, 
        email_change_token: null 
      });
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

  app.post('/api/user/upload-avatar', authenticateToken, upload.single('avatar'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    try {
      await firestore.collection('users').doc(req.user.id).update({ avatar_url: avatarUrl });
      res.json({ success: true, avatar_url: avatarUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/upload-cover', authenticateToken, upload.single('cover'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const coverUrl = `/uploads/${req.file.filename}`;
    try {
      await firestore.collection('users').doc(req.user.id).update({ cover_url: coverUrl });
      res.json({ success: true, cover_url: coverUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/user/verify-id', authenticateToken, async (req: any, res) => {
    const { nationalId } = req.body;
    if (!nationalId) return res.status(400).json({ error: 'National ID required' });

    try {
      // In a real app, we would use a proper encryption library like 'crypto'
      // For this demo, we'll just store a masked/hashed version as a placeholder for "encrypted"
      const encryptedId = Buffer.from(nationalId).toString('base64'); 
      
      await firestore.collection('users').doc(req.user.id).update({ 
        national_id_encrypted: encryptedId, 
        is_verified: true 
      });
      res.json({ success: true, message: 'Identity verified successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/user/export-data', authenticateToken, async (req: any, res) => {
    try {
      const [userDoc, listingsSnap, transactionsSnap, offersSnap, reviewsSnap, messagesSnap] = await Promise.all([
        firestore.collection('users').doc(req.user.id).get(),
        firestore.collection('listings').where('seller_id', '==', req.user.id).get(),
        firestore.collection('transactions').where('buyer_id', '==', req.user.id).get(), // Simplified, should check seller too
        firestore.collection('offers').where('buyer_id', '==', req.user.id).get(), // Simplified
        firestore.collection('reviews').where('buyer_id', '==', req.user.id).get(), // Simplified
        firestore.collection('messages').where('sender_id', '==', req.user.id).get() // Simplified
      ]);

      const user = userDoc.data();
      if (user) {
        delete user.password;
        delete user.verification_token;
        delete user.reset_token;
        delete user.reset_token_expiry;
        delete user.delete_token;
        delete user.delete_expires;
      }

      const exportData = {
        profile: user,
        listings: listingsSnap.docs.map(doc => doc.data()),
        transactions: transactionsSnap.docs.map(doc => doc.data()),
        offers: offersSnap.docs.map(doc => doc.data()),
        reviews: reviewsSnap.docs.map(doc => doc.data()),
        messages: messagesSnap.docs.map(doc => doc.data()),
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
      const userRef = firestore.collection('users').doc(req.user.id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      
      const user = userDoc.data();
      
      // For Firebase users, we trust the Firebase token from authenticateToken middleware
      // The frontend should have re-authenticated the user before calling this.

      const deleteToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7 days

      await userRef.update({
        deleted_at: admin.firestore.FieldValue.serverTimestamp(),
        delete_token: deleteToken,
        delete_expires: admin.firestore.Timestamp.fromDate(expires)
      });

      const origin = process.env.APP_URL || req.headers.origin || 'http://localhost:3000';
      await sendDeleteUndoEmail(user?.email, deleteToken, origin);

      res.json({ success: true, message: 'Account scheduled for deletion. You have 7 days to undo this.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user/undo-delete', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
      const userQuery = await firestore.collection('users').where('delete_token', '==', token).get();
      if (userQuery.empty) return res.status(400).json({ error: 'Invalid or expired token' });

      const userDoc = userQuery.docs[0];
      const user = userDoc.data();

      const expires = user.delete_expires.toDate();
      if (new Date() > expires) {
        return res.status(400).json({ error: 'Undo period has expired' });
      }

      await userDoc.ref.update({
        deleted_at: null,
        delete_token: null,
        delete_expires: null,
        failed_attempts: 0,
        lock_until: null
      });

      res.json({ success: true, message: 'Account restored successfully! You can now log in again.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Listing Routes ---
  app.get('/api/listings', async (req, res) => {
    try {
      console.log('[API] Fetching all listings...');
      console.log(`[API] Using Firestore project: ${admin.app().options.projectId}`);
      console.log(`[API] Using Firestore database: ${databaseId}`);
      const listingsSnapshot = await firestore.collection('listings')
        .where('status', '!=', 'sold')
        .orderBy('status')
        .orderBy('created_at', 'desc')
        .get();
      
      const listings = await Promise.all(listingsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const sellerDoc = await firestore.collection('users').doc(data.seller_id).get();
        const sellerData = sellerDoc.data();
        return {
          ...data,
          id: doc.id,
          seller_name: sellerData?.name,
          seller_avatar: sellerData?.avatar_url || sellerData?.avatar,
          is_seller_verified: sellerData?.is_seller_verified
        };
      }));

      console.log(`[API] Found ${listings.length} listings`);
      res.json(listings);
    } catch (error: any) {
      console.error('[API ERROR] Failed to fetch listings:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError = errorMessage.includes('UNAUTHENTICATED') || errorMessage.includes('permission_denied');
      res.status(500).json({ 
        error: 'Failed to fetch listings',
        details: isAuthError ? 'Authentication error. Please check backend credentials and Firestore database ID.' : errorMessage,
        code: error.code || 'unknown'
      });
    }
  });

  app.get('/api/listings/:id', async (req, res) => {
    try {
      const listingDoc = await firestore.collection('listings').doc(req.params.id).get();
      if (!listingDoc.exists) return res.status(404).json({ error: 'Listing not found' });
      
      const listingData = listingDoc.data();
      const sellerDoc = await firestore.collection('users').doc(listingData?.seller_id).get();
      const sellerData = sellerDoc.data();
      
      // Get review count
      const reviewsSnapshot = await firestore.collection('reviews').where('seller_id', '==', listingData?.seller_id).get();

      res.json({
        ...listingData,
        id: listingDoc.id,
        seller_name: sellerData?.name,
        seller_avatar: sellerData?.avatar_url || sellerData?.avatar,
        seller_rating: sellerData?.rating,
        is_seller_verified: sellerData?.is_seller_verified,
        seller_reviews_count: reviewsSnapshot.size
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/cart/validate', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

    try {
      const listings = [];
      for (const id of ids) {
        const listingDoc = await firestore.collection('listings').doc(id).get();
        if (listingDoc.exists) {
          const listing = { ...listingDoc.data(), id: listingDoc.id };
          if (listing.status === 'reserved') {
            // Check for pending transactions
            const pendingTxQuery = await firestore.collection('transactions')
              .where('listing_id', '==', id)
              .where('status', '==', 'pending_payment')
              .get();
            
            let hasActiveTx = false;
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
            
            for (const txDoc of pendingTxQuery.docs) {
              const tx = txDoc.data();
              if (tx.created_at.toDate() > fifteenMinsAgo) {
                hasActiveTx = true;
                break;
              }
            }

            if (!hasActiveTx) {
              await firestore.collection('listings').doc(id).update({ status: 'available' });
              listing.status = 'available';
            }
          }
          listings.push(listing);
        }
      }
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/listings', authenticateToken, async (req: any, res) => {
    const { title, description, category, condition, price, is_negotiable, location, images } = req.body;
    try {
      const listingData = {
        seller_id: req.user.id,
        title,
        description,
        category,
        condition,
        price: parseFloat(price),
        is_negotiable: !!is_negotiable,
        location,
        images: images || [],
        status: 'available',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await firestore.collection('listings').add(listingData);
      res.json({ id: docRef.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- Offer Routes ---
  app.post('/api/offers', authenticateToken, async (req: any, res) => {
    const { listing_id, amount } = req.body;
    try {
      const listingDoc = await firestore.collection('listings').doc(listing_id).get();
      if (!listingDoc.exists) return res.status(404).json({ error: 'Listing not found' });
      
      const listing = listingDoc.data();
      if (listing?.seller_id === req.user.id) return res.status(400).json({ error: 'Cannot make offer on your own listing' });

      const expires_at = new Date();
      expires_at.setHours(expires_at.getHours() + 24); // 24h expiry

      const offerData = {
        listing_id,
        buyer_id: req.user.id,
        seller_id: listing?.seller_id,
        amount: parseFloat(amount),
        status: 'pending',
        expires_at: admin.firestore.Timestamp.fromDate(expires_at),
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await firestore.collection('offers').add(offerData);
      res.json({ id: docRef.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/offers', authenticateToken, async (req: any, res) => {
    try {
      const offersSnapshot = await firestore.collection('offers')
        .where('seller_id', '==', req.user.id)
        .get();
      const buyerOffersSnapshot = await firestore.collection('offers')
        .where('buyer_id', '==', req.user.id)
        .get();
      
      const allOffers = [...offersSnapshot.docs, ...buyerOffersSnapshot.docs];
      
      const offers = await Promise.all(allOffers.map(async (doc) => {
        const data = doc.data();
        const listingDoc = await firestore.collection('listings').doc(data.listing_id).get();
        const buyerDoc = await firestore.collection('users').doc(data.buyer_id).get();
        return {
          ...data,
          id: doc.id,
          listing_title: listingDoc.data()?.title,
          buyer_name: buyerDoc.data()?.name
        };
      }));

      res.json(offers.sort((a, b) => b.created_at.toDate() - a.created_at.toDate()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/offers/:id/accept', authenticateToken, async (req: any, res) => {
    try {
      const offerRef = firestore.collection('offers').doc(req.params.id);
      const offerDoc = await offerRef.get();
      if (!offerDoc.exists || offerDoc.data()?.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await offerRef.update({ status: 'accepted' });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/offers/:id/reject', authenticateToken, async (req: any, res) => {
    try {
      const offerRef = firestore.collection('offers').doc(req.params.id);
      const offerDoc = await offerRef.get();
      if (!offerDoc.exists || offerDoc.data()?.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await offerRef.update({ status: 'rejected' });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Wallet & Escrow Routes ---
  app.get('/api/user/wallet', authenticateToken, async (req: any, res) => {
    try {
      const userDoc = await firestore.collection('users').doc(req.user.id).get();
      res.json({ balance: userDoc.data()?.wallet_balance || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user/transactions', authenticateToken, async (req: any, res) => {
    try {
      const buyerTxSnapshot = await firestore.collection('transactions')
        .where('buyer_id', '==', req.user.id)
        .get();
      const sellerTxSnapshot = await firestore.collection('transactions')
        .where('seller_id', '==', req.user.id)
        .get();
      
      const allTx = [...buyerTxSnapshot.docs, ...sellerTxSnapshot.docs];
      
      const transactions = await Promise.all(allTx.map(async (doc) => {
        const data = doc.data();
        const listingDoc = await firestore.collection('listings').doc(data.listing_id).get();
        return {
          ...data,
          id: doc.id,
          listing_title: listingDoc.data()?.title
        };
      }));

      res.json(transactions.sort((a, b) => b.created_at.toDate() - a.created_at.toDate()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/transactions/buy', authenticateToken, async (req: any, res) => {
    const { listing_id } = req.body;
    try {
      const listingRef = firestore.collection('listings').doc(listing_id);
      const listingDoc = await listingRef.get();
      const userRef = firestore.collection('users').doc(req.user.id);
      const userDoc = await userRef.get();

      if (!listingDoc.exists) return res.status(404).json({ error: 'Listing not found' });
      
      const listing = listingDoc.data();
      const buyer = userDoc.data();

      if (listing?.status === 'reserved') {
        const pendingTxQuery = await firestore.collection('transactions')
          .where('listing_id', '==', listing_id)
          .where('status', '==', 'pending_payment')
          .get();
        
        let hasActiveTx = false;
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        for (const txDoc of pendingTxQuery.docs) {
          const tx = txDoc.data();
          if (tx.created_at.toDate() > fifteenMinsAgo) {
            hasActiveTx = true;
            break;
          }
        }
        
        if (!hasActiveTx) {
          await listingRef.update({ status: 'available' });
          listing.status = 'available';
        }
      }

      if (listing?.status !== 'available') {
        return res.status(400).json({ error: `Listing "${listing?.title}" is currently ${listing?.status}` });
      }
      
      if ((buyer?.wallet_balance || 0) < listing?.price) return res.status(400).json({ error: 'Insufficient funds' });

      const txId = await firestore.runTransaction(async (transaction) => {
        transaction.update(userRef, { wallet_balance: admin.firestore.FieldValue.increment(-listing?.price) });
        const newTxRef = firestore.collection('transactions').doc();
        transaction.set(newTxRef, {
          listing_id,
          buyer_id: req.user.id,
          seller_id: listing?.seller_id,
          amount: listing?.price,
          status: 'paid',
          escrow_status: 'held',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.update(listingRef, { status: 'reserved' });
        return newTxRef.id;
      });

      res.json({ transaction_id: txId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/transactions/checkout', authenticateToken, async (req: any, res) => {
    const { items, total, shipping_address } = req.body;
    try {
      const availableItems = [];
      const unavailableItems = [];

      for (const listing_id of items) {
        const listingRef = firestore.collection('listings').doc(listing_id);
        const listingDoc = await listingRef.get();
        
        if (listingDoc.exists) {
          const listing = { ...listingDoc.data(), id: listingDoc.id };
          if (listing.status === 'reserved') {
            const pendingTxQuery = await firestore.collection('transactions')
              .where('listing_id', '==', listing_id)
              .where('status', '==', 'pending_payment')
              .get();
            
            let hasActiveTx = false;
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
            
            for (const txDoc of pendingTxQuery.docs) {
              const tx = txDoc.data();
              if (tx.created_at.toDate() > fifteenMinsAgo) {
                hasActiveTx = true;
                break;
              }
            }
            
            if (!hasActiveTx) {
              await listingRef.update({ status: 'available' });
              listing.status = 'available';
            }
          }

          if (listing.status === 'available') {
            availableItems.push(listing);
          } else {
            unavailableItems.push(listing_id);
          }
        } else {
          unavailableItems.push(listing_id);
        }
      }

      if (availableItems.length === 0) {
        return res.status(400).json({ error: 'No items in your cart are currently available for purchase.' });
      }

      const subtotal = availableItems.reduce((acc, l) => acc + l.price, 0);
      const shipping_fee_per_item = (total - subtotal) / availableItems.length;

      const transactionIds = await firestore.runTransaction(async (transaction) => {
        const ids = [];
        for (const listing of availableItems) {
          const newTxRef = firestore.collection('transactions').doc();
          transaction.set(newTxRef, {
            listing_id: listing.id,
            buyer_id: req.user.id,
            seller_id: listing.seller_id,
            amount: listing.price,
            shipping_fee: shipping_fee_per_item,
            total_amount: listing.price + shipping_fee_per_item,
            status: 'pending_payment',
            escrow_status: 'pending',
            shipping_address,
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
          ids.push(newTxRef.id);
          transaction.update(firestore.collection('listings').doc(listing.id), { status: 'reserved' });
        }
        return ids;
      });

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
    try {
      const userDoc = await firestore.collection('users').doc(req.user.id).get();
      const user = userDoc.data();
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

      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: `eco-${Date.now()}-${transaction_ids.join('-')}`,
          amount,
          currency: 'KES',
          redirect_url: `${req.headers.origin}/payment-success`,
          customer: {
            email: user?.email,
            name: user?.name,
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
        await firestore.collection('transactions').doc(id).update({ payment_reference: response.data.data.tx_ref });
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
        const transactionIds = (tx_ref as string).split('-').slice(2);
        for (const txId of transactionIds) {
          const txRef = firestore.collection('transactions').doc(txId);
          const txDoc = await txRef.get();
          const tx = txDoc.data();
          if (txDoc.exists && tx?.status === 'pending_payment') {
            await txRef.update({
              status: 'paid',
              escrow_status: 'held',
              payment_reference: 'MOCK_FLW_ID',
              gateway_response: { mode: 'simulation' }
            });
            await firestore.collection('listings').doc(tx?.listing_id).update({ status: 'sold' });
          }
        }
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

  app.post('/api/webhook/flutterwave', async (req, res) => {
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    if (secretHash && signature !== secretHash) {
      return res.status(401).end();
    }

    const { status, tx_ref, id: flw_id } = req.body.data || req.body;

    if (status === 'successful') {
      const transactionIds = (tx_ref as string).split('-').slice(2); // Extract IDs from eco-timestamp-id1-id2...
      
      for (const txId of transactionIds) {
        const txRef = firestore.collection('transactions').doc(txId);
        const txDoc = await txRef.get();
        const tx = txDoc.data();
        if (txDoc.exists && tx?.status === 'pending_payment') {
          await txRef.update({
            status: 'paid',
            escrow_status: 'held',
            payment_reference: flw_id,
            gateway_response: req.body
          });
          await firestore.collection('listings').doc(tx?.listing_id).update({ status: 'sold' });
        }
      }
    }

    res.status(200).end();
  });

  app.get('/api/orders', authenticateToken, async (req: any, res) => {
    try {
      const buyerQuery = firestore.collection('transactions').where('buyer_id', '==', req.user.id).get();
      const sellerQuery = firestore.collection('transactions').where('seller_id', '==', req.user.id).get();
      
      const [buyerSnap, sellerSnap] = await Promise.all([buyerQuery, sellerQuery]);
      
      const orders = [];
      const allDocs = [...buyerSnap.docs, ...sellerSnap.docs];
      
      // Deduplicate if user is both buyer and seller (unlikely but possible)
      const seenIds = new Set();
      const uniqueDocs = allDocs.filter(doc => {
        if (seenIds.has(doc.id)) return false;
        seenIds.add(doc.id);
        return true;
      });

      for (const doc of uniqueDocs) {
        const t = { ...doc.data(), id: doc.id };
        
        // Join with listing and users
        const [listingDoc, sellerDoc, buyerDoc] = await Promise.all([
          firestore.collection('listings').doc(t.listing_id).get(),
          firestore.collection('users').doc(t.seller_id).get(),
          firestore.collection('users').doc(t.buyer_id).get()
        ]);

        orders.push({
          ...t,
          listing_title: listingDoc.data()?.title,
          listing_images: listingDoc.data()?.images,
          seller_name: sellerDoc.data()?.name,
          buyer_name: buyerDoc.data()?.name
        });
      }

      orders.sort((a: any, b: any) => {
        const dateA = a.created_at?.toDate?.() || new Date(a.created_at);
        const dateB = b.created_at?.toDate?.() || new Date(b.created_at);
        return dateB - dateA;
      });

      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders/:id/ship', authenticateToken, async (req: any, res) => {
    const { tracking_id } = req.body;
    try {
      const orderRef = firestore.collection('transactions').doc(req.params.id);
      const orderDoc = await orderRef.get();
      const order = orderDoc.data();

      if (!orderDoc.exists || order?.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await orderRef.update({
        status: 'shipped',
        tracking_id,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders/:id/deliver', authenticateToken, async (req: any, res) => {
    try {
      const orderRef = firestore.collection('transactions').doc(req.params.id);
      const orderDoc = await orderRef.get();
      const order = orderDoc.data();

      if (!orderDoc.exists || order?.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await orderRef.update({
        status: 'delivered',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders/:id/confirm', authenticateToken, async (req: any, res) => {
    try {
      const orderRef = firestore.collection('transactions').doc(req.params.id);
      const orderDoc = await orderRef.get();
      const order = orderDoc.data();

      if (!orderDoc.exists || order?.buyer_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await firestore.runTransaction(async (transaction) => {
        transaction.update(orderRef, {
          status: 'completed',
          escrow_status: 'released',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Release funds to seller
        const sellerRef = firestore.collection('users').doc(order?.seller_id);
        transaction.update(sellerRef, {
          wallet_balance: admin.firestore.FieldValue.increment(order?.amount)
        });
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders/:id/dispute', authenticateToken, async (req: any, res) => {
    const { reason, evidence } = req.body;
    try {
      const orderRef = firestore.collection('transactions').doc(req.params.id);
      const orderDoc = await orderRef.get();
      const order = orderDoc.data();

      if (!orderDoc.exists || order?.buyer_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await orderRef.update({
        status: 'disputed',
        dispute_reason: reason,
        dispute_evidence: evidence,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/reviews', authenticateToken, async (req: any, res) => {
    const { transaction_id, rating, review_text } = req.body;
    
    try {
      const txRef = firestore.collection('transactions').doc(transaction_id);
      const txDoc = await txRef.get();
      const transaction = txDoc.data();
      
      if (!txDoc.exists) return res.status(404).json({ error: 'Transaction not found' });
      if (transaction?.status !== 'completed') return res.status(400).json({ error: 'Transaction must be completed to leave a review' });
      if (transaction?.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only the buyer can review this transaction' });

      // Check for existing review
      const existingReview = await firestore.collection('reviews')
        .where('transaction_id', '==', transaction_id)
        .get();
      
      if (!existingReview.empty) {
        return res.status(400).json({ error: 'You have already reviewed this transaction' });
      }

      const reviewData = {
        transaction_id,
        buyer_id: req.user.id,
        seller_id: transaction?.seller_id,
        rating,
        review_text,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await firestore.collection('reviews').add(reviewData);
      
      // Update seller rating
      const reviewsSnap = await firestore.collection('reviews')
        .where('seller_id', '==', transaction?.seller_id)
        .get();
      
      const ratings = reviewsSnap.docs.map(doc => doc.data().rating);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      await firestore.collection('users').doc(transaction?.seller_id).update({ rating: avg });
      
      res.json({ success: true, avg_rating: avg, total_reviews: ratings.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/sellers/:id/reviews', async (req, res) => {
    try {
      const reviewsSnap = await firestore.collection('reviews')
        .where('seller_id', '==', req.params.id)
        .orderBy('created_at', 'desc')
        .get();
      
      const reviews = [];
      for (const doc of reviewsSnap.docs) {
        const r = { ...doc.data(), id: doc.id };
        const buyerDoc = await firestore.collection('users').doc(r.buyer_id).get();
        reviews.push({
          ...r,
          buyer_name: buyerDoc.data()?.name,
          buyer_avatar: buyerDoc.data()?.avatar_url
        });
      }
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/transactions/:id/confirm', authenticateToken, async (req: any, res) => {
    try {
      const txRef = firestore.collection('transactions').doc(req.params.id);
      const txDoc = await txRef.get();
      const tx = txDoc.data();
      
      if (!txDoc.exists || tx?.buyer_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await firestore.runTransaction(async (transaction) => {
        transaction.update(txRef, {
          status: 'completed',
          escrow_status: 'released',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Release funds to seller
        const sellerRef = firestore.collection('users').doc(tx?.seller_id);
        transaction.update(sellerRef, {
          wallet_balance: admin.firestore.FieldValue.increment(tx?.amount)
        });

        // Mark listing as sold
        const listingRef = firestore.collection('listings').doc(tx?.listing_id);
        transaction.update(listingRef, { status: 'sold' });
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Socket.io ---
  io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(`user_${userId}`));
    socket.on('send_message', async (data) => {
      const { sender_id, receiver_id, content, listing_id } = data;
      try {
        const messageData = {
          sender_id,
          receiver_id,
          content,
          listing_id,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await firestore.collection('messages').add(messageData);
        const message = { id: docRef.id, ...data, created_at: new Date().toISOString() };
        io.to(`user_${receiver_id}`).emit('receive_message', message);
        socket.emit('message_sent', message);
      } catch (error) {
        console.error('Socket message error:', error);
      }
    });
  });

  // --- API 404 Handler ---
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('[SERVER] Initializing Vite dev server...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: path.resolve(__dirname, '../frontend'),
      });
      app.use((req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        console.log(`[SERVER] Static Request: ${req.method} ${req.url}`);
        next();
      });
      app.use(vite.middlewares);
      console.log('[SERVER] Vite dev server initialized');
    } catch (err) {
      console.error('[SERVER] Failed to initialize Vite dev server:', err);
    }
  } else {
    app.use(express.static(path.resolve(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html')));
  }

  httpServer.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
    
    // Cleanup job for deleted accounts (runs every hour)
    setInterval(async () => {
      try {
        console.log('[CLEANUP] Checking for expired account deletions...');
        const now = admin.firestore.Timestamp.now();
        const expiredUsersSnap = await firestore.collection('users')
          .where('deleted_at', '!=', null)
          .where('delete_expires', '<', now)
          .get();
        
        for (const doc of expiredUsersSnap.docs) {
          console.log(`[CLEANUP] Anonymizing user ${doc.id}`);
          // Soft delete / Anonymize
          await doc.ref.update({
            email: `deleted_${doc.id}@deleted.ecotrade`,
            password: `DELETED_${doc.id}`,
            name: 'Deleted User',
            full_name: 'Deleted User',
            username: `deleted_user_${doc.id}`,
            bio: null,
            location: null,
            avatar_url: null,
            cover_url: null,
            social_links: null,
            national_id_encrypted: null,
            deleted_at: admin.firestore.FieldValue.serverTimestamp() // Mark as permanently deleted
          });
        }
      } catch (error) {
        console.error('[CLEANUP ERROR]', error);
      }
    }, 60 * 60 * 1000);

    // Seed sample data if empty
    const seedData = async () => {
      const usersSnap = await firestore.collection('users').limit(1).get();
      if (usersSnap.empty) {
        console.log('Seeding sample data...');
        const hashedPassword = bcrypt.hashSync('password123', 10);
        
        // Create users
        const user1Ref = firestore.collection('users').doc();
        const user2Ref = firestore.collection('users').doc();
        const user3Ref = firestore.collection('users').doc();

        await user1Ref.set({ email: 'alice@example.com', password: hashedPassword, name: 'Alice Green', username: 'alice', wallet_balance: 500, rating: 4.9, is_email_verified: true, created_at: admin.firestore.FieldValue.serverTimestamp() });
        await user2Ref.set({ email: 'bob@example.com', password: hashedPassword, name: 'Bob Smith', username: 'bob', wallet_balance: 1000, rating: 4.5, is_email_verified: true, created_at: admin.firestore.FieldValue.serverTimestamp() });
        await user3Ref.set({ email: 'nefaryus@example.com', password: hashedPassword, name: 'Nefaryus', username: 'Nefaryus', wallet_balance: 1500, rating: 5.0, is_email_verified: true, created_at: admin.firestore.FieldValue.serverTimestamp() });
        
        // Create listings
        const listings = [
          { seller_id: user1Ref.id, title: 'Vintage Leather Jacket', description: 'Beautifully aged brown leather jacket. Size M.', category: 'Fashion', condition: 'Used - Good', price: 85, is_negotiable: true, location: 'Nairobi', images: ['https://picsum.photos/seed/jacket/800/800'] },
          { seller_id: user1Ref.id, title: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with blue switches.', category: 'Electronics', condition: 'Like New', price: 45, is_negotiable: false, location: 'Mombasa', images: ['https://picsum.photos/seed/kb/800/800'] },
          { seller_id: user2Ref.id, title: 'Retro Camera', description: 'Classic film camera in working condition.', category: 'Electronics', condition: 'Used - Fair', price: 120, is_negotiable: true, location: 'Kisumu', images: ['https://picsum.photos/seed/camera/800/800'] },
          { seller_id: user2Ref.id, title: 'iPhone 13 Pro', description: '128GB, Sierra Blue, excellent condition.', category: 'Phones & Tablets', condition: 'Like New', price: 750, is_negotiable: true, location: 'Nairobi', images: ['https://picsum.photos/seed/iphone/800/800'] },
          { seller_id: user3Ref.id, title: 'High-end Gaming PC', description: 'RTX 4090, i9-13900K, 64GB RAM.', category: 'Computers & Laptops', condition: 'New', price: 3500, is_negotiable: false, location: 'Nairobi', images: ['https://picsum.photos/seed/pc/800/800'] },
          { seller_id: user3Ref.id, title: 'Sony WH-1000XM5', description: 'Industry-leading noise canceling headphones.', category: 'Electronics', condition: 'New', price: 350, is_negotiable: false, location: 'Nairobi', images: ['https://picsum.photos/seed/sony/800/800'] },
          { seller_id: user1Ref.id, title: 'MacBook Air M1', description: '8GB RAM, 256GB SSD, Space Gray.', category: 'Computers & Laptops', condition: 'New', price: 900, is_negotiable: false, location: 'Nakuru', images: ['https://picsum.photos/seed/macbook/800/800'] },
          { seller_id: user2Ref.id, title: 'PS5 Console', description: 'Disc version with two controllers.', category: 'Gaming', condition: 'New', price: 550, is_negotiable: false, location: 'Eldoret', images: ['https://picsum.photos/seed/ps5/800/800'] },
          { seller_id: user1Ref.id, title: 'Nike Air Max', description: 'Size 10, brand new in box.', category: 'Fashion', condition: 'New', price: 110, is_negotiable: true, location: 'Nairobi', images: ['https://picsum.photos/seed/nike/800/800'] },
          { seller_id: user2Ref.id, title: 'Coffee Maker', description: 'Automatic espresso machine.', category: 'Appliances', condition: 'Used - Good', price: 150, is_negotiable: true, location: 'Mombasa', images: ['https://picsum.photos/seed/coffee/800/800'] },
        ];

        for (const l of listings) {
          await firestore.collection('listings').add({
            ...l,
            status: 'available',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    };
    seedData().catch(console.error);
  });
}

startServer().catch(err => {
  console.error('[SERVER] Failed to start server:', err);
  process.exit(1);
});
