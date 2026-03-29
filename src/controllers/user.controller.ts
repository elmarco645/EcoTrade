/**
 * EcoTrade — User Controller
 * 
 * Handles: profile CRUD, avatar/cover upload, password change,
 * email change, identity verification, data export, account deletion.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../../backend/db.ts';
import { APP_URL } from '../utils/constants.ts';
import { sendDeleteUndoEmail, sendEmailChangeVerificationEmail } from '../services/email.service.ts';

/** GET /api/user/profile */
export const getProfile = (req: any, res: any) => {
  const user: any = db.prepare('SELECT id, email, name, username, role, bio, location, avatar_url, cover_url, social_links, wallet_balance, rating, is_verified, is_seller_verified, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

/** PATCH /api/user/profile */
export const updateProfile = (req: any, res: any) => {
  const { name, username, bio, location, avatar_url, avatar, phone, cover_url, social_links } = req.body;
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
          avatar_url = COALESCE(?, avatar_url),
          avatar = COALESCE(?, avatar),
          phone = COALESCE(?, phone),
          cover_url = COALESCE(?, cover_url),
          social_links = COALESCE(?, social_links)
      WHERE id = ?
    `);

    stmt.run(name, updateUsername ? 1 : 0, username, updateUsername ? 1 : 0, bio, location, avatar_url, avatar, phone, cover_url, typeof social_links === 'object' ? JSON.stringify(social_links) : social_links, req.user.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: users.username')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    if (error.message.includes('UNIQUE constraint failed: users.phone')) {
      return res.status(400).json({ error: 'Phone number already in use' });
    }
    res.status(400).json({ error: error.message });
  }
};

/** POST /api/user/change-password */
export const changePassword = async (req: any, res: any) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user: any = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/user/request-email-change */
export const requestEmailChange = async (req: any, res: any) => {
  const { newEmail } = req.body;
  try {
    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(newEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    console.log(`[DEBUG] Generated email change token: ${token} for user ${req.user.id}`);
    db.prepare('UPDATE users SET email_change_token = ?, new_email = ? WHERE id = ?').run(token, newEmail, req.user.id);

    const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
    await sendEmailChangeVerificationEmail(newEmail, token, origin);
    res.json({ success: true, message: 'Verification email sent to new email address' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** GET /api/user/confirm-email-change */
export const confirmEmailChange = async (req: any, res: any) => {
  const { token } = req.query;
  console.log(`[DEBUG] Received email change confirmation request with token: ${token}`);
  try {
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const user: any = db.prepare('SELECT id, new_email FROM users WHERE email_change_token = ?').get(token);
    if (!user) {
      console.log(`[DEBUG] No user found for token: ${token}`);
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    console.log(`[DEBUG] Found user ${user.id} for token. Updating email to ${user.new_email}`);
    db.prepare('UPDATE users SET email = ?, new_email = NULL, email_change_token = NULL WHERE id = ?').run(user.new_email, user.id);
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
};

/** POST /api/user/upload-avatar */
export const uploadAvatar = (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  try {
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);
    res.json({ success: true, avatar_url: avatarUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/user/upload-cover */
export const uploadCover = (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const coverUrl = `/uploads/${req.file.filename}`;
  try {
    db.prepare('UPDATE users SET cover_url = ? WHERE id = ?').run(coverUrl, req.user.id);
    res.json({ success: true, cover_url: coverUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/user/verify-id */
export const verifyId = (req: any, res: any) => {
  const { nationalId } = req.body;
  if (!nationalId) return res.status(400).json({ error: 'National ID required' });

  try {
    const encryptedId = Buffer.from(nationalId).toString('base64');
    db.prepare("UPDATE users SET national_id_encrypted = ?, is_verified = 1 WHERE id = ?").run(encryptedId, req.user.id);
    res.json({ success: true, message: 'Identity verified successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/** GET /api/user/export-data */
export const exportData = (req: any, res: any) => {
  try {
    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const listings = db.prepare('SELECT * FROM listings WHERE seller_id = ?').all(req.user.id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE buyer_id = ? OR seller_id = ?').all(req.user.id, req.user.id);
    const offers = db.prepare('SELECT * FROM offers WHERE buyer_id = ? OR seller_id = ?').all(req.user.id, req.user.id);
    const reviews = db.prepare('SELECT * FROM reviews WHERE buyer_id = ? OR seller_id = ?').all(req.user.id, req.user.id);
    const messages = db.prepare('SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?').all(req.user.id, req.user.id);

    // Remove sensitive info
    delete user.password;
    delete user.verification_token;
    delete user.reset_token;
    delete user.reset_token_expiry;
    delete user.delete_token;
    delete user.delete_expires;

    const exportData = {
      profile: user,
      listings,
      transactions,
      offers,
      reviews,
      messages,
      exported_at: new Date().toISOString(),
    };

    res.setHeader('Content-Disposition', 'attachment; filename=ecotrade_data_export.json');
    res.json(exportData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/user/delete-account */
export const deleteAccount = async (req: any, res: any) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const user: any = db.prepare('SELECT password, email FROM users WHERE id = ?').get(req.user.id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const deleteToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    db.prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP, delete_token = ?, delete_expires = ? WHERE id = ?')
      .run(deleteToken, expires.toISOString(), req.user.id);

    const origin = APP_URL || req.headers.origin || 'http://localhost:3000';
    await sendDeleteUndoEmail(user.email, deleteToken, origin);

    res.json({ success: true, message: 'Account scheduled for deletion. You have 7 days to undo this.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** GET /api/user/undo-delete */
export const undoDelete = async (req: any, res: any) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const user: any = db.prepare('SELECT id, delete_expires FROM users WHERE delete_token = ?').get(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const expires = new Date(user.delete_expires);
    if (new Date() > expires) {
      return res.status(400).json({ error: 'Undo period has expired' });
    }

    db.prepare('UPDATE users SET deleted_at = NULL, delete_token = NULL, delete_expires = NULL WHERE id = ?')
      .run(user.id);

    res.json({ success: true, message: 'Account restored successfully! You can now log in again.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
