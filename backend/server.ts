/**
 * EcoTrade — Express Server (Modular)
 * 
 * This file bootstraps the Express server, Socket.io, and Vite middleware.
 * All route handlers, middleware, and business logic have been decomposed into
 * the src/ directory following the AI Protocol's modular architecture:
 * 
 *   src/controllers/  — Request handlers
 *   src/services/     — Business logic & external integrations
 *   src/routes/       — Express route definitions
 *   src/validators/   — Zod input validation schemas
 *   src/types/        — TypeScript interfaces
 *   src/utils/        — Middleware, upload config, constants
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.ts';
import { registerRoutes } from '../src/routes/index.ts';
import { uploadsDir } from '../src/utils/upload.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json());

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  // --- Register all API routes ---
  registerRoutes(app);

  // --- Socket.io for real-time chat ---
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

  // --- Vite Middleware (development) or Static Files (production) ---
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

  // --- Start Server ---
  httpServer.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');

    // Cleanup job for deleted accounts (runs every hour)
    setInterval(() => {
      try {
        console.log('[CLEANUP] Checking for expired account deletions...');
        const expiredUsers = db.prepare('SELECT id FROM users WHERE deleted_at IS NOT NULL AND delete_expires < CURRENT_TIMESTAMP').all();

        for (const user of expiredUsers as any[]) {
          console.log(`[CLEANUP] Anonymizing user ${user.id}`);
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
                deleted_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(user.id);
        }
      } catch (error) {
        console.error('[CLEANUP ERROR]', error);
      }
    }, 60 * 60 * 1000);

    // Seed sample data if database is empty
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
