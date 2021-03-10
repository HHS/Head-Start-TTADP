import dotenv from 'dotenv';

dotenv.config();
exports.bool = (key) => process.env[key] === 'true';
