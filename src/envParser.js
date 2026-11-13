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

// Hosts allowed to run non-production-only features. Keep in sync with the dev environments in
// .circleci/config.yml and deployment_config/staging_vars.yml. Production also has a cloud.gov
// route (tta-smarthub-prod1.app.cloud.gov), so a *.app.cloud.gov suffix check is not safe.
const NON_PRODUCTION_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'tta-smarthub-dev-blue.app.cloud.gov',
  'tta-smarthub-dev-green.app.cloud.gov',
  'tta-smarthub-dev-red.app.cloud.gov',
  'tta-smarthub-dev-gold.app.cloud.gov',
  'tta-smarthub-dev-pink.app.cloud.gov',
  'tta-smarthub-staging.app.cloud.gov',
]);

/**
 * True only when TTA_SMART_HUB_URI points at a known non-production host (see
 * NON_PRODUCTION_HOSTS). Fails closed: a missing, unparseable, or unlisted URI counts as production.
 */
exports.isNonProductionEnvironment = () => {
  try {
    const { hostname } = new URL(process.env.TTA_SMART_HUB_URI);
    return NON_PRODUCTION_HOSTS.has(hostname);
  } catch {
    return false;
  }
};
