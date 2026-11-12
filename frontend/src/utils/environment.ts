/**
 * Mirrors the backend's isNonProductionEnvironment (src/envParser.js): staging/dev apps live on
 * *.app.cloud.gov, and local development runs on localhost. Everything else is treated as
 * production. The backend check is authoritative; this only hides UI that would be refused.
 */
export const isNonProductionEnvironment = (hostname = window.location.hostname): boolean =>
  hostname.endsWith('.app.cloud.gov') || hostname === 'localhost' || hostname === '127.0.0.1';
