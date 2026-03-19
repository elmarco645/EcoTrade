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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'ecotrade_secret_key_123';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

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
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json());

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, confirmPassword, name, username, captchaToken } = req.body;
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
      
      const stmt = db.prepare('INSERT INTO users (email, password, name, full_name, username, verification_token) VALUES (?, ?, ?, ?, ?, ?)');
      const result = stmt.run(email, hashedPassword, name, name, username || null, verificationToken);
      
      // Simulate sending email
      console.log(`[EMAIL SIMULATION] Verification link for ${email}: http://localhost:3000/verify-email?token=${verificationToken}`);
      
      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email, name, username, role: 'buyer', is_email_verified: 0 } });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: users.username')) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password, captchaToken } = req.body;
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

      // Find user by email OR username
      const user: any = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(identifier, identifier);
      
      if (!user) {
        console.log(`[LOGIN FAILED] User not found: ${identifier}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log(`[LOGIN FAILED] Password mismatch for: ${identifier}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.is_email_verified) {
        console.log(`[LOGIN FAILED] Email not verified: ${identifier}`);
        return res.status(403).json({ error: 'Please verify your email address first. Check your console for the simulation link.' });
      }

      console.log(`[LOGIN SUCCESS] User: ${user.email}`);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, is_email_verified: user.is_email_verified } });
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

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user: any = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
      
      db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
        .run(resetToken, resetTokenExpiry, user.id);
        
      console.log(`[EMAIL SIMULATION] Password reset link for ${email}: http://localhost:3000/reset-password?token=${resetToken}`);
    }
    
    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
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

  // --- Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  app.get('/api/user/profile', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT id, email, name, username, role, bio, location, avatar_url, wallet_balance, rating, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  app.patch('/api/user/profile', authenticateToken, (req: any, res) => {
    const { name, username, bio, location, avatar_url } = req.body;
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
            avatar_url = COALESCE(?, avatar_url)
        WHERE id = ?
      `);
      
      stmt.run(name, updateUsername ? 1 : 0, username, updateUsername ? 1 : 0, bio, location, avatar_url, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: users.username')) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      res.status(400).json({ error: error.message });
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

  // --- Listing Routes ---
  app.get('/api/listings', (req, res) => {
    const listings = db.prepare(`
      SELECT l.*, u.name as seller_name, u.avatar_url as seller_avatar 
      FROM listings l 
      JOIN users u ON l.seller_id = u.id 
      WHERE l.status != 'sold'
      ORDER BY l.created_at DESC
    `).all();
    res.json(listings);
  });

  app.get('/api/listings/:id', (req, res) => {
    const listing = db.prepare(`
      SELECT l.*, u.name as seller_name, u.avatar_url as seller_avatar, u.rating as seller_rating,
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
    
    // Seed sample data if empty
    const usersCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (usersCount.count === 0) {
      console.log('Seeding sample data...');
      const hashedPassword = bcrypt.hashSync('password123', 10);
      
      // Create users
      const user1 = db.prepare('INSERT INTO users (email, password, name, wallet_balance, rating, is_email_verified) VALUES (?, ?, ?, ?, ?, 1)').run('alice@example.com', hashedPassword, 'Alice Green', 500, 4.9);
      const user2 = db.prepare('INSERT INTO users (email, password, name, wallet_balance, rating, is_email_verified) VALUES (?, ?, ?, ?, ?, 1)').run('bob@example.com', hashedPassword, 'Bob Smith', 1000, 4.5);
      
      // Create listings
      const listings = [
        { seller_id: user1.lastInsertRowid, title: 'Vintage Leather Jacket', description: 'Beautifully aged brown leather jacket. Size M.', category: 'Fashion', condition: 'Used - Good', price: 85, is_negotiable: 1, location: 'Nairobi', images: ['https://picsum.photos/seed/jacket/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with blue switches.', category: 'Electronics', condition: 'Like New', price: 45, is_negotiable: 0, location: 'Mombasa', images: ['https://picsum.photos/seed/kb/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'Retro Camera', description: 'Classic film camera in working condition.', category: 'Electronics', condition: 'Used - Fair', price: 120, is_negotiable: 1, location: 'Kisumu', images: ['https://picsum.photos/seed/camera/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'iPhone 13 Pro', description: '128GB, Sierra Blue, excellent condition.', category: 'Phones & Tablets', condition: 'Like New', price: 750, is_negotiable: 1, location: 'Nairobi', images: ['https://picsum.photos/seed/iphone/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'MacBook Air M1', description: '8GB RAM, 256GB SSD, Space Gray.', category: 'Computers & Laptops', condition: 'New', price: 900, is_negotiable: 0, location: 'Nakuru', images: ['https://picsum.photos/seed/macbook/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'PS5 Console', description: 'Disc version with two controllers.', category: 'Gaming', condition: 'New', price: 550, is_negotiable: 0, location: 'Eldoret', images: ['https://picsum.photos/seed/ps5/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'Nike Air Max', description: 'Size 10, brand new in box.', category: 'Fashion', condition: 'New', price: 110, is_negotiable: 1, location: 'Nairobi', images: ['https://picsum.photos/seed/nike/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'Coffee Maker', description: 'Automatic espresso machine.', category: 'Appliances', condition: 'Used - Good', price: 150, is_negotiable: 1, location: 'Mombasa', images: ['https://picsum.photos/seed/coffee/800/800'] },
        { seller_id: user1.lastInsertRowid, title: 'Mountain Bike', description: '21-speed mountain bike, great for trails.', category: 'Sports', condition: 'Used - Good', price: 300, is_negotiable: 1, location: 'Kisumu', images: ['https://picsum.photos/seed/bike/800/800'] },
        { seller_id: user2.lastInsertRowid, title: 'Dining Table', description: 'Solid oak dining table with 4 chairs.', category: 'Home & Furniture', condition: 'Used - Fair', price: 400, is_negotiable: 1, location: 'Nakuru', images: ['https://picsum.photos/seed/table/800/800'] },
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
