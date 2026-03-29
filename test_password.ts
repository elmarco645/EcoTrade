import bcrypt from 'bcryptjs';

const hash = '$2b$10$MD641BtLs8GYseGQa0WAju0.dbjv8338DC2PFZUV9pzxK8OF1pc6O';
const password = 'password123';

const isMatch = await bcrypt.compare(password, hash);
console.log('Is match:', isMatch);
