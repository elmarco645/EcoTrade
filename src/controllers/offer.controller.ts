/**
 * EcoTrade — Offer Controller
 * 
 * Handles: creating, listing, accepting, and rejecting offers.
 */

import db from '../../backend/db.ts';

/** POST /api/offers */
export const createOffer = (req: any, res: any) => {
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
};

/** GET /api/offers */
export const getOffers = (req: any, res: any) => {
  const offers = db.prepare(`
    SELECT o.*, l.title as listing_title, u.name as buyer_name
    FROM offers o
    JOIN listings l ON o.listing_id = l.id
    JOIN users u ON o.buyer_id = u.id
    WHERE o.seller_id = ? OR o.buyer_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(offers);
};

/** POST /api/offers/:id/accept */
export const acceptOffer = (req: any, res: any) => {
  const offer: any = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!offer || offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  db.prepare("UPDATE offers SET status = 'accepted' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};

/** POST /api/offers/:id/reject */
export const rejectOffer = (req: any, res: any) => {
  const offer: any = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!offer || offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  db.prepare("UPDATE offers SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};
