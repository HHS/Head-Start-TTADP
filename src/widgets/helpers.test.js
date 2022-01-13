import { formatNumber } from './helpers';

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

    // NaN Passed.
    expect(formatNumber('100f', 3)).toBe('0');
  });
});
