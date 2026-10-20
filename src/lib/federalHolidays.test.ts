import federalHolidays from './federalHolidays';

describe('federalHolidays', () => {
  it('matches the OPM 2026 observed holiday calendar', () => {
    expect(federalHolidays(2026)).toEqual([
      '2026-01-01',
      '2026-01-19',
      '2026-02-16',
      '2026-05-25',
      '2026-06-19',
      '2026-07-03',
      '2026-09-07',
      '2026-10-12',
      '2026-11-11',
      '2026-11-26',
      '2026-12-25',
    ]);
  });

  it('matches the OPM 2027 calendar, including Saturday and Sunday observance', () => {
    expect(federalHolidays(2027)).toEqual([
      '2027-01-01',
      '2027-01-18',
      '2027-02-15',
      '2027-05-31',
      '2027-06-18',
      '2027-07-05',
      '2027-09-06',
      '2027-10-11',
      '2027-11-11',
      '2027-11-25',
      '2027-12-24',
    ]);
  });

  it('observes a Saturday New Year in the previous calendar year', () => {
    expect(federalHolidays(2022)[0]).toBe('2021-12-31');
  });

  it('observes a Sunday New Year on Monday', () => {
    expect(federalHolidays(2023)[0]).toBe('2023-01-02');
  });

  it('handles a leap year', () => {
    expect(federalHolidays(2024)).toEqual(
      expect.arrayContaining(['2024-02-19', '2024-05-27', '2024-09-02', '2024-11-28'])
    );
  });

  it('only includes Juneteenth starting in 2021', () => {
    expect(federalHolidays(2020)).not.toContain('2020-06-19');
    expect(federalHolidays(2021)).toContain('2021-06-18');
  });
});
