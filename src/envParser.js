require('dotenv').config();

exports.isTrue = (key) => process.env[key] === 'true';

exports.getEnvNumber = (key, defaultValue, options = {}) => {
  const { warnOnDefault = false, requireInteger = false } = options;
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    if (warnOnDefault) {
      process.emitWarning(`${key} not set; defaulting to ${defaultValue}`);
    }
    return defaultValue;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`${key} must be a number, got: ${raw}`);
  }

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number, got: ${raw}`);
  }

  if (requireInteger && !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer, got: ${raw}`);
  }

  return value;
};

/**
 * True only when TTA_SMART_HUB_URI points at a known non-production host:
 * a cloud.gov dev/staging app (*.app.cloud.gov) or local development.
 * Fails closed: a missing or unparseable URI counts as production.
 */
exports.isNonProductionEnvironment = () => {
  try {
    const { hostname } = new URL(process.env.TTA_SMART_HUB_URI);
    return (
      hostname.endsWith('.app.cloud.gov') || hostname === 'localhost' || hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
};
