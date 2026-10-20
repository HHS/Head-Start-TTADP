const { GuardError, checkRange } = require('./data-file-guard');

const baseRef = process.env.BASE_REF;

if (!baseRef) {
  console.error('BASE_REF is required (for example origin/main).');
  process.exit(1);
}

let result;
try {
  result = checkRange({ baseRef });
} catch (error) {
  // Fail closed. Print only our own sanitized message: the original error can carry git output,
  // which may contain patch text (including staff email addresses).
  const detail = error instanceof GuardError ? error.message : 'unexpected error';
  console.error(`Data file guard could not complete: ${detail}`);
  process.exit(1);
}

if (!result.valid) {
  console.error(result.message);
  process.exit(1);
}

console.log(result.message);
