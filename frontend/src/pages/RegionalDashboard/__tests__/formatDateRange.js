import formatDateRange from '../formatDateRange';

describe('format date function', () => {
  it('returns a formatted date string', () => {
    const str = formatDateRange({
      lastThirtyDays: false,
      string: '2021/06/07-2021/06/08',
      withSpaces: true,
    });

    expect(str).toBe('06/07/2021 - 06/08/2021');
  });

  it('returns a formatted date string without spaces', () => {
    const str = formatDateRange({
      string: '2021/06/07-2021/06/08',
      withSpaces: false,
    });

    expect(str).toBe('06/07/2021-06/08/2021');
  });
});
