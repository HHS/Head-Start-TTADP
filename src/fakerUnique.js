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
  throw new Error(
    `fakerUnique: exceeded maximum retries (${maxRetries}) generating a unique value`
  );
}

// Explicit ids in low ranges collide with rows that sequences hand out (or that other
// suites leave behind) when tests share a database. Hand out ids far above anything a
// sequence reaches while staying inside a Postgres INTEGER. Jest loads modules per test
// file, so each file starts at its own random offset. Ids are spaced apart so tests can
// derive related ids (`id + 1`, `id + i`) without running into the next one handed out.
const TEST_ID_FLOOR = 1_000_000_000;
const TEST_ID_SPAN = 900_000_000;
const TEST_ID_STEP = 1_000;
let lastTestId = TEST_ID_FLOOR + Math.floor(Math.random() * TEST_ID_SPAN);

export function uniqueTestId() {
  lastTestId += TEST_ID_STEP;
  return lastTestId;
}
