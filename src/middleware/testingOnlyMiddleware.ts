export const isTestingOrCI = () => {
  const isLocal = process.env.NODE_ENV === 'development'
    || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'dss';
  const isCI = process.env.CI !== undefined
    && process.env.CI !== null;

  return isLocal || isCI;
};

export function testingOnly(req, res, next) {
  if (isTestingOrCI()) {
    // Allow access for local development or CI only
    next();
  } else {
    // Deny access for other environments
    res.status(403).send('Access denied: only accessible for development and testing');
  }
}
