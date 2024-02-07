require('dotenv').config();

exports.bool = (key) => process.env[key] === 'true';
