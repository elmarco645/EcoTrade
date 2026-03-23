import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'ecotrade.db');
console.log(`[DB] Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

const identifier = 'Nefaryus';
const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)').get(identifier, identifier);

console.log('Identifier:', identifier);
console.log('User found:', user);

const allUsers = db.prepare('SELECT username, email FROM users').all();
console.log('All users:', allUsers);
