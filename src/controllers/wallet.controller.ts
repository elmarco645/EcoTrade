/**
 * EcoTrade — Wallet Controller
 * 
 * Handles: wallet balance queries, transaction history, and direct wallet purchases.
 */

import db from '../../backend/db.ts';

/** GET /api/user/wallet */
export const getWalletBalance = (req: any, res: any) => {
  const user: any = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ balance: user.wallet_balance });
};

/** GET /api/user/transactions */
export const getUserTransactions = (req: any, res: any) => {
  const transactions = db.prepare(`
    SELECT t.*, l.title as listing_title 
    FROM transactions t
    JOIN listings l ON t.listing_id = l.id
    WHERE t.buyer_id = ? OR t.seller_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(transactions);
};

/** POST /api/transactions/buy — Direct wallet purchase */
export const buyWithWallet = (req: any, res: any) => {
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
};

/** POST /api/transactions/checkout — Cart checkout */
export const checkout = (req: any, res: any) => {
  const { items, total, shipping_address } = req.body;

  try {
    const checkoutTx = db.transaction(() => {
      const availableItems: any[] = [];
      const unavailableItems: any[] = [];

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
      const subtotal = availableItems.reduce((acc: number, l: any) => acc + l.price, 0);
      const shipping_fee_per_item = (total - subtotal) / availableItems.length;

      const transactionIds: any[] = [];
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
      unavailable_items: unavailableItems,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

/** POST /api/transactions/:id/confirm — Confirm transaction (release escrow) */
export const confirmTransaction = (req: any, res: any) => {
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
};
