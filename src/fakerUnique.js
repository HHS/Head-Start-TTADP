// Drop-in replacement for faker.unique(), which was removed in @faker-js/faker v9+.
// Retries the generator until it produces a value not yet seen in this process.
const seen = new Set();

export function resetFakerUnique() {
  seen.clear();
}

export default function fakerUnique(generator, maxRetries = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const value = generator();
    if (!seen.has(value)) {
      seen.add(value);
      return value;
    }
  }
  throw new Error(`fakerUnique: exceeded maximum retries (${maxRetries}) generating a unique value`);
}
