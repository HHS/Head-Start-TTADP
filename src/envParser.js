require('dotenv').config();

exports.isTrue = (key) => process.env[key] === 'true';

exports.getEnvNumber = (key, defaultValue, options = {}) => {
  const { warnOnDefault = false } = options;
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    if (warnOnDefault) {
      console.warn(`${key} not set; defaulting to ${defaultValue}`);
    }
    return defaultValue;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`${key} must be a number`);
  }

  return value;
};
