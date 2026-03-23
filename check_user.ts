import db from './backend/db.ts';
const user: any = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get('Nefaryus', 'Nefaryus');
if (user) {
  console.log(`Username: "${user.username}" (Length: ${user.username.length})`);
  console.log(JSON.stringify(user, null, 2));
} else {
  console.log('User not found');
}
