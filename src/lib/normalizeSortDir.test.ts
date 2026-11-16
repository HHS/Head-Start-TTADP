import normalizeSortDir from './normalizeSortDir';

describe('normalizeSortDir', () => {
  it.each([
    ['asc', 'ASC'],
    ['ASC', 'ASC'],
    ['desc', 'DESC'],
    ['DESC', 'DESC'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(normalizeSortDir(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    '',
    42,
    ['asc'],
    'ASC LIMIT 1), (SELECT pg_sleep(5))--',
    'asc; DROP TABLE "Users"--',
  ])('falls back to DESC for %j', (value) => {
    expect(normalizeSortDir(value)).toBe('DESC');
  });
});
