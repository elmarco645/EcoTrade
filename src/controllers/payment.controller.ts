/**
 * EcoTrade — Payment Controller
 * 
 * Handles: Flutterwave payment initiation, verification, and webhook.
 * Supports simulation mode when FLW_SECRET_KEY is not configured.
 */

import db from '../../backend/db.ts';
import { FLW_SECRET_HASH } from '../utils/constants.ts';
import { isSimulationMode, initiatePayment } from '../services/payment.service.ts';

/** POST /api/pay — Initiate payment */
export const initiatePay = async (req: any, res: any) => {
  const { amount, transaction_ids } = req.body;
  const user: any = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id);

  // Simulation Mode for Demo
  if (isSimulationMode()) {
    console.warn('FLW_SECRET_KEY is missing or using mock key. Using simulation mode.');
    const tx_ref = `eco-${Date.now()}-${transaction_ids.join('-')}`;

    return res.json({
      status: 'success',
      message: 'Payment initiated (Simulation Mode)',
      data: {
        link: `${req.headers.origin}/payment-success?status=successful&tx_ref=${tx_ref}&mode=simulation`,
      },
    });
  }

  try {
    const tx_ref = `eco-${Date.now()}-${transaction_ids.join('-')}`;
    const response = await initiatePayment({
      tx_ref,
      amount,
      email: user.email,
      name: user.name,
      redirect_url: `${req.headers.origin}/payment-success`,
    });

    // Update transactions with the reference
    for (const id of transaction_ids) {
      db.prepare('UPDATE transactions SET payment_reference = ? WHERE id = ?').run(response.data.tx_ref, id);
    }

    res.json(response);
  } catch (error: any) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate payment. Please check your FLW_SECRET_KEY.' });
  }
};

/** GET /api/pay/verify — Verify payment */
export const verifyPayment = async (req: any, res: any) => {
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

    res.json({ status: 'success', message: 'Payment verification initiated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/webhook/flutterwave — Flutterwave webhook handler */
export const flutterwaveWebhook = (req: any, res: any) => {
  const signature = req.headers['verif-hash'];

  if (FLW_SECRET_HASH && signature !== FLW_SECRET_HASH) {
    return res.status(401).end();
  }

  const { status, tx_ref, id: flw_id } = req.body.data || req.body;

  if (status === 'successful') {
    const transactionIds = tx_ref.split('-').slice(2);

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
};
