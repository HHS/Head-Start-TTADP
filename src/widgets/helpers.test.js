import { baseTRScopes, countBySingleKey, formatNumber, parseFormattedNumber } from './helpers';

describe('Format Number', () => {
  it('renders with correct decimal places and separator', async () => {
    // Multiple Decimal Places with Thousands Separator.
    expect(formatNumber(14258.25697, 5)).toBe('14,258.25697');

    // Undefined Decimal Places (defaults to 0).
    expect(formatNumber(36)).toBe('36');

    // Single Decimal Place Rounded.
    expect(formatNumber(578.694, 1)).toBe('578.7');

    // Two Decimal Places Rounded.
    expect(formatNumber(578.675, 2)).toBe('578.68');

    // Three Decimal Places Rounded.
    expect(formatNumber(578976238.1237, 3)).toBe('578,976,238.124');

    expect(formatNumber('100f', 3)).toBe('100.000');

    expect(formatNumber('sdfgdfg', 3)).toBe('0');

    expect(formatNumber()).toBe('0');
  });
});

describe('parseFormattedNumber', () => {
  it('parses a plain integer string', () => {
    expect(parseFormattedNumber('1234')).toBe(1234);
  });

  it('strips thousands separators before parsing', () => {
    expect(parseFormattedNumber('1,234')).toBe(1234);
    expect(parseFormattedNumber('1,234,567')).toBe(1234567);
  });

  it('parses a locale-formatted decimal string', () => {
    expect(parseFormattedNumber('1,234.5')).toBe(1234.5);
  });

  it('round-trips a value produced by formatNumber', () => {
    expect(parseFormattedNumber(formatNumber(12345.678, 2))).toBe(12345.68);
  });

  it('accepts a numeric value and returns it unchanged', () => {
    expect(parseFormattedNumber(42)).toBe(42);
    expect(parseFormattedNumber(3.14)).toBe(3.14);
    expect(parseFormattedNumber(0)).toBe(0);
  });

  it('returns 0 for null, undefined, or empty input', () => {
    expect(parseFormattedNumber(null)).toBe(0);
    expect(parseFormattedNumber(undefined)).toBe(0);
    expect(parseFormattedNumber('')).toBe(0);
  });

  it('returns 0 for non-numeric strings', () => {
    expect(parseFormattedNumber('abc')).toBe(0);
    expect(parseFormattedNumber(',,,')).toBe(0);
  });

  it('returns 0 for NaN/Infinity to keep sums finite', () => {
    expect(parseFormattedNumber(NaN)).toBe(0);
    expect(parseFormattedNumber(Infinity)).toBe(0);
    expect(parseFormattedNumber(-Infinity)).toBe(0);
  });
});

describe('countBySingleKey', () => {
  it("doesn't throw when null data (TTAHUB-2172)", async () => {
    const data = null;
    const key = 'someKey';
    const results = [];

    expect(() => countBySingleKey(data, key, results)).not.toThrow();
  });

  it('doesnt throw an error when one of the data[point] is null', async () => {
    const data = [{ someKey: ['reason1'] }, { someKey: null }, { someKey: ['reason2'] }];
    const key = 'someKey';
    const results = [];

    expect(() => countBySingleKey(data, key, results)).not.toThrow();
  });

  it('doesnt throw an error when one of the data[point] is undefined', async () => {
    const data = [{ someKey: ['reason1'] }, { someKey: undefined }, { someKey: ['reason2'] }];
    const key = 'someKey';
    const results = [];

    expect(() => countBySingleKey(data, key, results)).not.toThrow();
  });

  it('counts and sorts correctly', async () => {
    const data = [
      { someKey: ['apple', 'banana'] },
      { someKey: ['apple', 'cherry'] },
      { someKey: ['banana'] },
    ];
    const key = 'someKey';
    const results = [];

    countBySingleKey(data, key, results);

    // apple appears 2 times, banana appears 2 times, cherry appears 1 time
    expect(results.length).toBe(3);
    expect(results[0].count).toBe(2);
    expect(results[1].count).toBe(2);
    expect(results[2].name).toBe('cherry');
    expect(results[2].count).toBe(1);
  });

  it('breaks ties by name alphabetically', async () => {
    const data = [{ someKey: ['Zebra'] }, { someKey: ['Apple'] }, { someKey: ['Mango'] }];
    const key = 'someKey';
    const results = [];

    countBySingleKey(data, key, results);

    // All have count of 1, should be sorted alphabetically
    expect(results.length).toBe(3);
    expect(results[0].name).toBe('Apple');
    expect(results[1].name).toBe('Mango');
    expect(results[2].name).toBe('Zebra');
  });

  it('adds to existing results array', async () => {
    const data = [{ someKey: ['existing'] }, { someKey: ['new'] }];
    const key = 'someKey';
    const results = [{ name: 'existing', count: 5 }];

    countBySingleKey(data, key, results);

    // existing should have count incremented, new should be added
    const existingEntry = results.find((r) => r.name === 'existing');
    const newEntry = results.find((r) => r.name === 'new');

    expect(existingEntry.count).toBe(6);
    expect(newEntry.count).toBe(1);
  });
});

describe('baseTRScopes', () => {
  it('returns correct scope structure for training reports', () => {
    const inputScopes = {
      trainingReport: [{ 'data.eventId': 'TR-123' }],
    };

    const result = baseTRScopes(inputScopes);

    expect(result).toHaveProperty('where');
    expect(result).toHaveProperty('include');
    expect(result.include).toHaveProperty('model');
    expect(result.include.as).toBe('sessionReports');
    expect(result.include.required).toBe(true);
  });

  it('includes training report status filter', () => {
    const inputScopes = {
      trainingReport: [],
    };

    const result = baseTRScopes(inputScopes);

    // The where clause should include status filter
    expect(result.where).toBeDefined();
  });
});
