/**
 * EcoTrade — Review Controller
 * 
 * Handles: creating reviews and fetching seller reviews.
 */

import db from '../../backend/db.ts';

/** POST /api/reviews */
export const createReview = (req: any, res: any) => {
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

    // Update seller average rating
    const stats: any = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE seller_id = ?').get(transaction.seller_id);
    db.prepare('UPDATE users SET rating = ? WHERE id = ?').run(stats.avg, transaction.seller_id);

    res.json({ success: true, avg_rating: stats.avg, total_reviews: stats.count });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'You have already reviewed this transaction' });
    }
    res.status(400).json({ error: error.message });
  }
};

/** GET /api/sellers/:id/reviews */
export const getSellerReviews = (req: any, res: any) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as buyer_name, u.avatar_url as buyer_avatar
    FROM reviews r
    JOIN users u ON r.buyer_id = u.id
    WHERE r.seller_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json(reviews);
};
