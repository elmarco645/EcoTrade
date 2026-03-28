import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('ecotrade.db');
console.log(`[DB] Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'buyer',
    bio TEXT,
    location TEXT,
    avatar_url TEXT,
    wallet_balance REAL DEFAULT 1000.0, -- Starting balance for demo
    rating REAL DEFAULT 0,
    is_verified INTEGER DEFAULT 0, -- Identity verification
    is_email_verified INTEGER DEFAULT 0,
    is_seller_verified INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    lock_until DATETIME,
    phone TEXT UNIQUE,
    avatar TEXT,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expiry DATETIME,
    national_id_encrypted TEXT,
    username_updated_at DATETIME,
    cover_url TEXT,
    social_links TEXT, -- JSON object
    deleted_at DATETIME,
    delete_token TEXT,
    delete_expires DATETIME,
    google_id TEXT UNIQUE,
    github_id TEXT UNIQUE,
    email_change_token TEXT,
    new_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    condition TEXT NOT NULL,
    price REAL NOT NULL,
    is_negotiable INTEGER DEFAULT 0,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    images TEXT, -- JSON array of image URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    shipping_fee REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, shipped, delivered, completed, disputed, refunded
    escrow_status TEXT DEFAULT 'pending', -- pending, held, released, refunded
    payment_method TEXT,
    payment_reference TEXT,
    gateway_response TEXT,
    shipping_address TEXT,
    tracking_id TEXT,
    dispute_reason TEXT,
    dispute_evidence TEXT, -- JSON array of URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings (id),
    FOREIGN KEY (buyer_id) REFERENCES users (id),
    FOREIGN KEY (seller_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, countered, expired
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings (id),
    FOREIGN KEY (buyer_id) REFERENCES users (id),
    FOREIGN KEY (seller_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    listing_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (id),
    FOREIGN KEY (receiver_id) REFERENCES users (id),
    FOREIGN KEY (listing_id) REFERENCES listings (id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id),
    FOREIGN KEY (buyer_id) REFERENCES users (id),
    FOREIGN KEY (seller_id) REFERENCES users (id),
    UNIQUE(transaction_id, buyer_id)
  );
`);

// Ensure new columns exist for existing databases
try { db.exec('ALTER TABLE transactions ADD COLUMN payment_method TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN payment_reference TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN gateway_response TEXT'); } catch (e) {}

// Robust migration for users table
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
const columns = (tableInfo as any[]).map(col => col.name);

if (!columns.includes('username')) {
  try { db.exec('ALTER TABLE users ADD COLUMN username TEXT'); } catch (e) { console.error('Error adding username column:', e); }
}
if (!columns.includes('full_name')) {
  try { db.exec('ALTER TABLE users ADD COLUMN full_name TEXT'); } catch (e) { console.error('Error adding full_name column:', e); }
}
if (!columns.includes('is_email_verified')) {
  try { db.exec('ALTER TABLE users ADD COLUMN is_email_verified INTEGER DEFAULT 0'); } catch (e) { console.error('Error adding is_email_verified column:', e); }
}
if (!columns.includes('verification_token')) {
  try { db.exec('ALTER TABLE users ADD COLUMN verification_token TEXT'); } catch (e) { console.error('Error adding verification_token column:', e); }
}
if (!columns.includes('role')) {
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'buyer'"); } catch (e) {}
}
if (!columns.includes('bio')) {
  try { db.exec('ALTER TABLE users ADD COLUMN bio TEXT'); } catch (e) {}
}
if (!columns.includes('location')) {
  try { db.exec('ALTER TABLE users ADD COLUMN location TEXT'); } catch (e) {}
}
if (!columns.includes('avatar_url')) {
  try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT'); } catch (e) {}
}
if (!columns.includes('wallet_balance')) {
  try { db.exec('ALTER TABLE users ADD COLUMN wallet_balance REAL DEFAULT 1000.0'); } catch (e) {}
}
if (!columns.includes('rating')) {
  try { db.exec('ALTER TABLE users ADD COLUMN rating REAL DEFAULT 0'); } catch (e) {}
}
if (!columns.includes('reset_token')) {
  try { db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch (e) { console.error('Error adding reset_token column:', e); }
}
if (!columns.includes('reset_token_expiry')) {
  try { db.exec('ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME'); } catch (e) { console.error('Error adding reset_token_expiry column:', e); }
}

try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN national_id_encrypted TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN username_updated_at DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN cover_url TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN social_links TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_seller_verified INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN deleted_at DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN delete_token TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN delete_expires DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT UNIQUE'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN avatar TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN lock_until DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN email_change_token TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN new_email TEXT'); } catch (e) {}

try { db.exec("UPDATE users SET is_email_verified = 1"); } catch (e) {}

export default db;
