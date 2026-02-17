/* eslint-disable no-console */

const SUPPRESSED_PATTERNS = [
  'postcss.plugin was deprecated. Migration guide:',
  'https://evilmartians.com/chronicles/postcss-8-plugin-migration',
];

const shouldSuppress = (message) => SUPPRESSED_PATTERNS.some(
  (pattern) => message.includes(pattern),
);

const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  const message = args.map((arg) => String(arg)).join(' ');
  if (!shouldSuppress(message)) {
    originalWarn(...args);
  }
};

const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, encoding, callback) => {
  const message = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
  if (shouldSuppress(message)) {
    if (typeof callback === 'function') callback();
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

// eslint-disable-next-line import/no-extraneous-dependencies
require('@craco/craco/dist/scripts/start');
