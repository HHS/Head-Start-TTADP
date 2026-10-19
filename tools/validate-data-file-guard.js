const { checkRange } = require('./data-file-guard');

const baseRef = process.env.BASE_REF;

if (!baseRef) {
  console.error('BASE_REF is required (for example origin/main).');
  process.exit(1);
}

const result = checkRange({ baseRef });

if (!result.valid) {
  console.error(result.message);
  process.exit(1);
}

console.log(result.message);
