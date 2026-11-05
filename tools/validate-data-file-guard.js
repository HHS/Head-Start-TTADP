const { GuardError, checkRange, checkStaged } = require('./data-file-guard');

// `--staged` checks what is staged for commit (used by .githooks/pre-commit). Otherwise the
// range BASE_REF...HEAD is checked (used by CI).
const staged = process.argv.includes('--staged');
const baseRef = process.env.BASE_REF;

if (!staged && !baseRef) {
  console.error('BASE_REF is required (for example origin/main), or pass --staged.');
  process.exit(1);
}

let result;
try {
  result = staged ? checkStaged() : checkRange({ baseRef });
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
