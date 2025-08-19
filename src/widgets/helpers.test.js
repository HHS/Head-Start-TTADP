import { countBySingleKey, formatNumber } from './helpers';

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

describe('countBySingleKey', () => {
  it('doesn\'t throw when null data (TTAHUB-2172)', async () => {
    const data = null;
    const key = 'someKey';
    const results = [];

    expect(() => countBySingleKey(data, key, results)).not.toThrow();
  });

  it('doesnt throw an error when one of the data[point] is null', async () => {
    const data = [
      { someKey: ['reason1'] },
      { someKey: null },
      { someKey: ['reason2'] },
    ];
    const key = 'someKey';
    const results = [];

    expect(() => countBySingleKey(data, key, results)).not.toThrow();
  });

  it('doesnt throw an error when one of the data[point] is undefined', async () => {
    const data = [
      { someKey: ['reason1'] },
      { someKey: undefined },
      { someKey: ['reason2'] },
    ];
    const key = 'someKey';
    const results = [];

    expect(() => countBySingleKey(data, key, results)).not.toThrow();
  });
});
