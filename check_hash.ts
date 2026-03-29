import db from './backend/db.ts';

const email = 'curtiswekullo@gmail.com';
const user = db.prepare('SELECT password FROM users WHERE email = ?').get(email);

if (user) {
  console.log('Password hash:', user.password);
} else {
  console.log('User not found');
}
