/**
 * EcoTrade — Order Controller
 * 
 * Handles: listing orders, shipping, delivery, confirmation, and disputes.
 */

import db from '../../backend/db.ts';

/** GET /api/orders */
export const getOrders = (req: any, res: any) => {
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
};

/** POST /api/orders/:id/ship */
export const shipOrder = (req: any, res: any) => {
  const { tracking_id } = req.body;
  const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!order || order.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  db.prepare("UPDATE transactions SET status = 'shipped', tracking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(tracking_id, req.params.id);
  res.json({ success: true });
};

/** POST /api/orders/:id/deliver */
export const deliverOrder = (req: any, res: any) => {
  const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!order || order.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  db.prepare("UPDATE transactions SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.params.id);
  res.json({ success: true });
};

/** POST /api/orders/:id/confirm */
export const confirmOrder = (req: any, res: any) => {
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
};

/** POST /api/orders/:id/dispute */
export const disputeOrder = (req: any, res: any) => {
  const { reason, evidence } = req.body;
  const order: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!order || order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  db.prepare("UPDATE transactions SET status = 'disputed', dispute_reason = ?, dispute_evidence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(reason, JSON.stringify(evidence), req.params.id);
  res.json({ success: true });
};
