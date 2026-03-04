import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'ecotrade_secret_key_123';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json());

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
      const result = stmt.run(email, hashedPassword, name);
      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email, name, role: 'buyer' } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
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
    const user: any = db.prepare('SELECT id, email, name, role, bio, location, avatar_url, wallet_balance, rating, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
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

    if (!listing || listing.status !== 'available') return res.status(400).json({ error: 'Listing not available' });
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

    if (buyer.wallet_balance < total) return res.status(400).json({ error: 'Insufficient funds for total amount including shipping' });

    try {
      const checkoutTx = db.transaction(() => {
        db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(total, req.user.id);
        
        const shipping_fee_per_item = (total - items.reduce((acc: number, id: number) => {
          const l: any = db.prepare('SELECT price FROM listings WHERE id = ?').get(id);
          return acc + (l?.price || 0);
        }, 0)) / items.length;

        for (const listing_id of items) {
          const listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
          if (!listing || listing.status !== 'available') throw new Error(`Listing ${listing_id} not available`);

          db.prepare(`
            INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, shipping_fee, total_amount, status, escrow_status, shipping_address)
            VALUES (?, ?, ?, ?, ?, ?, 'paid', 'held', ?)
          `).run(listing_id, req.user.id, listing.seller_id, listing.price, shipping_fee_per_item, listing.price + shipping_fee_per_item, shipping_address);
          
          db.prepare('UPDATE listings SET status = ? WHERE id = ?').run('sold', listing_id);
        }
      });
      checkoutTx();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
      const user1 = db.prepare('INSERT INTO users (email, password, name, wallet_balance, rating) VALUES (?, ?, ?, ?, ?)').run('alice@example.com', hashedPassword, 'Alice Green', 500, 4.9);
      const user2 = db.prepare('INSERT INTO users (email, password, name, wallet_balance, rating) VALUES (?, ?, ?, ?, ?)').run('bob@example.com', hashedPassword, 'Bob Smith', 1000, 4.5);
      
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
