import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_ACCESS_SECRET || 'dev_secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

// Generate tokens for user ID cmgi7wb120000211zlfgz4u6s (owner of several groups)
const userId = 'cmgi7wb120000211zlfgz4u6s';
const accessToken = jwt.sign({ userId }, accessSecret, { expiresIn: '1h' });
const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });

console.log('Access Token:', accessToken);
console.log('Refresh Token:', refreshToken);
