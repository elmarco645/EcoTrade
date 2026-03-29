/**
 * EcoTrade — Listing Controller
 * 
 * Handles: listing CRUD and cart validation.
 */

import db from '../../backend/db.ts';

/** GET /api/listings */
export const getAllListings = (req: any, res: any) => {
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
};

/** GET /api/listings/:id */
export const getListingById = (req: any, res: any) => {
  const listing = db.prepare(`
    SELECT l.*, u.name as seller_name, u.avatar_url as seller_avatar, u.rating as seller_rating, u.is_seller_verified,
           (SELECT COUNT(*) FROM reviews WHERE seller_id = u.id) as seller_reviews_count
    FROM listings l 
    JOIN users u ON l.seller_id = u.id 
    WHERE l.id = ?
  `).get(req.params.id);
  res.json(listing);
};

/** POST /api/listings */
export const createListing = (req: any, res: any) => {
  const { title, description, category, condition, price, is_negotiable, location, images } = req.body;
  const stmt = db.prepare(`
    INSERT INTO listings (seller_id, title, description, category, condition, price, is_negotiable, location, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(req.user.id, title, description, category, condition, price, is_negotiable ? 1 : 0, location, JSON.stringify(images));
  res.json({ id: result.lastInsertRowid });
};

/** POST /api/cart/validate */
export const validateCart = (req: any, res: any) => {
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
};
