require('dotenv').config()

exports.isTrue = (key) => process.env[key] === 'true'
