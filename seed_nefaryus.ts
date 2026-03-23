import db from './backend/db.ts';
import bcrypt from 'bcryptjs';

const identifier = 'Nefaryus';
const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);

if (!user) {
  console.log('User Nefaryus not found. Creating...');
  const hashedPassword = bcrypt.hashSync('password123', 10);
  db.prepare('INSERT INTO users (email, password, name, username, wallet_balance, rating, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, 1)')
    .run('nefaryus@example.com', hashedPassword, 'Nefaryus', 'Nefaryus', 1500, 5.0);
  console.log('User Nefaryus created successfully.');
} else {
  console.log('User Nefaryus already exists.');
}
