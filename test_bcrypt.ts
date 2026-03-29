import bcrypt from 'bcryptjs';
import db from './backend/db.ts';

const email = 'curtiswekullo@gmail.com';
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (user) {
  const testPassword = 'password123'; // I don't know the real password, but I can test if it's a valid hash
  try {
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Bcrypt comparison worked (isMatch:', isMatch, ')');
  } catch (err) {
    console.error('Bcrypt comparison failed:', err);
  }
} else {
  console.log('User not found');
}
