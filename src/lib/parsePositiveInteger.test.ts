import parsePositiveInteger from './parsePositiveInteger';

describe('parsePositiveInteger', () => {
  it.each([
    ['string', '42'],
    ['number', 42],
    ['string with leading zeroes', '0042'],
  ])('parses a valid %s', (_description, value) => {
    expect(parsePositiveInteger(value)).toBe(42);
  });

  it.each([
    'abc',
    '',
    '42abc',
    '4.2',
    '4e2',
    '-42',
    '0',
    '9007199254740992',
    null,
    undefined,
    {},
    [],
  ])('returns null for an invalid value: %p', (value) => {
    expect(parsePositiveInteger(value)).toBeNull();
  });
});
