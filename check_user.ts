import db from './backend/db.ts';

const email = 'curtiswekullo@gmail.com';
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

console.log('User found:', user ? 'Yes' : 'No');
if (user) {
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Username:', user.username);
  console.log('Password (first 10 chars):', user.password.substring(0, 10));
  console.log('Deleted At:', user.deleted_at);
  console.log('Delete Token:', user.delete_token);
  console.log('Delete Expires:', user.delete_expires);
  console.log('Failed Attempts:', user.failed_attempts);
  console.log('Lock Until:', user.lock_until);
  console.log('Is Email Verified:', user.is_email_verified);
}
